-- Price per title, alongside the stock count.
--
-- The column was added by hand in the dashboard before any migration covered
-- it, so it is created conditionally: this records it in the history and makes
-- a fresh database match the live one.
alter table public.stock
  add column if not exists price numeric(10,2) not null default 0;

comment on column public.stock.price is
  'Unit price in euros, written the way you would say it: 17 for EUR 17.00, 16.50 for EUR 16.50. This is the column to edit. 0 means not priced here, and the catalogue price stands.';

-- What the app and Stripe actually charge. Derived, so it can never disagree
-- with the price above, and read-only through the API.
alter table public.stock
  drop column if exists price_cents;

alter table public.stock
  add column price_cents bigint
  generated always as (round(price * 100)::bigint) stored;

comment on column public.stock.price_cents is
  'Derived from price - do not edit. Minor units, which is what Stripe charges and what orders.amount_total records.';

alter table public.stock
  drop constraint if exists stock_price_sane;

alter table public.stock
  add constraint stock_price_sane check (price >= 0 and price < 100000);
