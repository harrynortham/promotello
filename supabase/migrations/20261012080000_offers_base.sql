-- The original offers table, created before migrations were tracked.
-- 20261012100000_extend_offers_for_businesses.sql builds on it.
create table if not exists public.offers (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  category text not null,
  discount text not null,
  title text not null,
  description text not null,
  availability text not null,
  expires_at date not null,
  terms text not null,
  created_at timestamptz not null default now()
);

alter table public.offers enable row level security;
