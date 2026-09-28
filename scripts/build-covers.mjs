/**
 * Derives web formats for every cover in public/covers/ and public/merch/,
 * and records what shape each picture actually is.
 *
 *   pnpm covers
 *
 * Takes each original (jpg/jpeg/png) and writes .avif and .webp siblings.
 * covers.ts prefers those, so the originals stay as the archive copy.
 *
 * It also writes `src/features/catalog/art-aspects.json`, measured from the
 * files themselves. Proportions used to be typed into the catalogue by hand,
 * and a hand-typed number that disagrees with its picture fails silently:
 * `object-cover` trims the ends off a spine, `object-contain` floats a shirt
 * in dead space, and nothing anywhere says so. Measuring is the only way the
 * two cannot drift.
 *
 * Same encoder settings as the poster: 4:4:4 chroma, because cover art is
 * mostly type and flat colour, which is what chroma subsampling damages first.
 */
import { readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";

import sharp from "sharp";

/**
 * Each source folder with the widest the art is ever drawn, doubled for HiDPI
 * screens. Covers top out around 310 CSS px; a merch photo runs to 520.
 */
const SOURCES = [
  { dir: "public/covers", maxWidth: 700 },
  { dir: "public/merch", maxWidth: 1100 },
];

sharp.cache(false);

/** Sources are the lossless drops; .avif/.webp are what this script writes. */
const ORIGINALS = /\.(jpe?g|png)$/i;

/** Anything worth measuring, whether this script made it or not. */
const IMAGES = /\.(jpe?g|png|webp|avif)$/i;

/**
 * The copy link previews get.
 *
 * WhatsApp, Facebook, Slack and most other scrapers read neither AVIF nor
 * WebP, and several ignore an image they cannot decode rather than falling
 * back — which is how a book ends up sharing as the site's generic card. So
 * every cover keeps a plain JPEG beside it, written here.
 *
 * Suffixed rather than plain `.jpg` so the next run cannot mistake it for an
 * original and re-encode the whole chain from it.
 */
const SHARE = ".share.jpg";

/** Where the measurements land, relative to the repository root. */
const MANIFEST = "src/features/catalog/art-aspects.json";

/** stem -> width ÷ height, per folder. */
const aspects = {};

let shared = 0;

const kb = async (f) => Math.round((await stat(f)).size / 1024) + " KB";

for (const { dir, maxWidth } of SOURCES) {
  const all = await readdir(dir);
  const files = all.filter((f) => ORIGINALS.test(f) && !f.endsWith(SHARE));

  /*
   * Measure every picture in the folder, not only the ones converted below.
   * A stem that arrived as a .webp is never a conversion source, but the
   * catalogue still has to know its shape — and without this it would be the
   * one entry silently missing from the manifest.
   *
   * The original wins where there is one: the derived copies are resized, and
   * a rounded pixel count is a slightly rounded ratio.
   */
  const folder = path.basename(dir);
  aspects[folder] ??= {};
  const measured = new Set();

  for (const file of [
    ...files,
    ...all.filter((f) => IMAGES.test(f) && !f.endsWith(SHARE)),
  ]) {
    const stem = file.replace(IMAGES, "");
    if (measured.has(stem)) continue;
    measured.add(stem);
    const source = path.join(dir, file);
    const { width, height } = await sharp(source, {
      limitInputPixels: false,
    }).metadata();
    if (width && height) {
      aspects[folder][stem] = Number((width / height).toFixed(4));
    }

    // Only the faces a link preview can show: the cover itself, and the entry
    // image that stands in for one while the cover is unfinished. A spine is
    // a 60px strip — nothing to put on a card.
    if (folder === "covers" && !stem.endsWith(".spine")) {
      await sharp(source, { limitInputPixels: false })
        .resize({ width: maxWidth, withoutEnlargement: true })
        // Flattened onto the page's own ground: a transparent PNG turns black
        // in a JPEG, and a black rectangle is a worse card than no card.
        .flatten({ background: "#221e1f" })
        .jpeg({ quality: 82, mozjpeg: true })
        .toFile(path.join(dir, `${stem}${SHARE}`));
      shared += 1;
    }
  }

  if (files.length === 0) {
    console.log(`No originals in ${dir}/ — nothing to convert.`);
    continue;
  }

  for (const file of files) {
    const slug = file.replace(ORIGINALS, "");
    const src = path.join(dir, file);

    const base = () =>
      sharp(src, { limitInputPixels: false }).resize({
        width: maxWidth,
        withoutEnlargement: true,
      });

    const avif = path.join(dir, `${slug}.avif`);
    const webp = path.join(dir, `${slug}.webp`);

    await base()
      .avif({ quality: 62, effort: 4, chromaSubsampling: "4:4:4" })
      .toFile(avif);
    await base().webp({ quality: 80, effort: 5 }).toFile(webp);

    const { width, height } = await sharp(src, {
      limitInputPixels: false,
    }).metadata();

    console.log(
      `${dir}/${slug}\n` +
        `  source ${width}x${height} (${await kb(src)})  aspect ${(
          width / height
        ).toFixed(3)}\n` +
        `  avif   ${await kb(avif)}\n` +
        `  webp   ${await kb(webp)}`,
    );
  }
}

await writeFile(
  MANIFEST,
  `${JSON.stringify(aspects, null, 2)}\n`,
  "utf8",
);

const total = Object.values(aspects).reduce(
  (sum, folder) => sum + Object.keys(folder).length,
  0,
);
console.log(`\n${MANIFEST}: ${total} measured`);
console.log(`${SHARE} written for ${shared} covers (link previews)`);
