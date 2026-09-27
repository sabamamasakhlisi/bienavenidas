import Stripe from "stripe";

import type { Locale } from "@/i18n/config";
import type { Currency, ISBN } from "@/types/book";

/**
 * Stripe Checkout, server side only.
 *
 * Payment runs on Stripe's hosted page: card details never touch this app, and
 * the only secret is `STRIPE_SECRET_KEY`. Without it the shop still browses
 * and the cart still works — checkout just reports that it isn't configured.
 */

/** A line already priced by the server from the catalogue. Never built from
 * what the browser sent, beyond the slug and the quantity. */
export type PricedItem = {
  slug: string;
  /** Books carry one; merch does not. */
  isbn: ISBN | null;
  name: string;
  amount: number;
  currency: Currency;
  quantity: number;
  /** The linked price in the Stripe product catalogue, when there is one. */
  stripePriceId?: string;
};

/**
 * Where books ship. Spain and the rest of the EU to start with; widen this
 * list when shipping rates beyond it are decided.
 */
const SHIPPING_COUNTRIES = [
  "ES", "PT", "FR", "DE", "IT", "NL", "BE", "LU", "AT", "IE", "DK", "SE",
  "FI", "PL", "CZ", "SK", "SI", "HR", "HU", "RO", "BG", "GR", "CY", "MT",
  "EE", "LV", "LT",
] as const satisfies readonly Stripe.Checkout.SessionCreateParams.ShippingAddressCollection.AllowedCountry[];

let client: Stripe | null = null;

export function isCheckoutConfigured() {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

function stripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
  client ??= new Stripe(key);
  return client;
}

export type LinkedPrice = {
  id: string;
  amount: number;
  currency: Currency;
};

/**
 * Links books to the Stripe product catalogue.
 *
 * A book is linked when one of its Stripe prices has the book's slug as its
 * **lookup key** (Product → price → "Lookup key" in the dashboard). Lookup keys
 * are chosen by you, not by Stripe, so the same link works in test and live
 * mode, where price IDs differ. Books with no linked price keep being charged
 * from the site's own catalogue.
 */
export async function getLinkedPrices(
  slugs: string[],
): Promise<Map<string, LinkedPrice>> {
  const linked = new Map<string, LinkedPrice>();

  // Stripe accepts at most 10 lookup keys per request.
  for (let i = 0; i < slugs.length; i += 10) {
    const prices = await stripe().prices.list({
      lookup_keys: slugs.slice(i, i + 10),
      active: true,
      limit: 10,
    });

    for (const price of prices.data) {
      if (!price.lookup_key || price.unit_amount === null) continue;
      linked.set(price.lookup_key, {
        id: price.id,
        amount: price.unit_amount,
        currency: price.currency.toUpperCase() as Currency,
      });
    }
  }

  return linked;
}

/**
 * How long a Checkout session can be paid. Stripe's minimum, so a copy held
 * for someone who wandered off is back on sale as soon as possible.
 */
export const CHECKOUT_MINUTES = 30;

/**
 * The shipping rates to offer: every active EUR rate in the Stripe dashboard,
 * cheapest first (Stripe preselects the first), at most the five Stripe allows.
 *
 * Stripe shows them all whatever address is typed, so the buyer picks the one
 * that fits. Rates can't be edited once created: a new price is a new rate,
 * with the old one archived.
 */
async function shippingOptions(): Promise<
  Stripe.Checkout.SessionCreateParams.ShippingOption[]
> {
  const rates: Stripe.ShippingRate[] = [];
  for await (const rate of stripe().shippingRates.list({
    active: true,
    currency: "eur",
    limit: 100,
  })) {
    rates.push(rate);
  }

  if (rates.length === 0) {
    console.warn("[checkout] no active shipping rates in Stripe; charging no shipping");
  }

  return rates
    .sort((a, b) => (a.fixed_amount?.amount ?? 0) - (b.fixed_amount?.amount ?? 0))
    .slice(0, 5)
    .map((rate) => ({ shipping_rate: rate.id }));
}

