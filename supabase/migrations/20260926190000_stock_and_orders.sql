-- Stock and orders for the shop.
--
-- Stripe takes the payment; this database is the shop's own record of what is
-- left on the shelf and where each paid order has to go. Only the server talks
-- to it, with the service-role key: RLS is on and no policy is granted, so the
-- public anon key can read or write nothing here.

-- Copies on hand per title. `slug` matches `/libros/[slug]`.
-- A title with no row here is not stock-tracked and sells freely.
create table public.stock (
  slug        text primary key,
  quantity    integer not null default 0,
  updated_at  timestamptz not null default now()
);

comment on column public.stock.quantity is
  'Copies on hand. Goes negative only if two customers pay for the last copy at the same moment: that is an oversell to resolve by hand.';

create type public.order_status as enum ('paid', 'shipped', 'delivered', 'cancelled');

-- One row per paid Stripe Checkout session, with everything needed to ship it.
create table public.orders (
  id                 uuid primary key default gen_random_uuid(),
  stripe_session_id  text not null unique,
  status             public.order_status not null default 'paid',
  email              text,
  phone              text,
  -- Name and address exactly as the customer typed them into Stripe.
  shipping_name      text,
  shipping_address   jsonb,
  -- [{ "slug": "...", "isbn": "...", "title": "...", "quantity": 1, "amount": 1600 }]
  items              jsonb not null,
  amount_total       integer not null,
  currency           text not null,
  tracking_number    text,
  notes              text,
  created_at         timestamptz not null default now(),
  shipped_at         timestamptz
);

create index orders_status_created_at on public.orders (status, created_at desc);

alter table public.stock  enable row level security;
alter table public.orders enable row level security;

-- Records a paid order and takes its copies off the shelf, in one transaction.
-- Stripe retries webhooks, so a session already recorded is a no-op: stock is
-- never decremented twice for the same payment. Returns false for a repeat.
create function public.record_order(
  p_stripe_session_id text,
  p_email             text,
  p_phone             text,
  p_shipping_name     text,
  p_shipping_address  jsonb,
  p_items             jsonb,
  p_amount_total      integer,
  p_currency          text
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  item jsonb;
begin
  insert into orders (
    stripe_session_id, email, phone, shipping_name, shipping_address,
    items, amount_total, currency
  ) values (
    p_stripe_session_id, p_email, p_phone, p_shipping_name, p_shipping_address,
    p_items, p_amount_total, p_currency
  )
  on conflict (stripe_session_id) do nothing;

  if not found then
    return false;
  end if;

  for item in select * from jsonb_array_elements(p_items) loop
    update stock
       set quantity = quantity - (item->>'quantity')::integer,
           updated_at = now()
     where slug = item->>'slug';
  end loop;

  return true;
end;
$$;

revoke all on function public.record_order from public, anon, authenticated;

-- Starting stock. Replace these numbers with the real counts.
insert into public.stock (slug, quantity) values
  ('joven-chica', 0),
  ('witches-used-to-rule-the-web', 0);
