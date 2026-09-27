# merch

Product photography, one file per item, **named after the item's `slug`** in
`src/features/catalog/merch.ts`.

```
camiseta-me-hirieron.png
```

Same contract as `public/covers/`: drop a file in and it appears, no code
change. `avif` → `webp` → `jpg` → `jpeg` → `png` is the lookup order, so a
generated AVIF wins over the original you dropped in. Without a file the
section still lays out at the right proportion and shows a tinted plate.

One item, one photo — sizes share it. A size that needs its own picture is a
separate item, not a variant.

After adding an original, run:

```bash
pnpm covers
```

Proportions live in the catalogue as `imageAspect` (width ÷ height). Merch is
drawn with `object-contain`, so a mismatch letterboxes rather than crops —
but the reserved box will be the wrong shape until the number matches.

**Photograph on a transparent background.** The page is near-black; a shirt
photographed on white arrives as a white slab. A cut-out PNG (or AVIF/WebP
with alpha) is what the design assumes.