export async function createCheckoutSession({
  items,
  locale,
  origin,
  reservation,
  expiresAt,
}: {
  items: PricedItem[];
  locale: Locale;
  origin: string;
  /** The stock hold this session pays for, if one was taken. */
  reservation?: string;
  expiresAt: Date;
}): Promise<string> {
  const session = await stripe().checkout.sessions.create({
    mode: "payment",
    locale,
    expires_at: Math.floor(expiresAt.getTime() / 1000),
    line_items: items.map((item) =>
      item.stripePriceId
        ? { quantity: item.quantity, price: item.stripePriceId }
        : {
            quantity: item.quantity,
            price_data: {
              currency: item.currency.toLowerCase(),
              unit_amount: item.amount,
              product_data: {
                name: item.name,
                // `null` is how Stripe's metadata spells "no such key", which
                // is what a merch line's ISBN is — not an empty string.
                metadata: { slug: item.slug, isbn: item.isbn },
              },
            },
          },
    ),
    shipping_address_collection: { allowed_countries: [...SHIPPING_COUNTRIES] },
    // Every active rate in the dashboard (Product catalogue → Shipping rates),
    // for the buyer to choose from. Prices are managed there, not here.
    shipping_options: await shippingOptions(),
    // Couriers ask for a phone number on delivery.
    phone_number_collection: { enabled: true },
    // Compact order record for fulfilment, readable in the Stripe dashboard.
    metadata: {
      order: items.map((item) => `${item.quantity}x ${item.slug}`).join(", "),
      ...(reservation ? { reservation } : {}),
    },
    success_url: `${origin}/carrito/gracias?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/carrito`,
  });

  if (!session.url) throw new Error("Stripe returned a session without a URL");
  return session.url;
}

/**
 * Verifies a webhook's signature and returns the event. Throws if the payload
 * didn't come from Stripe, so nothing unsigned ever reaches the order book.
 */
export function verifyWebhook(payload: string, signature: string) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) throw new Error("STRIPE_WEBHOOK_SECRET is not set");
  return stripe().webhooks.constructEvent(payload, signature, secret);
}

/**
 * Everything the order book needs from a paid session: who, where, and which
 * books. Line items are read back from Stripe rather than trusted from
 * metadata, and carry the slug and ISBN set when the session was created.
 */
export async function getPaidOrder(session: Stripe.Checkout.Session) {
  const lineItems = await stripe().checkout.sessions.listLineItems(session.id, {
    limit: 100,
    expand: ["data.price.product"],
  });

  const shipping = session.collected_information?.shipping_details ?? null;

  // The event carries the chosen rate as an id; its name is what gets stored.
  const rate = session.shipping_cost?.shipping_rate ?? null;
  const shippingRate =
    typeof rate === "string" ? await stripe().shippingRates.retrieve(rate) : rate;

  return {
    stripeSessionId: session.id,
    email: session.customer_details?.email ?? null,
    phone: session.customer_details?.phone ?? null,
    shippingName: shipping?.name ?? session.customer_details?.name ?? null,
    shippingAddress: shipping?.address ? { ...shipping.address } : null,
    amountTotal: session.amount_total ?? 0,
    shippingMethod: shippingRate?.display_name ?? null,
    shippingCost: session.shipping_cost?.amount_total ?? null,
    reservation: session.metadata?.reservation ?? null,
    currency: (session.currency ?? "eur").toUpperCase(),
    items: lineItems.data.map((line) => {
      const product = line.price?.product;
      const metadata =
        product && typeof product === "object" && !product.deleted
          ? product.metadata
          : {};
      return {
        // Linked catalogue prices carry the slug as their lookup key; ad-hoc
        // prices carry it in their product's metadata.
        slug: line.price?.lookup_key ?? metadata.slug ?? "",
        isbn: metadata.isbn ?? null,
        title: line.description ?? "",
        quantity: line.quantity ?? 0,
        amount: line.price?.unit_amount ?? 0,
      };
    }),
  };
}

export type OrderSummary = {
  paid: boolean;
  email: string | null;
  total: number | null;
  currency: Currency | null;
};

/** Looks up a finished session for the thank-you page. */
export async function getOrderSummary(
  sessionId: string,
): Promise<OrderSummary | null> {
  if (!isCheckoutConfigured() || !sessionId.startsWith("cs_")) return null;

  try {
    const session = await stripe().checkout.sessions.retrieve(sessionId);
    return {
      paid: session.payment_status === "paid",
      email: session.customer_details?.email ?? null,
      total: session.amount_total,
      currency: (session.currency?.toUpperCase() as Currency | undefined) ?? null,
    };
  } catch {
    return null;
  }
}
