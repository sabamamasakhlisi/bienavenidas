-- Holding copies while a customer pays.
--
-- Without this, stock is checked when checkout opens but only decremented once
-- Stripe confirms payment, so two people can both reach Stripe's page for the
-- last copy and both pay. Now opening checkout reserves the copies for as long
-- as the Stripe session can be paid (the app sets that to ~30 minutes), and a
-- second customer is turned away at the site while the first one pays.
--
-- A reservation ends one of three ways: the order is recorded (the copies come
-- off `stock` for good), Stripe reports the session expired, or its time runs
-- out on its own. Expired rows are ignored everywhere, so a missed webhook can
-- delay nothing for longer than the hold itself.

create table public.stock_reservations (
  id          uuid primary key default gen_random_uuid(),
  -- One per checkout attempt; also stored on the Stripe session's metadata.
  reference   uuid not null,
  slug        text not null references public.stock (slug) on delete cascade,
  quantity    integer not null check (quantity > 0),
  expires_at  timestamptz not null,
  created_at  timestamptz not null default now()
);

create index stock_reservations_slug_expires on public.stock_reservations (slug, expires_at);
create index stock_reservations_reference on public.stock_reservations (reference);

alter table public.stock_reservations enable row level security;

-- The rare case this can't prevent: a payment that lands after its hold ran
-- out and someone else took the copy (a slow bank transfer, say). The order is
-- still recorded, because the money has been taken, and flagged here so it can
-- be refunded or sent later.
alter table public.orders
  add column if not exists reservation uuid,
  add column if not exists oversold boolean not null default false;

comment on column public.orders.oversold is
  'True when this order took stock below zero: it was paid for but there was no copy left. Refund it in Stripe or tell the customer when it will ship.';

-- Reserves every tracked line of a cart, or none of them.
-- Returns the lines that are short (slug and how many are actually free); an
-- empty result means the copies are now held under p_reference.
create function public.reserve_stock(
  p_reference   uuid,
  p_items       jsonb,
  p_expires_at  timestamptz
) returns table (short_slug text, short_available integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  item  jsonb;
  free  integer;
  short boolean := false;
begin
  delete from stock_reservations where expires_at <= now();

  -- Lock the rows in a fixed order so two checkouts for overlapping carts
  -- queue behind each other instead of deadlocking.
  perform 1
     from stock s
    where s.slug in (select e->>'slug' from jsonb_array_elements(p_items) e)
    order by s.slug
      for update;

  for item in select * from jsonb_array_elements(p_items) loop
    select s.quantity - coalesce((
             select sum(r.quantity)
               from stock_reservations r
              where r.slug = s.slug and r.expires_at > now()
           ), 0)
      into free
      from stock s
     where s.slug = item->>'slug';

    -- No row: the title isn't stock-tracked, and nothing is held for it.
    if found and free < (item->>'quantity')::integer then
      short := true;
      short_slug := item->>'slug';
      short_available := greatest(free, 0);
      return next;
    end if;
  end loop;

  if not short then
    insert into stock_reservations (reference, slug, quantity, expires_at)
    select p_reference, e->>'slug', (e->>'quantity')::integer, p_expires_at
      from jsonb_array_elements(p_items) e
      join stock s on s.slug = e->>'slug';
  end if;
end;
$$;

-- Lets the copies go: the Stripe session expired, or it could not be created.
create function public.release_stock(p_reference uuid) returns void
language sql
security definer
set search_path = public
as $$
  delete from stock_reservations where reference = p_reference;
$$;

-- `record_order` gains the reservation it settles and the oversell flag.
drop function if exists public.record_order(text, text, text, text, jsonb, jsonb, integer, text);

create function public.record_order(
  p_stripe_session_id text,
  p_email             text,
  p_phone             text,
  p_shipping_name     text,
  p_shipping_address  jsonb,
  p_items             jsonb,
  p_amount_total      integer,
  p_currency          text,
  p_reservation       uuid default null
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  item     jsonb;
  oversold boolean := false;
  left_on  integer;
begin
  insert into orders (
    stripe_session_id, email, phone, shipping_name, shipping_address,
    items, amount_total, currency, reservation
  ) values (
    p_stripe_session_id, p_email, p_phone, p_shipping_name, p_shipping_address,
    p_items, p_amount_total, p_currency, p_reservation
  )
  on conflict (stripe_session_id) do nothing;

  if not found then
    return false;
  end if;

  -- The hold becomes the sale: drop it before taking the copies off the shelf.
  if p_reservation is not null then
    delete from stock_reservations where reference = p_reservation;
  end if;

  for item in select * from jsonb_array_elements(p_items) loop
    update stock
       set quantity = quantity - (item->>'quantity')::integer,
           updated_at = now()
     where slug = item->>'slug'
    returning quantity into left_on;

    if found and left_on < 0 then
      oversold := true;
    end if;
  end loop;

  if oversold then
    update orders set oversold = true where stripe_session_id = p_stripe_session_id;
  end if;

  return true;
end;
$$;

revoke all on function public.reserve_stock(uuid, jsonb, timestamptz) from public, anon, authenticated;
revoke all on function public.release_stock(uuid) from public, anon, authenticated;
revoke all on function public.record_order(text, text, text, text, jsonb, jsonb, integer, text, uuid) from public, anon, authenticated;
