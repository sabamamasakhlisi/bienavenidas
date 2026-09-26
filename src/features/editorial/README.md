# editorial

The publishing-house side: articles, the manifesto and author profiles.

Backs `/bienvenidas` and any future long-form or essay routes. Author data is
shared with the catalogue through the `Author` type in `@/types/book` rather
than through a cross-feature import.

**Boundary:** may import from `@/components/ui`, `@/types` and `@/i18n`.
Must not import from `catalog` or `checkout`.
