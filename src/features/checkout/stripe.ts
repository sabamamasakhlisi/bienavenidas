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
  isbn: ISBN;
  name: string;
  amount: number;
  currency: Currency;
  quantity: number;
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

export async function createCheckoutSession({
  items,
  locale,
  origin,
}: {
  items: PricedItem[];
  locale: Locale;
  origin: string;
}): Promise<string> {
  const session = await stripe().checkout.sessions.create({
    mode: "payment",
    locale,
    line_items: items.map((item) => ({
      quantity: item.quantity,
      price_data: {
        currency: item.currency.toLowerCase(),
        unit_amount: item.amount,
        product_data: {
          name: item.name,
          metadata: { slug: item.slug, isbn: item.isbn },
        },
      },
    })),
    shipping_address_collection: { allowed_countries: [...SHIPPING_COUNTRIES] },
    // Couriers ask for a phone number on delivery.
    phone_number_collection: { enabled: true },
    // Compact order record for fulfilment, readable in the Stripe dashboard.
    metadata: {
      order: items.map((item) => `${item.quantity}x ${item.slug}`).join(", "),
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

  return {
    stripeSessionId: session.id,
    email: session.customer_details?.email ?? null,
    phone: session.customer_details?.phone ?? null,
    shippingName: shipping?.name ?? session.customer_details?.name ?? null,
    shippingAddress: shipping?.address ? { ...shipping.address } : null,
    amountTotal: session.amount_total ?? 0,
    currency: (session.currency ?? "eur").toUpperCase(),
    items: lineItems.data.map((line) => {
      const product = line.price?.product;
      const metadata =
        product && typeof product === "object" && !product.deleted
          ? product.metadata
          : {};
      return {
        slug: metadata.slug ?? "",
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
