-- Shipping on each order: which method the buyer chose and what it cost.
--
-- Rates depend on the destination and are managed as shipping rates in the
-- Stripe dashboard (see `src/features/checkout/shipping.ts`).
-- `amount_total` already includes the shipping; `shipping_cost` says how much
-- of it was shipping, and `shipping_method` says how to post the parcel.

alter table public.orders
  add column shipping_method text,
  add column shipping_cost   integer;

comment on column public.orders.shipping_method is
  'Name of the Stripe shipping rate chosen, e.g. Envío certificado nacional. Null for orders placed before shipping was charged.';
comment on column public.orders.shipping_cost is
  'Shipping paid, in cents. Included in amount_total.';

drop function if exists public.record_order(text, text, text, text, jsonb, jsonb, integer, text, uuid);

create function public.record_order(
  p_stripe_session_id text,
  p_email             text,
  p_phone             text,
  p_shipping_name     text,
  p_shipping_address  jsonb,
  p_items             jsonb,
  p_amount_total      integer,
  p_currency          text,
  p_reservation       uuid default null,
  p_shipping_method   text default null,
  p_shipping_cost     integer default null
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
    items, amount_total, currency, reservation, shipping_method, shipping_cost
  ) values (
    p_stripe_session_id, p_email, p_phone, p_shipping_name, p_shipping_address,
    p_items, p_amount_total, p_currency, p_reservation, p_shipping_method,
    p_shipping_cost
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

revoke all on function public.record_order(text, text, text, text, jsonb, jsonb, integer, text, uuid, text, integer) from public, anon, authenticated;
