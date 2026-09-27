import type { Book, Currency, ImageRef } from "@/types/book";
import type { Merch } from "@/types/merch";
import type { Locale } from "@/i18n/config";

import { formatPrice, localizeBook } from "./catalog";
import { localizeMerch, variantPrice } from "./merch";

/**
 * A book resolved for one locale.
 *
 * Built on the server so the client reader stays presentational — it receives
 * finished strings and never needs the message catalogues or the locale.
 */
export type BookView = {
  book: Book;
  title: string;
  author: string;
  description: string;
  quote: string;
  credits?: string;
  price: string;
  isOpenCall: boolean;
  isComingSoon: boolean;
  isSoldOut: boolean;
  /**
   * This title's own stock status, already translated — "Próximamente",
   * "Agotado", and so on. Pre-resolved because `Reader` has only the `libros`
   * namespace.
   */
  stockLabel: string;
};

export function toView(
  book: Book,
  locale: Locale,
  stockLabel: string,
): BookView {
  const { title, description, quote } = localizeBook(book, locale);

  return {
    book,
    title,
    author: book.authors[0]?.name ?? "",
    description,
    quote,
    credits: book.credits,
    price: formatPrice(book.price, locale),
    // A free listing is a call for submissions, not something to buy.
    isOpenCall: book.price.amount === 0,
    // Announced but unfinished: the entry takes an interest, not an order.
    isComingSoon: book.stock === "coming_soon",
    // Live, from the shop's own count — not the catalogue's static status.
    isSoldOut: book.stock === "out_of_stock" || book.stock === "out_of_print",
    stockLabel,
  };
}

/** One size, resolved: what it says, what it costs, whether it can be had. */
export type MerchVariantView = {
  slug: string;
  label: string;
  /** Formatted for the plate. */
  price: string;
  /** Minor units — what the cart line records for its running total. */
  amount: number;
  currency: Currency;
  soldOut: boolean;
};

export type MerchView = {
  slug: string;
  title: string;
  credits?: string;
  image?: ImageRef;
  imageAspect: number;
  /** Degrees the photo is turned. See `Merch.imageTilt`. */
  imageTilt?: number;
  variants: MerchVariantView[];
  /** Pre-resolved, as for books: the section has only its own namespace. */
  soldOutLabel: string;
};

/**
 * A merch item resolved for one locale.
 *
 * Each size carries its own price rather than the item carrying one for all of
 * them. They are nearly always equal — but they are separate rows in `stock`,
 * so they *can* diverge, and a plate showing one size's price while the till
 * charges another's is the one failure this shape makes impossible.
 */
export function toMerchView(
  item: Merch,
  locale: Locale,
  soldOutLabel: string,
): MerchView {
  const { title, credits } = localizeMerch(item, locale);

  return {
    slug: item.slug,
    title,
    credits,
    image: item.image,
    imageAspect: item.imageAspect ?? 1,
    imageTilt: item.imageTilt,
    soldOutLabel,
    variants: item.variants.map((variant) => {
      const price = variantPrice(item, variant);
      const stock = variant.stock ?? "in_stock";

      return {
        slug: variant.slug,
        label: variant.label,
        price: formatPrice(price, locale),
        amount: price.amount,
        currency: price.currency,
        soldOut: stock === "out_of_stock" || stock === "out_of_print",
      };
    }),
  };
}
