import { existsSync } from "node:fs";
import path from "node:path";

import type { Book } from "@/types/book";
import type { Merch } from "@/types/merch";

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
 * Merch art works the same way from `public/merch/`, keyed by the item's slug.
 *
 * Server-only: this touches `node:fs`, so it must never be imported from a
 * component marked `"use client"`.
 */
const COVERS_DIR = path.join(process.cwd(), "public", "covers");
const MERCH_DIR = path.join(process.cwd(), "public", "merch");

/** Most efficient first — whatever `pnpm covers` produced, or the original. */
const EXTENSIONS = ["avif", "webp", "jpg", "jpeg", "png"] as const;

/** Nominal intrinsic size. CSS does the real sizing; only the ratio matters. */
const NOMINAL_WIDTH = 1200;

/**
 * Two near-identical lookups rather than one taking the directory.
 *
 * Deliberate: the build traces `path.join` statically, and a joined path whose
 * base is a parameter is one it cannot resolve — so it gives up and traces the
 * entire project into the server bundle. Each base has to be a constant the
 * tracer can see, which is what keeps these apart.
 */
function findFile(stem: string) {
  for (const ext of EXTENSIONS) {
    const file = `${stem}.${ext}`;
    if (existsSync(path.join(COVERS_DIR, file))) return file;
  }
  return undefined;
}

function findMerchFile(stem: string) {
  for (const ext of EXTENSIONS) {
    const file = `${stem}.${ext}`;
    if (existsSync(path.join(MERCH_DIR, file))) return file;
  }
  return undefined;
}

function toImageRef(file: string, aspect: number, dir = "covers") {
  return {
    src: `/${dir}/${file}`,
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
 * Merch photography, from `public/merch/<slug>.<ext>`.
 *
 * Same contract as covers: drop the file in and it appears. Without it the
 * section still lays out at the right proportion, showing a tinted plate.
 */
export function attachMerchArt(item: Merch): Merch {
  if (item.image) return item;

  const file = findMerchFile(item.slug);
  if (!file) return item;

  return {
    ...item,
    image: toImageRef(file, item.imageAspect ?? 1, "merch"),
  };
}

export function attachMerchArtAll(items: Merch[]): Merch[] {
  return items.map(attachMerchArt);
}
