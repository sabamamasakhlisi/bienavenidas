# checkout

Cart, shipping and payment integration.

- `cart.tsx` — client cart, persisted in `localStorage` and kept in step
  across tabs. Lines copy the price at add time for display only.
- `CartView.tsx`, `CartLink.tsx`, `ClearCart.tsx` — the `/carrito` page body,
  the header link and the post-payment reset.
- `stripe.ts` — server-only Stripe Checkout (hosted payment page). Shipping
  addresses are collected for Spain and the EU; no shipping fee is charged yet.
- `inventory.ts` — server-only Supabase access: stock counts and the order
  book. Schema in `supabase/migrations/`.
- `src/app/api/stripe/webhook/` — Stripe calls it when a session is paid; it
  saves the order with the customer's delivery details and decrements stock,
  once per session even if Stripe retries.
- The route glue lives in `src/app/carrito/`: `actions.ts` re-prices every
  line from the catalogue and checks stock before creating the session, and `gracias/` is the
  return page.

Money stays in integer minor units end to end (`Price` in `@/types/book`) and is
only divided by 100 in `formatMoney`, for display.

## Configuration

| Variable | Needed for |
| --- | --- |
| `STRIPE_SECRET_KEY` | Creating and reading Checkout sessions. Without it the cart works and checkout says payment isn't live yet. |
| `STRIPE_WEBHOOK_SECRET` | Verifying the webhook. Register `https://<site>/api/stripe/webhook` for `checkout.session.completed` and `checkout.session.async_payment_succeeded`. |
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | Stock checks and recording orders. Without them checkout skips both. |
| `SITE_URL` | Optional. Base URL for Stripe's return links; defaults to the request's host. |

See `.env.example`.

## Running the shop in Supabase

- Apply `supabase/migrations/` (SQL editor, or `supabase db push`), then set
  the real counts in the `stock` table. It starts every title at 0, so nothing
  sells until you do. A title with no row isn't tracked and sells freely.
- New orders land in `orders` with status `paid`. Move them to `shipped`
  (and fill `tracking_number`, `shipped_at`) as you post them. Use a `sk_test_…` key until the shop is ready to take real
payments.

**Boundary:** may import from `@/components/ui`, `@/types` and `@/i18n`.
Must not import from `catalog` or `editorial`; a cart holds slugs and ISBNs, and
the app layer (`src/app/carrito/actions.ts`) resolves them against the
catalogue.
