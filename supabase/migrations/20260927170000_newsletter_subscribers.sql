-- The newsletter list.
--
-- The live table was created by hand before this file existed; this records it
-- exactly as it stands, so a database built from the repo has it too. Every
-- statement is guarded, so running it against the live project changes nothing.
--
-- One row per address, lower-cased, so a repeat sign-up is an upsert rather
-- than a duplicate. Unsubscribing sets `unsubscribed_at` instead of deleting,
-- so a later sign-up can revive the row and keep its original date.
--
-- Row level security with no policies: only the server's secret key can read
-- or write it. The list is personal data and the public key must see nothing.

create table if not exists public.newsletter_subscribers (
  email           text        primary key
                              check (email = lower(email) and email like '%_@_%.__%'),
  locale          text        not null default 'es'
                              check (locale in ('es', 'en')),
  created_at      timestamptz not null default now(),
  unsubscribed_at timestamptz
);

create index if not exists newsletter_subscribers_active
  on public.newsletter_subscribers (created_at desc)
  where unsubscribed_at is null;

alter table public.newsletter_subscribers enable row level security;
