import type { Book } from "@/types/book";
import type { Locale } from "@/i18n/config";

import { formatPrice, localizeBook } from "./catalog";

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
  /** Pre-resolved, because `Reader` has only the `libros` namespace. */
  soldOutLabel: string;
};

export function toView(
  book: Book,
  locale: Locale,
  soldOutLabel: string,
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
    soldOutLabel,
  };
}
