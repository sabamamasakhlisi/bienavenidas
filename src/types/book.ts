import type { Locale } from "@/i18n/config";

/**
 * Domain vocabulary for the catalogue and, later, checkout.
 *
 * Types only — no runtime code, no mock data. The shapes here are what the
 * `catalog` and `checkout` features are expected to speak.
 */

/** Branded so a bare string can't be passed where an ISBN-13 is required. */
export type ISBN = string & { readonly __brand: "ISBN" };

export type Currency = "EUR" | "USD";

export type Price = {
  /**
   * Minor units (cents) as an integer — never a float. Money arithmetic in
   * floating point loses cents, and this is the type checkout will build on.
   */
  amount: number;
  currency: Currency;
};

export type StockStatus =
  | "in_stock"
  | "low_stock"
  | "out_of_stock"
  | "preorder"
  | "out_of_print";

export type Author = {
  slug: string;
  name: string;
  /** Short biography, per locale. */
  bio: Partial<Record<Locale, string>>;
  photo?: ImageRef;
  country?: string;
};

export type ImageRef = {
  src: string;
  alt: string;
  width: number;
  height: number;
};

/** Copy that differs per language. Titles are often left untranslated, hence
 * the partial record: fall back to the book's own `title`. */
export type BookTranslation = {
  title?: string;
  subtitle?: string;
  description?: string;
  /** Pull-quote shown in the reading section below the shelf. */
  quote?: string;
};

/** How the title is drawn on the shelf when standing closed. */
export type Spine = {
  color: string;
  /** Rendered width in px — thickness of the book. */
  width: number;
  /** Degrees of lean against its neighbour. */
  lean?: number;
};

export type Book = {
  /** URL segment for `/libros/[slug]`. Locale-independent by design. */
  slug: string;
  isbn: ISBN;
  title: string;
  subtitle?: string;
  authors: Author[];
  description: string;
  price: Price;
  stock: StockStatus;
  pageCount: number;
  /** ISO 8601 date. */
  publishedAt: string;
  cover?: ImageRef;
  collection?: string;
  /** Colophon lines exactly as set in the design (newline separated). */
  credits?: string;
  spine?: Spine;
  /** Flat colour standing in for cover art until the real file exists. */
  coverTone?: string;
  /** Cover proportion as width ÷ height. Trade paperback ≈ 0.66, poster ≈ 0.76. */
  coverAspect?: number;
  /** How wide the cover stands on the shelf, as a CSS length. */
  shelfWidth?: string;
  /** Degrees the cover leans on the shelf. */
  shelfLean?: number;
  translations?: Partial<Record<Locale, BookTranslation>>;
};
