/**
 * Derives web formats for every cover in public/covers/ and public/merch/.
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

const kb = async (f) => Math.round((await stat(f)).size / 1024) + " KB";

for (const { dir, maxWidth } of SOURCES) {
  const files = (await readdir(dir)).filter((f) => ORIGINALS.test(f));

  if (files.length === 0) {
    console.log(`No originals in ${dir}/ — nothing to do.`);
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
