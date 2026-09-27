import { existsSync } from "node:fs";
import path from "node:path";

import type { Book } from "@/types/book";

/**
 * Resolves cover art from disk.
 *
 * A book gets its art as soon as a file named after its slug appears in
 * `public/covers/` — no code change needed, and no broken image before it
 * arrives, because a missing file leaves the field undefined and `BookCover`
 * falls back to its tinted plate.
 *
 *   <slug>.<ext>         the cover, face-out
 *   <slug>.spine.<ext>   the closed book standing on the shelf
 *   <slug>.detail.<ext>  shown in the book's own entry instead of the cover
 *
 * Server-only: this touches `node:fs`, so it must never be imported from a
 * component marked `"use client"`.
 */
const COVERS_DIR = path.join(process.cwd(), "public", "covers");

/** Most efficient first — whatever `pnpm covers` produced, or the original. */
const EXTENSIONS = ["avif", "webp", "jpg", "jpeg", "png"] as const;

/** Nominal intrinsic size. CSS does the real sizing; only the ratio matters. */
const NOMINAL_WIDTH = 1200;

function findFile(stem: string) {
  for (const ext of EXTENSIONS) {
    const file = `${stem}.${ext}`;
    if (existsSync(path.join(COVERS_DIR, file))) return file;
  }
  return undefined;
}

function toImageRef(file: string, aspect: number) {
  return {
    src: `/covers/${file}`,
    // Left empty so `BookCover` substitutes the localized title — the alt
    // text has to follow the reader's language, which this module doesn't
    // know about.
    alt: "",
    width: NOMINAL_WIDTH,
    height: Math.round(NOMINAL_WIDTH / aspect),
  };
}

export function attachCover(book: Book): Book {
  const resolved = { ...book };

  // An explicit entry in the catalogue always wins over what's on disk.
  if (!resolved.cover) {
    const file = findFile(book.slug);
    if (file) resolved.cover = toImageRef(file, book.coverAspect ?? 0.66);
  }

  // `<slug>.spine.<ext>` — how the book stands closed on the shelf. Optional:
  // without it the shelf falls back to showing the cover face-out.
  if (!resolved.spineImage) {
    const file = findFile(`${book.slug}.spine`);
    if (file) resolved.spineImage = toImageRef(file, book.spineAspect ?? 0.2);
  }

  // `<slug>.detail.<ext>` — the entry's own image. Optional: without it the
  // entry shows the cover, which is the usual case.
  if (!resolved.detailImage) {
    const file = findFile(`${book.slug}.detail`);
    if (file) resolved.detailImage = toImageRef(file, book.coverAspect ?? 0.66);
  }

  return resolved;
}

export function attachCovers(books: Book[]): Book[] {
  return books.map(attachCover);
}

/**
 * The cover as a file link previews can show. WhatsApp, Facebook and most
 * other scrapers don't read AVIF or WebP, so this looks only for the JPEG or
 * PNG that `pnpm covers` keeps beside them.
 */
export function shareImageFor(book: Book): string | undefined {
  for (const ext of ["jpg", "jpeg", "png"]) {
    const file = `${book.slug}.${ext}`;
    if (existsSync(path.join(COVERS_DIR, file))) return `/covers/${file}`;
  }
  return undefined;
}
