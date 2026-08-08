import { existsSync } from "node:fs";
import path from "node:path";

import type { Book } from "@/types/book";

/**
 * Resolves cover art from disk.
 *
 * A book gets its cover as soon as a file named after its slug appears in
 * `public/covers/` — no code change needed to add artwork, and no broken image
 * before it arrives, because a missing file simply leaves `cover` undefined and
 * `BookCover` falls back to its tinted plate.
 *
 * Server-only: this touches `node:fs`, so it must never be imported from a
 * component marked `"use client"`.
 */
const COVERS_DIR = path.join(process.cwd(), "public", "covers");

/** Most efficient first — whatever `pnpm covers` produced, or the original. */
const EXTENSIONS = ["avif", "webp", "jpg", "jpeg", "png"] as const;

/** Nominal intrinsic size. CSS does the real sizing; only the ratio matters. */
const NOMINAL_WIDTH = 1200;

function findCover(book: Book) {
  for (const ext of EXTENSIONS) {
    const file = `${book.slug}.${ext}`;
    if (existsSync(path.join(COVERS_DIR, file))) return file;
  }
  return undefined;
}

export function attachCover(book: Book): Book {
  // An explicit `cover` in the catalogue always wins.
  if (book.cover) return book;

  const file = findCover(book);
  if (!file) return book;

  const aspect = book.coverAspect ?? 0.66;

  return {
    ...book,
    cover: {
      src: `/covers/${file}`,
      // Left empty so `BookCover` substitutes the localized title — the alt
      // text has to follow the reader's language, which this module doesn't
      // know about.
      alt: "",
      width: NOMINAL_WIDTH,
      height: Math.round(NOMINAL_WIDTH / aspect),
    },
  };
}

export function attachCovers(books: Book[]): Book[] {
  return books.map(attachCover);
}
