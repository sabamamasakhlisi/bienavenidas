# Bienavenidas

Website for the Bienavenidas publishing house: the catalogue of books, an
editorial poster, contact details, and (in progress) an online shop.

Built with Next.js 16 (App Router), React 19, Tailwind CSS 4 and next-intl, and
deployed on Vercel.

> This Next.js version has breaking changes from older releases. Before writing
> code, read the relevant guide in `node_modules/next/dist/docs/` (see
> `AGENTS.md`).

## Getting started

Requires Node 20+ and pnpm (the version is pinned in `package.json`).

```bash
pnpm install
pnpm dev      # http://localhost:3000
pnpm lint
pnpm build
```

## Pages

| Route             | What it shows                                        |
| ----------------- | ---------------------------------------------------- |
| `/`               | The book shelf (front page)                          |
| `/libros`         | Same shelf; its canonical URL points to `/`          |
| `/libros/[slug]`  | A single book with its reader and add-to-cart button |
| `/bienvenidas`    | The bienvenidas poster, pannable at full size        |
| `/contacto`       | Contact details and social links                     |

## Languages

The site is bilingual, Spanish (default) and English. The locale lives in the
`NEXT_LOCALE` cookie, never in the URL, so every page has one address for both
languages. On a first visit `src/proxy.ts` picks a locale from the browser's
`Accept-Language` header (falling back to the visitor's country) and stores it.
Strings are in `src/messages/es.json` and `src/messages/en.json`.

## Project layout

```
src/
  app/          routes (see the table above)
  components/   header, navigation, language selector, shared UI
  features/
    catalog/    book data (catalog.ts), covers, shelf and reader
    checkout/   cart state
    editorial/  the pannable poster
  i18n/         locale config and next-intl request setup
  messages/     translations
public/         logos, fonts, covers, poster
scripts/        image build scripts
```

Each folder under `src/features/` has its own README with more detail.

## Images

Covers and the poster are served as AVIF and WebP with a JPEG/PNG fallback.

- `pnpm covers` writes `.avif` and `.webp` versions of every original in
  `public/covers/`. Add a new cover as a `.png` or `.jpg` there and rerun it.
- `pnpm poster` downsizes the full-resolution poster export (about 124 MB, kept
  out of the repo) and writes `public/poster_bienavenidas_lowres.*`. Put the
  export at `public/poster_bienavenidas.jpg` first, then rename the three
  outputs over `public/poster_bienavenidas.*`, which is what the page serves.

## Search engines

The root layout sets `metadataBase` so canonical links are absolute. It uses
`NEXT_PUBLIC_SITE_URL` if set, otherwise Vercel's production domain
(`VERCEL_PROJECT_PRODUCTION_URL`). Set `NEXT_PUBLIC_SITE_URL` in Vercel if the
public domain ever differs from the one Vercel reports.

## Deployment

Pushes deploy to Vercel; every pull request gets a preview deployment. Merging
to `master` publishes the live site.

## Licences

Font licences are in `licenses/`.
