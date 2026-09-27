import { existsSync } from "node:fs";
import path from "node:path";

import type { Book } from "@/types/book";
import type { Merch } from "@/types/merch";

import aspects from "./art-aspects.json";

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
 * Proportions come from `art-aspects.json`, which `pnpm covers` measures off
 * the files. A picture's shape is a fact about the picture, so it is read
 * rather than authored: the catalogue's own `coverAspect`/`spineAspect` are
 * the reservation for a title whose art has not arrived yet, and the file
 * overrules them the moment it does. A number that disagreed with its picture
 * used to fail in silence — a spine trimmed at both ends, a shirt adrift in
 * its box — because nothing compares the two.
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
 * Widest a picture can be and still be a spine.
 *
 * A book seen edge-on is many times taller than it is wide; the widest real
 * one here is 0.18. Anything approaching square is not a spine that was
 * photographed badly, it is the wrong file — most often a screenshot with the
 * spine adrift in a field of white. Trusting it would be worse than ignoring
 * it, because the shelf now sizes a closed book from this: a ratio of 1.88
 * asks for a spine 891px wide, three times the open cover beside it.
 */
const MAX_SPINE_ASPECT = 0.5;

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

/**
 * What shape the file on disk actually is, falling back to what the catalogue
 * reserved for it.
 */
function aspectOf(stem: string, dir: "covers" | "merch", fallback: number) {
  const folder: Record<string, number> = aspects[dir] ?? {};
  return folder[stem] ?? fallback;
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

  /*
   * Which file the cover is drawn from.
   *
   * Normally the book's own slug. A title whose cover isn't finished points at
   * its entry image instead, so the unready art is not on the shelf, under the
   * cursor, on its page or in a link preview — one flag rather than four
   * call sites remembering to swap it.
   */
  const coverStem = book.coverPending ? `${book.slug}.detail` : book.slug;

  // An explicit entry in the catalogue always wins over what's on disk.
  if (!resolved.cover) {
    const file = findFile(coverStem);
    if (file) {
      // The measured shape is written back onto the book, not just onto the
      // image: the shelf sizes an open cover by `coverAspect`, and the entry
      // reserves its box with it, so the two must be the same number.
      resolved.coverAspect = aspectOf(coverStem, "covers", book.coverAspect ?? 0.66);
      resolved.cover = toImageRef(file, resolved.coverAspect);
    }
  }

  // `<slug>.spine.<ext>` — how the book stands closed on the shelf. Optional:
  // without it the shelf falls back to showing the cover face-out.
  if (!resolved.spineImage) {
    // A borrowed picture is named by the catalogue; otherwise it's the file
    // beside the cover.
    const borrowed = Boolean(book.spineFrom);
    const stem = book.spineFrom ?? `${book.slug}.spine`;
    const file = findFile(stem);
    const measured = file ? aspectOf(stem, "covers", book.spineAspect ?? 0.2) : 0;

    // The too-square check is for art that was *meant* to be a spine. A
    // borrowed picture is square on purpose — being cropped is the point —
    // so it is exempt.
    if (file && !borrowed && measured > MAX_SPINE_ASPECT) {
      // Said out loud rather than quietly corrected: the file needs cropping,
      // and only whoever exported it can do that. Meanwhile the title keeps
      // the plain colour spine it had before the art arrived.
      console.warn(
        `[covers] ${file} is ${measured} wide ÷ tall — too square to be a spine. ` +
          `Ignoring it; crop the artwork to the spine and run \`pnpm covers\`.`,
      );
    } else if (file) {
      // Real spine art defines its own width, so it is never cropped. A
      // borrowed picture keeps the shape the catalogue asked for and is
      // cropped to it — that is the whole arrangement.
      resolved.spineAspect = borrowed ? (book.spineAspect ?? 0.2) : measured;
      // The image still declares its true proportion, whatever the box does
      // with it, or the browser would pick the wrong source width for it.
      resolved.spineImage = toImageRef(file, measured);
    }
  }

  // `<slug>.detail.<ext>` — the entry's own image. Optional: without it the
  // entry shows the cover, which is the usual case.
  if (!resolved.detailImage) {
    const file = findFile(`${book.slug}.detail`);
    if (file) {
      resolved.detailImage = toImageRef(
        file,
        aspectOf(`${book.slug}.detail`, "covers", resolved.coverAspect ?? 0.66),
      );
    }
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
  // Follows `coverPending` too. This is the one place the art would travel
  // beyond the site — scraped once and cached by whoever scraped it — so a
  // cover that isn't ready must not reach it.
  const stem = book.coverPending ? `${book.slug}.detail` : book.slug;

  for (const ext of ["jpg", "jpeg", "png"]) {
    const file = `${stem}.${ext}`;
    if (existsSync(path.join(COVERS_DIR, file))) return `/covers/${file}`;
  }
  return undefined;
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

  // `MerchSection` reserves the box with `imageAspect` and draws the photo
  // `object-contain`, so a stale number leaves the shirt floating in a band of
  // empty page rather than cropping — quieter, and just as wrong.
  const imageAspect = aspectOf(item.slug, "merch", item.imageAspect ?? 1);

  return {
    ...item,
    imageAspect,
    image: toImageRef(file, imageAspect, "merch"),
  };
}

export function attachMerchArtAll(items: Merch[]): Merch[] {
  return items.map(attachMerchArt);
}
