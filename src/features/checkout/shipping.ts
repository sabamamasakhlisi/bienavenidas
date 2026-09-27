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
 * The method ids are what the order book stores, so keep them stable; the
 * names shown to buyers live in the `cart.shipping` messages.
 */
export const SHIPPING_METHODS = {
  es: [
    { id: "ordinario", amount: 370 },
    { id: "certificado", amount: 870 },
  ],
  eu: [{ id: "eu", amount: 953 }],
} as const satisfies Record<ShippingZone, readonly { id: string; amount: number }[]>;

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
