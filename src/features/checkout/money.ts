import type { Price } from "@/types/book";

/**
 * Formats minor units for display. The division happens only here, at the
 * very edge — every sum before it stays in integer cents.
 */
export function formatMoney(price: Price, locale: string): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: price.currency,
    minimumFractionDigits: price.amount % 100 === 0 ? 0 : 2,
  }).format(price.amount / 100);
}
