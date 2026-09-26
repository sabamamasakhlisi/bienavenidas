"use server";

import { headers } from "next/headers";

import { getLocale } from "next-intl/server";

import { getBookBySlug, localizeBook } from "@/features/catalog/catalog";
import { MAX_QUANTITY } from "@/features/checkout/limits";
import {
  createCheckoutSession,
  isCheckoutConfigured,
  type PricedItem,
} from "@/features/checkout/stripe";
import { defaultLocale, isLocale } from "@/i18n/config";

export type CheckoutRequest = { slug: string; quantity: number }[];

export type CheckoutResult =
  | { ok: true; url: string }
  | {
      ok: false;
      reason: "notConfigured" | "empty" | "unavailable" | "failed";
      /** Lines that can't be bought, so the cart can point at them. */
      slugs?: string[];
    };

/** Titles that are listed but not sold: nothing to charge, or nothing to ship. */
const UNBUYABLE = new Set(["out_of_stock", "out_of_print"]);

/**
 * Turns the browser's cart into a Stripe Checkout session.
 *
 * This is where the app joins `catalog` and `checkout`, so neither feature has
 * to import the other. Only slugs and quantities are trusted from the client;
 * every price and name is looked up again here.
 */
export async function startCheckout(
  request: CheckoutRequest,
): Promise<CheckoutResult> {
  if (!isCheckoutConfigured()) return { ok: false, reason: "notConfigured" };

  if (!Array.isArray(request) || request.length === 0 || request.length > 50) {
    return { ok: false, reason: "empty" };
  }

  const rawLocale = await getLocale();
  const locale = isLocale(rawLocale) ? rawLocale : defaultLocale;

  const items: PricedItem[] = [];
  const unavailable: string[] = [];

  for (const line of request) {
    const slug = typeof line?.slug === "string" ? line.slug : "";
    const quantity = line?.quantity;
    const book = slug ? await getBookBySlug(slug) : undefined;

    if (
      !book ||
      book.price.amount <= 0 ||
      UNBUYABLE.has(book.stock) ||
      !Number.isInteger(quantity) ||
      quantity < 1 ||
      quantity > MAX_QUANTITY
    ) {
      unavailable.push(slug);
      continue;
    }

    items.push({
      slug: book.slug,
      isbn: book.isbn,
      name: localizeBook(book, locale).title,
      amount: book.price.amount,
      currency: book.price.currency,
      quantity,
    });
  }

  // Stripe charges a session in one currency.
  const currencies = new Set(items.map((item) => item.currency));
  if (unavailable.length > 0 || currencies.size !== 1) {
    return { ok: false, reason: "unavailable", slugs: unavailable };
  }

  let url: string;
  try {
    url = await createCheckoutSession({
      items,
      locale,
      origin: await origin(),
    });
  } catch (error) {
    console.error("Stripe checkout failed", error);
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
