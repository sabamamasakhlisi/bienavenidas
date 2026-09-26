# covers

Cover art, one file per title, **named after the book's `slug`** in
`src/features/catalog/catalog.ts`.

```
joven-chica.jpg
witches-used-to-rule-the-web.jpg
open-call-sad-girls.jpg
```

Drop a file in and it appears everywhere that title's cover is drawn — the
shelf, the pointer follower, the quote sections, the detail page. No code
change: `src/features/catalog/covers.ts` looks the slug up on disk, and a title
with no file falls back to a tinted placeholder rather than a broken image.

`avif` → `webp` → `jpg` → `jpeg` → `png` is the lookup order, so a generated
AVIF wins over the original you dropped in.

After adding an original, run:

```bash
pnpm covers
```

which writes optimized `.avif` / `.webp` siblings next to it.

Proportions live in the catalogue as `coverAspect` (width ÷ height). Set it to
match the artwork or the cover will be cropped by `object-cover`.
