"use server";

import { randomUUID } from "node:crypto";

import { headers } from "next/headers";

import { getLocale, getTranslations } from "next-intl/server";

import { getSellableBySlug } from "@/features/catalog/sellable";
import {
  getInventory,
  releaseStock,
  reserveStock,
  type InventoryRow,
} from "@/features/checkout/inventory";
import { MAX_QUANTITY } from "@/features/checkout/limits";
import {
  isShippingZone,
  SHIPPING_METHODS,
  type ShippingZone,
} from "@/features/checkout/shipping";
import {
  CHECKOUT_MINUTES,
  createCheckoutSession,
  getLinkedPrices,
  isCheckoutConfigured,
  type PricedItem,
} from "@/features/checkout/stripe";
import { defaultLocale, isLocale, type Locale } from "@/i18n/config";
import { callerKey } from "@/lib/caller";

export type CheckoutRequest = { slug: string; quantity: number }[];

export type CheckoutResult =
  | { ok: true; url: string }
  | {
      ok: false;
      reason:
        | "notConfigured"
        | "empty"
        | "unavailable"
        | "outOfStock"
        | "failed";
      /** Lines that can't be bought, so the cart can point at them. */
      slugs?: string[];
    };

/** Titles that are listed but not sold: nothing to charge, or nothing to ship. */
const UNBUYABLE = new Set(["out_of_stock", "out_of_print", "coming_soon"]);

/** What a cart is worth, and what is wrong with it. */
type Priced = {
  items: PricedItem[];
  /** Listed but not sellable: withdrawn, unpriced, or a bad quantity. */
  unavailable: string[];
  /** Sellable, but not in the number asked for. */
  short: string[];
};

/**
 * One line per title.
 *
 * The browser's cart already keeps one, but a request can be written by hand,
 * and every check below is per line: the same book sent twice, a copy each,
 * would pass a stock check and a hold that each see only one copy asked for.
 * A quantity that isn't a whole number poisons its sum, so the merged line
 * still fails validation instead of being quietly repaired.
 */
function mergeLines(request: CheckoutRequest): CheckoutRequest {
  const merged = new Map<string, number>();

  for (const line of request) {
    const slug = typeof line?.slug === "string" ? line.slug : "";
    const quantity = Number.isInteger(line?.quantity) ? line.quantity : NaN;
    merged.set(slug, (merged.get(slug) ?? 0) + quantity);
  }

  return [...merged].map(([slug, quantity]) => ({ slug, quantity }));
}

/**
 * Prices a cart and says what can't be bought.
 *
 * This is where the app joins `catalog` and `checkout`, so neither feature has
 * to import the other. Only slugs and quantities are trusted from the client;
 * every price and name is looked up again here.
 *
 * What a slug names — a book, or one size of a t-shirt — is `getSellableBySlug`'s
 * problem, not this function's. Everything below works in slugs alone.
 *
 * Price comes from the shop's own record in Supabase where that title has one,
 * and from the catalogue where it doesn't — so a price can be changed without
 * a deploy, and a title nobody has priced there still sells at its catalogue
 * price rather than for nothing.
 *
 * One function serves both the check the cart page runs on load and the one
 * that guards the payment, so the two can never drift apart. The second is the
 * one that matters, and it is the same code.
 */
