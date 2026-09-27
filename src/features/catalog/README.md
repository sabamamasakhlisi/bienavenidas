# catalog

The bookstore side: browsing, searching and presenting titles.

Owns the catalogue grid, filters, book cards and the data access behind
`/libros` and `/libros/[slug]`. `catalog.ts` is the current seam — it returns an
empty list until a real data source exists, which is why every book slug 404s
today.

**Boundary:** may import from `@/components/ui`, `@/types` and `@/i18n`.
Must not import from `editorial` or `checkout` — if two features need the same
thing, it belongs in `components/ui` or `types`.
