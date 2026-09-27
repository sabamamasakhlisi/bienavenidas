/**
 * Shipping zones: where each ships, and fallback rates.
 *
 * The rates themselves are managed in the Stripe dashboard (Product catalogue →
 * Shipping rates), each tagged with metadata `zone` = `es` or `eu`; see
 * `shippingOptions` in `stripe.ts`. The table below is only a fallback
 * for while none are tagged, so checkout keeps working during setup.
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
 * Fallback rates, used only when the Stripe dashboard has no active rate
 * tagged for the zone. Names live in the `cart.shipping.methods` messages.
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
