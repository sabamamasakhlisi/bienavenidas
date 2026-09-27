import type { Book, StockStatus } from "@/types/book";
import type { Merch } from "@/types/merch";

import { getInventory } from "./inventory";

/**
 * Overlays what the shop actually knows onto catalogue entries: the price
 * people are charged, and whether there is a copy to sell.
 *
 * Kept here rather than in `catalog` so that feature never has to know the
 * shop exists — the same separation `carrito/actions.ts` keeps.
 *
 * Failing is not fatal here, and that asymmetry is deliberate: a page that
 * can't reach Supabase shows the catalogue's own price and status, which is a
 * stale number on a screen. Checkout does the opposite and refuses, because
 * there the same stale number is what the customer gets charged.
 */

/**
 * Statuses a shelf count is allowed to overrule.
 *
 * The rest are editorial decisions, not counts: `coming_soon` stays coming
 * soon however many copies exist, and `out_of_print` doesn't come back into
 * stock because someone typed a number. Only a title the catalogue already
 * considers on sale defers to the shelf.
 */
const COUNTED = new Set<StockStatus>(["in_stock", "low_stock"]);

/** At or below this many copies, say so rather than implying a full shelf. */
const LOW_STOCK_AT = 3;

function liveStatus(catalogue: StockStatus, quantity: number): StockStatus {
  if (!COUNTED.has(catalogue)) return catalogue;
  if (quantity <= 0) return "out_of_stock";
  return quantity <= LOW_STOCK_AT ? "low_stock" : "in_stock";
}

export async function withLiveShop(books: Book[]): Promise<Book[]> {
  let inventory;
  try {
    inventory = await getInventory(
      books.map((book) => book.slug),
      // Development only: this runs on every page render.
      { label: "shopfront" },
    );
  } catch (error) {
    console.error(
      "[supabase] shopfront lookup failed; showing catalogue price and status",
      error,
    );
    return books;
  }

  if (!inventory) return books;

  return books.map((book) => {
    const row = inventory.get(book.slug);
    // No row at all means the title isn't tracked here: it sells freely at
    // its catalogue price, which is what an untouched entry already says.
    if (!row) return book;

    return {
      ...book,
      price: row.price ? { ...book.price, amount: row.price } : book.price,
      stock: liveStatus(book.stock, row.quantity),
    };
  });
}

/** Single-book form, for `/libros/[slug]`. */
export async function withLiveShopBook(book: Book): Promise<Book> {
  const [live] = await withLiveShop([book]);
  return live;
}

/**
 * The same overlay for merch, applied per size.
 *
 * Each size is its own slug and its own row, so baby tee selling out says
 * nothing about XL — which is the whole reason sizes are separate slugs. An
 * item's own price still stands for any size that has no price of its own and
 * no row of its own.
 */
export async function withLiveMerch(items: Merch[]): Promise<Merch[]> {
  const slugs = items.flatMap((item) =>
    item.variants.map((variant) => variant.slug),
  );

  let inventory;
  try {
    inventory = await getInventory(slugs, { label: "merch" });
  } catch (error) {
    console.error(
      "[supabase] merch lookup failed; showing catalogue price and status",
      error,
    );
    return items;
  }

  if (!inventory) return items;

  return items.map((item) => ({
    ...item,
    variants: item.variants.map((variant) => {
      const row = inventory.get(variant.slug);
      if (!row) return variant;

      const price = variant.price ?? item.price;

      return {
        ...variant,
        price: row.price ? { ...price, amount: row.price } : variant.price,
        stock: liveStatus(variant.stock ?? "in_stock", row.quantity),
      };
    }),
  }));
}
