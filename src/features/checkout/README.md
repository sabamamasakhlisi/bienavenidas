# checkout

Cart, shipping and payment integration.

Nothing is implemented yet. When it is, it builds on the `Price` type in
`@/types/book`, which stores amounts as integer minor units — keep money in
minor units end to end and never round through floats.

**Boundary:** may import from `@/components/ui`, `@/types` and `@/i18n`.
Must not import from `catalog` or `editorial`; a cart holds slugs and ISBNs, and
resolves them through a shared data layer rather than reaching into another
feature.
