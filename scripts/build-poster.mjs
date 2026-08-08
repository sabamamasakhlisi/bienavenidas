/**
 * Derives the web versions of the bienvenidas poster.
 *
 * The source is a ~124 MB, 15709 × 22241 export that must never be served to a
 * browser. This produces three encodes of it at the size the page renders.
 *
 *   pnpm poster
 */
import { stat } from "node:fs/promises";

import sharp from "sharp";

const SOURCE = "public/poster_bienavenidas_low.jpg";
const OUT = "public/poster_bienavenidas";

/** Rendered width on the page. Panning shows it 1:1, so this is the real size. */
const WIDTH = 2966;

sharp.cache(false);

const mb = async (file) => ((await stat(file)).size / 1048576).toFixed(2) + " MB";

const source = () =>
  // The source exceeds sharp's default pixel guard, which exists to stop
  // decompression bombs — this file is ours, so the guard is not helping.
  sharp(SOURCE, { limitInputPixels: false }).resize({
    width: WIDTH,
    withoutEnlargement: true,
  });

const encodes = [
  // 4:4:4 rather than the usual 4:2:0: it keeps the poster's hairline rules
  // and small type from smearing, which is what chroma subsampling damages
  // first. Measured against an uncompressed reference at this size, q65 gives
  // 37.4 dB for 1.22 MB — the knee of the curve. q80 (2.38 MB) and q90
  // (4.03 MB) buy diminishing returns; lossless is 20.9 MB.
  ["avif", (img) => img.avif({ quality: 65, effort: 4, chromaSubsampling: "4:4:4" })],
  // Raised to sit near the AVIF's fidelity, so a browser that falls back
  // doesn't visibly get the worse picture. They are simply less efficient.
  ["webp", (img) => img.webp({ quality: 82, effort: 5 })],
  ["jpg", (img) => img.jpeg({ quality: 84, progressive: true, mozjpeg: true })],
];

console.log(`source ${SOURCE} — ${await mb(SOURCE)}`);

for (const [ext, encode] of encodes) {
  const file = `${OUT}.${ext}`;
  await encode(source()).toFile(file);
  console.log(`  ${ext.padEnd(5)} ${await mb(file)}`);
}

