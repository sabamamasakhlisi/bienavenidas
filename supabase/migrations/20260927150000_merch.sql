-- Merch, in the stock table alongside the books.
--
-- No new table and no new column: everything downstream of a sale is keyed by
-- slug — this table's primary key, the Stripe lookup key, the cart line, the
-- order record, and the decrement in `record_order` — and none of it cares
-- what the slug names. A t-shirt is a slug; so is each of its sizes.
--
-- Sizes are separate rows rather than one row with a size column, because a
-- size is a separate thing to sell: baby tee runs out while XL is still on the
-- shelf, and only separate rows can say so. It also means the existing stock
-- check, the sold-out guard and `record_order` need no changes at all.
--
-- The trade-off, stated plainly: two rows are two independent counters. An
-- edition capped at 20 *across* both sizes cannot be expressed here — these
-- are 20 of each. Change the numbers if the edition is meant to be shared.

insert into public.stock (slug, quantity, price) values
  ('camiseta-me-hirieron-baby-tee', 20, 20),
  ('camiseta-me-hirieron-xl',       20, 20)
on conflict (slug) do nothing;