async function priceCart(
  raw: CheckoutRequest,
  locale: Locale,
  { log }: { log: boolean },
): Promise<Priced> {
  const request = mergeLines(raw);

  // One round trip for every line, before pricing: the same rows answer both
  // "what does it cost" and "is there one left".
  const inventory: Map<string, InventoryRow> | null = await getInventory(
    request.map((line) => (typeof line?.slug === "string" ? line.slug : "")),
    // Logged in production for a real checkout: one line per order, and the
    // only record of what the shop knew when it took the money. The cart
    // page's own check is routine, and stays quiet outside development.
    { label: log ? "checkout" : "cart check", always: log },
  );

  const items: PricedItem[] = [];
  const unavailable: string[] = [];

  for (const line of request) {
    const slug = typeof line?.slug === "string" ? line.slug : "";
    const quantity = line?.quantity;
    const sellable = slug ? await getSellableBySlug(slug, locale) : undefined;
    const live = inventory?.get(slug)?.price ?? null;
    const amount = live ?? sellable?.price.amount ?? 0;

    if (sellable && log) {
      console.log(
        `[checkout] ${slug}: charging ${amount} (${
          live === null ? "catalogue — no price in Supabase" : "from Supabase"
        }${
          live !== null && live !== sellable.price.amount
            ? `, catalogue says ${sellable.price.amount}`
            : ""
        })`,
      );
    }

    if (
      !sellable ||
      amount <= 0 ||
      UNBUYABLE.has(sellable.stock) ||
      !Number.isInteger(quantity) ||
      quantity < 1 ||
      quantity > MAX_QUANTITY
    ) {
      unavailable.push(slug);
      continue;
    }

    items.push({
      slug: sellable.slug,
      isbn: sellable.isbn,
      name: sellable.title,
      amount,
      currency: sellable.price.currency,
      quantity,
    });
  }

  // Stock is checked here and decremented only once Stripe confirms payment
  // (see the webhook). A title with no row isn't tracked and sells freely; a
  // null map means Supabase isn't configured, which is "unknown", not "none".
  const short: string[] = [];

  for (const item of items) {
    const onHand = inventory?.get(item.slug)?.quantity ?? null;
    const enough = onHand === null || onHand >= item.quantity;

    if (log) {
      console.log(
        `[checkout] ${item.slug}: wants ${item.quantity}, ${
          onHand === null ? "not stock-tracked" : `${onHand} on hand`
        } → ${enough ? "ok" : "SHORT"}`,
      );
    }

    if (!enough) short.push(item.slug);
  }

  return { items, unavailable, short };
}

/**
 * What is wrong with the cart as it stands, so the page can say so before
 * anyone reaches for the payment button.
 *
 * Advisory only, and nothing here is trusted: `startCheckout` runs the same
 * checks again against fresh rows, because the last copy can sell between the
 * two. This exists to save a pointless trip to Stripe, not to decide anything.
 */
export async function checkCart(request: CheckoutRequest): Promise<{
  unavailable: string[];
  outOfStock: string[];
}> {
  const nothingWrong = { unavailable: [], outOfStock: [] };

  if (!Array.isArray(request) || request.length === 0 || request.length > 50) {
    return nothingWrong;
  }

  const rawLocale = await getLocale();
  const locale = isLocale(rawLocale) ? rawLocale : defaultLocale;

  try {
    const { unavailable, short } = await priceCart(request, locale, {
      log: false,
    });
    return { unavailable, outOfStock: short };
  } catch (error) {
    // The page still works without this, and the payment guard is the real
    // one — so a lookup failure here must not block a cart that is fine.
    console.error("Cart availability check failed", error);
    return nothingWrong;
  }
}

/** Turns the browser's cart into a Stripe Checkout session, for the shipping
 * zone the buyer picked in the cart. */
