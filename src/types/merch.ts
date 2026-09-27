import type { ImageRef, Price, StockStatus } from "@/types/book";
import type { Locale } from "@/i18n/config";

/**
 * Things the shop sells that are not books.
 *
 * Deliberately not a `Book` with empty fields: a shirt has no ISBN, no page
 * count and no publication date, and `ISBN` is branded precisely so one can't
 * be invented. What merch shares with a book is only what checkout needs —
 * a slug, a price and a stock status — and that shared shape is `Sellable`
 * (see `features/catalog/sellable.ts`), not this.
 */

/**
 * One size, one colour — one thing that can actually be bought.
 *
 * A size is a separate sellable item rather than an option on a shared one,
 * because everything downstream is keyed by slug: the `stock` table's primary
 * key, the Stripe lookup key, the cart line, the order record, and the
 * decrement in `record_order`. Giving each size its own slug means per-size
 * counts and a per-size sell-out come free, and nothing in that chain has to
 * learn what a size is.
 */
export type MerchVariant = {
  /** The sellable slug. What `stock`, the cart and the order record key on. */
  slug: string;
  /** Set on the size button, and appended to the name Stripe is sent. */
  label: string;
  /**
   * Overrides the item's price for this size alone. Rarely wanted — an XL
   * costing more than a baby tee is the case it exists for.
   */
  price?: Price;
  /** Catalogue-side status, overlaid by the shop's count. See `live.ts`. */
  stock?: StockStatus;
};

/** Copy that differs per language. Falls back to the item's own fields. */
export type MerchTranslation = {
  title?: string;
  credits?: string;
};

export type Merch = {
  /**
   * Identifies the item, and anchors its section. Never sold under this slug:
   * only its variants are, so nothing looks for a `stock` row by this name.
   */
  slug: string;
  title: string;
  /** Colophon lines exactly as set in the design (newline separated). */
  credits?: string;
  /** The price every variant is sold at unless it names its own. */
  price: Price;
  /** Resolved from `public/merch/` by `attachMerchArt`. */
  image?: ImageRef;
  /** Photo proportion as width ÷ height. */
  imageAspect?: number;
  /**
   * Which catalogue entry this sits below on the page, by slug.
   *
   * Editorial placement, so it belongs in the data beside the item rather than
   * in the component that happens to draw the page — the same reason the
   * shelf's own arrangement is a list and not a layout. Unset, it goes last.
   */
  after?: string;
  /** In the order the sizes are offered. At least one. */
  variants: MerchVariant[];
  translations?: Partial<Record<Locale, MerchTranslation>>;
};
