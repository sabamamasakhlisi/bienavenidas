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
