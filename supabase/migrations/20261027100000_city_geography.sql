-- Showing visitors their own city. Each city gets a centre and radius, so a
-- visitor's approximate location (from their IP address, or their browser
-- if they allow it) can be matched to the nearest live city, plus its own
-- photos. Customers outside live cities can ask to be told when we launch.

alter table public.cities
  add column if not exists latitude double precision,
  add column if not exists longitude double precision,
  add column if not exists radius_km integer not null default 20 check (radius_km between 1 and 200),
  add column if not exists hero_image_url text,
  add column if not exists feature_image_url text;

update public.cities
set
  latitude = 51.4545,
  longitude = -2.5879,
  radius_km = 20,
  hero_image_url = coalesce(hero_image_url, '/images/home/hero.jpg'),
  feature_image_url = coalesce(feature_image_url, '/images/home/harbourside.jpg')
where slug = 'bristol' and latitude is null;

-- Customers who'd like Promotello in their town.
create table if not exists public.city_interest (
  id uuid primary key default gen_random_uuid(),
  email text not null check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' and char_length(email) <= 320),
  town text not null check (char_length(trim(town)) between 2 and 100),
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists city_interest_town_idx on public.city_interest (lower(town));

alter table public.city_interest enable row level security;

drop policy if exists city_interest_insert_anyone on public.city_interest;
drop policy if exists city_interest_select_admins on public.city_interest;

create policy city_interest_insert_anyone on public.city_interest
  for insert to anon, authenticated with check (true);

create policy city_interest_select_admins on public.city_interest
  for select to authenticated using (public.is_platform_admin());
