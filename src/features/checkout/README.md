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
| `STRIPE_WEBHOOK_SECRET` | Verifying the webhook. Register `https://<site>/api/stripe/webhook` for `checkout.session.completed` and `checkout.session.async_payment_succeeded`. Without it every delivery is rejected as an invalid signature — orders are not saved and stock is not decremented, with nothing to see on the site. |
| `SUPABASE_URL`, `SUPABASE_SECRET_KEY` | Stock, prices and recording orders. Without them checkout skips the stock check and falls back to catalogue prices. Projects older than 2025 name the key `SUPABASE_SERVICE_ROLE_KEY`; either is read. |
| `SITE_URL` | Optional. Base URL for Stripe's return links; defaults to the request's host. |

Set these in `.env.local`, which is gitignored.

## Linking books to the Stripe product catalogue

A book is linked to a Stripe product when one of that product's prices has the
book's slug (the last part of `/libros/<slug>`) as its **lookup key**. Checkout
then charges that Stripe price instead of the site's, and orders read the slug
back from it. Lookup keys are yours, not Stripe's, so the same link works in
test and live mode.

Price has three sources, each overriding the one before it:

1. `catalog.ts` — the static price in the repository.
2. `stock.price` in Supabase — the euros you edit in the dashboard.
3. A linked Stripe price — and this one is not a preference: a line sent to
   Stripe as a price ID is charged at Stripe's amount whatever we send beside
   it.

So a book priced in exactly one of those is charged from that place. Where a
linked Stripe price disagrees with the price the page quoted, checkout charges
Stripe's and logs the difference — keep them equal, or the customer is charged
something other than what they were shown.

## Webhooks while developing

Stripe cannot reach `localhost`, so a local checkout completes at Stripe and
nothing tells the app: the payment succeeds, no order is written, and stock
never moves. Nothing logs an error, because nothing was ever called.

Bridge it with the Stripe CLI, and leave it running for as long as you are
testing payments:

```
stripe listen \
  --events checkout.session.completed,checkout.session.async_payment_succeeded \
  --forward-to localhost:3000/api/stripe/webhook
```

It prints a `whsec_…` signing secret — put that in `STRIPE_WEBHOOK_SECRET` and
restart the dev server. That secret belongs to the listener: it changes when
you start a new one, and it is not the one from the dashboard.

A checkout that happened while nothing was listening is not lost. Find its
event and send it again:

```
stripe events list --type checkout.session.completed --limit 5
stripe events resend <evt_…>
```

Recording is idempotent, so replaying an event that was already recorded
changes nothing — a retry cannot decrement stock twice.

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
