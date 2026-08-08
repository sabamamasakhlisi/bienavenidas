/**
 * Derives web formats for every cover in public/covers/.
 *
 *   pnpm covers
 *
 * Takes each original (jpg/jpeg/png) and writes .avif and .webp siblings.
 * covers.ts prefers those, so the originals stay as the archive copy.
 *
 * Same encoder settings as the poster: 4:4:4 chroma, because cover art is
 * mostly type and flat colour, which is what chroma subsampling damages first.
 */
import { readdir, stat } from "node:fs/promises";
import path from "node:path";

import sharp from "sharp";

const DIR = "public/covers";

/** Covers are never drawn wider than ~310 CSS px; 2× covers HiDPI screens. */
const MAX_WIDTH = 700;

sharp.cache(false);

const ORIGINALS = /\.(jpe?g|png)$/i;

const files = (await readdir(DIR)).filter((f) => ORIGINALS.test(f));

if (files.length === 0) {
  console.log(`No originals in ${DIR}/ — nothing to do.`);
  console.log("Add e.g. joven-chica.jpg (named after the book's slug).");
}

const kb = async (f) => Math.round((await stat(f)).size / 1024) + " KB";

for (const file of files) {
  const slug = file.replace(ORIGINALS, "");
  const src = path.join(DIR, file);

  const base = () =>
    sharp(src, { limitInputPixels: false }).resize({
      width: MAX_WIDTH,
      withoutEnlargement: true,
    });

  const avif = path.join(DIR, `${slug}.avif`);
  const webp = path.join(DIR, `${slug}.webp`);

  await base().avif({ quality: 62, effort: 4, chromaSubsampling: "4:4:4" }).toFile(avif);
  await base().webp({ quality: 80, effort: 5 }).toFile(webp);

  const { width, height } = await sharp(src, { limitInputPixels: false }).metadata();

  console.log(
    `${slug}\n` +
      `  source ${width}x${height} (${await kb(src)})  aspect ${(width / height).toFixed(3)}\n` +
      `  avif   ${await kb(avif)}\n` +
      `  webp   ${await kb(webp)}`,
  );
}
