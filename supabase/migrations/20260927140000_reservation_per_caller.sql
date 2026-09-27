-- At most two stock holds per visitor.
--
-- Opening checkout holds copies for about 40 minutes, and anyone can open
-- checkout. Without a limit, a script could keep every copy on hold: the shelf
-- says in stock, and every real customer is told it's sold out.
--
-- A hold now records who asked for it (a hash of their IP address, never the
-- address itself), and a visitor starting a new checkout gives up their
-- oldest hold beyond the second. A real customer who goes back and retries
-- never notices; a script gets two carts' worth of copies per address, not
-- the whole shelf. The evicted checkout can still be paid: the order is saved
-- and, if the copy went to someone else meanwhile, flagged `oversold`.

alter table public.stock_reservations
  add column if not exists caller text;

create index if not exists stock_reservations_caller
  on public.stock_reservations (caller, created_at desc)
  where caller is not null;

drop function if exists public.reserve_stock(uuid, jsonb, timestamptz);

create function public.reserve_stock(
  p_reference   uuid,
  p_items       jsonb,
  p_expires_at  timestamptz,
  p_caller      text default null
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

  -- Keep this visitor's newest hold, drop the rest, so the one about to be
  -- taken makes two. Before the stock check, so their own older holds don't
  -- count against them.
  if p_caller is not null then
    delete from stock_reservations
     where caller = p_caller
       and reference not in (
         select r.reference
           from stock_reservations r
          where r.caller = p_caller
          group by r.reference
          order by max(r.created_at) desc
          limit 1
       );
  end if;

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
    insert into stock_reservations (reference, slug, quantity, expires_at, caller)
    select p_reference, e->>'slug', (e->>'quantity')::integer, p_expires_at, p_caller
      from jsonb_array_elements(p_items) e
      join stock s on s.slug = e->>'slug';
  end if;
end;
$$;

revoke all on function public.reserve_stock(uuid, jsonb, timestamptz, text) from public, anon, authenticated;
