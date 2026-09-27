import type { ISBN, Price, StockStatus } from "@/types/book";
import type { Locale } from "@/i18n/config";

import { getBookBySlug, localizeBook } from "./catalog";
import { getMerchVariantBySlug, localizeMerch, variantPrice } from "./merch";

/**
 * Anything the shop can sell, reduced to what checkout needs to know.
 *
 * This is the single seam between the catalogue and the till. Checkout holds
 * nothing but slugs and quantities from the browser, and asks here what each
 * slug is worth and whether it can be sold — so it never has to know whether
 * it is pricing a book or a size of t-shirt, and the catalogue never has to
 * know the shop exists.
 */
export type Sellable = {
  slug: string;
  /** Books have one; merch does not, and that is not a gap to fill. */
  isbn: ISBN | null;
  /** Already resolved for the reader's language — the name Stripe is sent. */
  title: string;
  price: Price;
  stock: StockStatus;
};

/**
 * Looks a sellable slug up across the whole shop.
 *
 * Books first, then merch sizes. Slugs are unique across both by construction
 * — a size's slug is its item's slug with the size appended — so the order
 * only decides which lookup runs first, never which answer wins.
 */
export async function getSellableBySlug(
  slug: string,
  locale: Locale,
): Promise<Sellable | undefined> {
  const book = slug ? await getBookBySlug(slug) : undefined;
  if (book) {
    return {
      slug: book.slug,
      isbn: book.isbn,
      title: localizeBook(book, locale).title,
      price: book.price,
      stock: book.stock,
    };
  }

  const found = slug ? await getMerchVariantBySlug(slug) : undefined;
  if (found) {
    const { item, variant } = found;
    return {
      slug: variant.slug,
      isbn: null,
      // The size belongs in the name: it is what tells apart two lines on a
      // Stripe receipt, in the order record, and on the packing slip.
      title: `${localizeMerch(item, locale).title} — ${variant.label}`,
      price: variantPrice(item, variant),
      stock: variant.stock ?? "in_stock",
    };
  }

  return undefined;
}
