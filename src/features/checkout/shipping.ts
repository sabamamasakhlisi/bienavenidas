/**
 * Shipping zones and what each costs.
 *
 * Safe to import from the browser: the cart shows these prices before anyone
 * reaches Stripe, and the server charges from the same table, so the two can
 * never disagree.
 *
 * Why the buyer picks a zone on our page: Stripe's hosted Checkout offers the
 * same shipping options whatever address is typed into it, so it can't charge
 * Spain one rate and Germany another by itself. Instead the cart asks where
 * the parcel is going, and the Stripe session is opened for that zone only —
 * its countries and its rates. An address outside the zone can't be entered.
 */

export const SHIPPING_ZONES = ["es", "eu"] as const;
export type ShippingZone = (typeof SHIPPING_ZONES)[number];

export function isShippingZone(value: unknown): value is ShippingZone {
  return SHIPPING_ZONES.includes(value as ShippingZone);
}

/**
 * Each zone's rates, in cents. `name` is what the order book stores — in
 * Spanish whatever the buyer's language, like the rest of the order record;
 * the names buyers see live in the `cart.shipping.methods` messages.
 *
 * A fixed table for now. Pricing by weight would replace these amounts with
 * a calculation, and nothing in Stripe needs to change for it: the rates are
 * sent with each checkout rather than kept in the Stripe dashboard.
 */
export const SHIPPING_METHODS = {
  es: [
    { id: "ordinario", amount: 370, name: "Envío ordinario nacional" },
    { id: "certificado", amount: 870, name: "Envío certificado nacional" },
  ],
  eu: [{ id: "eu", amount: 953, name: "Envío EU" }],
} as const satisfies Record<
  ShippingZone,
  readonly { id: string; amount: number; name: string }[]
>;

/** The order book's name for a method id, or null for one it doesn't know. */
export function shippingMethodName(id: string | undefined): string | null {
  for (const methods of Object.values(SHIPPING_METHODS)) {
    const method = methods.find((candidate) => candidate.id === id);
    if (method) return method.name;
  }
  return null;
}

export type ShippingMethod =
  (typeof SHIPPING_METHODS)[ShippingZone][number]["id"];

/** Where each zone ships. Spain on its own; the rest of the EU together. */
export const ZONE_COUNTRIES = {
  es: ["ES"],
  eu: [
    "PT", "FR", "DE", "IT", "NL", "BE", "LU", "AT", "IE", "DK", "SE", "FI",
    "PL", "CZ", "SK", "SI", "HR", "HU", "RO", "BG", "GR", "CY", "MT", "EE",
    "LV", "LT",
  ],
} as const satisfies Record<ShippingZone, readonly string[]>;