export async function startCheckout(
  request: CheckoutRequest,
  zone: ShippingZone,
): Promise<CheckoutResult> {
  if (!isCheckoutConfigured()) return { ok: false, reason: "notConfigured" };

  // Only the zone crosses from the browser; its rates are looked up here.
  if (!isShippingZone(zone)) return { ok: false, reason: "failed" };

  if (!Array.isArray(request) || request.length === 0 || request.length > 50) {
    return { ok: false, reason: "empty" };
  }

  const rawLocale = await getLocale();
  const locale = isLocale(rawLocale) ? rawLocale : defaultLocale;

  let priced: Priced;
  try {
    priced = await priceCart(request, locale, { log: true });
  } catch (error) {
    // Failing open here would price the cart from the catalogue and skip the
    // stock check — the two things this lookup exists to prevent.
    console.error("Supabase inventory lookup failed", error);
    return { ok: false, reason: "failed" };
  }

  const { items, unavailable, short } = priced;

  // Stripe charges a session in one currency.
  const currencies = new Set(items.map((item) => item.currency));
  if (unavailable.length > 0 || currencies.size !== 1) {
    return { ok: false, reason: "unavailable", slugs: unavailable };
  }

  if (short.length > 0) {
    console.warn(`[checkout] refused, out of stock: ${short.join(", ")}`);
    return { ok: false, reason: "outOfStock", slugs: short };
  }

  let url: string;
  let reservation: string | undefined;
  try {
    // Last word on price, and the only one that isn't a preference: a line
    // sent to Stripe as a linked price ID is charged at Stripe's amount
    // whatever we put beside it, so for those books Stripe *is* the price.
    //
    // Three sources, in order — the catalogue's own price, overridden by the
    // shop's record in Supabase, overridden by a linked Stripe price. Each
    // only applies where the one before it left off, so a book priced in
    // exactly one place is charged from that place.
    const linked = await getLinkedPrices(items.map((item) => item.slug));
    for (const item of items) {
      const price = linked.get(item.slug);
      if (!price) continue;

      if (price.amount !== item.amount || price.currency !== item.currency) {
        // Worth saying out loud: the customer is about to be charged
        // something other than what the page quoted them.
        console.warn(
          `[checkout] ${item.slug}: Stripe price ${price.amount} ${price.currency} ` +
            `differs from the shop's ${item.amount} ${item.currency} — charging Stripe's`,
        );
      }

      Object.assign(item, {
        stripePriceId: price.id,
        amount: price.amount,
        currency: price.currency,
      });
    }

    // Re-checked because a linked price may have brought a second currency in
    // with it, and Stripe charges a session in one.
    if (new Set(items.map((item) => item.currency)).size !== 1) {
      return { ok: false, reason: "unavailable", slugs: [] };
    }

    // Hold the copies for as long as the Stripe page can be paid, plus a
    // margin for the webhook to arrive. The check above is a snapshot; this is
    // the atomic one, so of two customers after the last copy only one gets
    // through to Stripe.
    const expiresAt = new Date(Date.now() + (CHECKOUT_MINUTES + 1) * 60_000);
    reservation = randomUUID();
    const held = await reserveStock(
      reservation,
      items,
      new Date(expiresAt.getTime() + 10 * 60_000),
      await callerKey(),
    );
    if (held === null) reservation = undefined;
    if (held && held.length > 0) {
      console.warn(`[checkout] refused, held by others: ${held.join(", ")}`);
      return { ok: false, reason: "outOfStock", slugs: held };
    }

    const t = await getTranslations({ locale, namespace: "cart.shipping" });
    url = await createCheckoutSession({
      items,
      locale,
      origin: await origin(),
      reservation,
      expiresAt,
      zone,
      methodNames: Object.fromEntries(
        SHIPPING_METHODS[zone].map((method) => [
          method.id,
          t(`methods.${method.id}`),
        ]),
      ),
    });
  } catch (error) {
    console.error("Stripe checkout failed", error);
    if (reservation) {
      await releaseStock(reservation).catch((releaseError) =>
        // Harmless if it fails: the hold runs out on its own.
        console.error("Could not release stock hold", releaseError),
      );
    }
    return { ok: false, reason: "failed" };
  }

  return { ok: true, url };
}

/** The site's own address, for Stripe's return links. `SITE_URL` wins when set,
 * which keeps a spoofed Host header from choosing where customers land. */
async function origin() {
  if (process.env.SITE_URL) return process.env.SITE_URL.replace(/\/$/, "");

  const list = await headers();
  const host = list.get("x-forwarded-host") ?? list.get("host");
  const proto =
    list.get("x-forwarded-proto") ??
    (host?.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}
