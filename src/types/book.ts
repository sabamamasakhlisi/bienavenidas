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
  /** Announced, but not finished — there is nothing to buy or reserve yet. */
  | "coming_soon"
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
  /**
   * Pull-quote shown beside the entry, in the language the book is written in.
   *
   * A base, as `title` and `description` are: a translation overrides it where
   * one exists, and a title read in its original language simply has none.
   */
  quote?: string;
  price: Price;
  stock: StockStatus;
  pageCount: number;
  /** ISO 8601 date. */
  publishedAt: string;
  cover?: ImageRef;
  /**
   * Shown in the book's own entry instead of the cover, when the two differ —
   * a title still in the making may have artwork to show before it has a
   * finished cover.
   */
  detailImage?: ImageRef;
  /**
   * The cover art isn't final, so it should not be seen anywhere yet.
   *
   * With this set the entry's own image stands in for the cover everywhere a
   * cover is drawn — the shelf, the pointer follower, the detail page and the
   * card that link previews scrape. Remove it when the real cover lands and
   * every one of those picks the cover up again, with no other change.
   */
  coverPending?: boolean;
  collection?: string;
  /** Colophon lines exactly as set in the design (newline separated). */
  credits?: string;
  spine?: Spine;
  /** Flat colour standing in for cover art until the real file exists. */
  coverTone?: string;
  /** Cover proportion as width ÷ height. Trade paperback ≈ 0.66, poster ≈ 0.76. */
  coverAspect?: number;
  /**
   * Artwork of the book standing closed, seen edge-on. When present the shelf
   * shows this instead of the cover face-out, and hovering reveals the cover.
   */
  spineImage?: ImageRef;
  /** Spine proportion as width ÷ height — much narrower than a cover. */
  spineAspect?: number;
  /**
   * Draws the spine from a different picture, cropped to spine proportions.
   *
   * For a title with no spine artwork of its own: name another file's stem
   * (e.g. `"my-book.detail"`) and the shelf shows a strip of it instead of the
   * flat colour. Unlike real spine art the shape is not taken from the file —
   * `spineAspect` decides how wide the strip is, and the picture is cropped to
   * fit. Drop it when a proper spine arrives.
   */
  spineFrom?: string;
  /**
   * Which part of `spineFrom` the strip is cut from. Any CSS `object-position`
   * — "left", "center", "70% 0", and so on. Defaults to the left edge, where
   * a spine sits on a cover wrap.
   */
  spineFocus?: string;
  /** How wide the spine stands on the shelf, in px before the shelf scales it. */
  spineWidth?: number;
  /** How wide the open cover stands, in px before the shelf scales it. */
  shelfWidth?: number;
  /** Degrees the cover leans on the shelf. */
  shelfLean?: number;
  translations?: Partial<Record<Locale, BookTranslation>>;
};
