-- Cities and areas. Promotello launches city by city (Bristol first), so a
-- business's location must be in a live city and in one of that city's
-- areas, with a postcode that belongs to the city. Businesses elsewhere can
-- join a waitlist instead.

create table if not exists public.cities (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null unique,
  -- Postcode districts (outward codes) that count as this city, e.g. BS7.
  postcode_districts text[] not null default '{}',
  is_live boolean not null default false,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.areas (
  id uuid primary key default gen_random_uuid(),
  city_id uuid not null references public.cities (id) on delete cascade,
  slug text not null check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  unique (city_id, slug),
  unique (city_id, name)
);

alter table public.cities enable row level security;
alter table public.areas enable row level security;

drop policy if exists cities_select_all on public.cities;
drop policy if exists cities_admin_write on public.cities;
drop policy if exists areas_select_all on public.areas;
drop policy if exists areas_admin_write on public.areas;

create policy cities_select_all on public.cities for select to anon, authenticated using (true);
create policy cities_admin_write on public.cities for all to authenticated
  using (public.is_platform_admin()) with check (public.is_platform_admin());

create policy areas_select_all on public.areas for select to anon, authenticated using (true);
create policy areas_admin_write on public.areas for all to authenticated
  using (public.is_platform_admin()) with check (public.is_platform_admin());

-- Bristol, live, with its neighbourhoods.
insert into public.cities (slug, name, postcode_districts, is_live)
values (
  'bristol',
  'Bristol',
  array['BS1','BS2','BS3','BS4','BS5','BS6','BS7','BS8','BS9','BS10','BS11','BS13','BS14','BS15','BS16'],
  true
)
on conflict (slug) do nothing;

insert into public.areas (city_id, slug, name)
select c.id, a.slug, a.name
from public.cities c
cross join (values
  ('bedminster', 'Bedminster'),
  ('bishopston', 'Bishopston'),
  ('brislington', 'Brislington'),
  ('city-centre', 'City Centre'),
  ('clifton', 'Clifton'),
  ('cotham', 'Cotham'),
  ('easton', 'Easton'),
  ('fishponds', 'Fishponds'),
  ('gloucester-road', 'Gloucester Road'),
  ('harbourside', 'Harbourside'),
  ('henleaze', 'Henleaze'),
  ('horfield', 'Horfield'),
  ('hotwells', 'Hotwells'),
  ('kingsdown', 'Kingsdown'),
  ('knowle', 'Knowle'),
  ('montpelier', 'Montpelier'),
  ('north-street', 'North Street'),
  ('old-market', 'Old Market'),
  ('redcliffe', 'Redcliffe'),
  ('redland', 'Redland'),
  ('southville', 'Southville'),
  ('st-george', 'St George'),
  ('st-pauls', 'St Pauls'),
  ('st-philips', 'St Philips'),
  ('st-werburghs', 'St Werburghs'),
  ('stokes-croft', 'Stokes Croft'),
  ('totterdown', 'Totterdown'),
  ('westbury-on-trym', 'Westbury-on-Trym'),
  ('windmill-hill', 'Windmill Hill')
) as a (slug, name)
where c.slug = 'bristol'
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- Locations belong to a city and an area
-- ---------------------------------------------------------------------------

alter table public.business_locations
  add column if not exists city_id uuid references public.cities (id),
  add column if not exists area_id uuid references public.areas (id);

create index if not exists business_locations_city_idx on public.business_locations (city_id);
create index if not exists business_locations_area_idx on public.business_locations (area_id);

-- Existing locations: all in Bristol; map their typed area to the list.
update public.business_locations l
set
  city_id = c.id,
  area_id = a.id
from public.cities c
join public.areas a on a.city_id = c.id
where c.slug = 'bristol'
  and l.city_id is null
  and lower(trim(l.city)) = 'bristol'
  and lower(a.name) = lower(trim(split_part(coalesce(l.region, ''), ',', 1)));

update public.business_locations l
set region = a.name
from public.areas a
where a.id = l.area_id
  and l.region is distinct from a.name;

-- Turns "bs7 8aa" into "BS7 8AA"; null if it isn't a full UK postcode.
create or replace function public.normalise_postcode(raw text)
returns text
language sql
immutable
as $$
  select case
    when compact ~ '^[A-Z]{1,2}[0-9][A-Z0-9]?[0-9][A-Z]{2}$'
      then left(compact, length(compact) - 3) || ' ' || right(compact, 3)
    else null
  end
  from (select upper(regexp_replace(coalesce(raw, ''), '\s', '', 'g')) as compact) p;
$$;

-- Checks and fills in a location's city and area. Accepts either ids or
-- names (so existing forms and functions that send names keep working).
create or replace function public.validate_business_location()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  chosen_city public.cities;
  chosen_area public.areas;
  postcode text;
begin
  -- A changed name (from a form) wins over the id it previously had.
  if tg_op = 'UPDATE' then
    if new.city_id is not distinct from old.city_id and new.city is distinct from old.city then
      new.city_id := null;
    end if;

    if new.area_id is not distinct from old.area_id and new.region is distinct from old.region then
      new.area_id := null;
    end if;
  end if;

  -- City
  if new.city_id is not null then
    select * into chosen_city from public.cities where id = new.city_id;
  else
    select * into chosen_city from public.cities where lower(name) = lower(trim(coalesce(new.city, '')));
  end if;

  if chosen_city.id is null then
    raise exception using
      errcode = 'P0001',
      message = 'Promotello isn''t available in this town yet. Join the waitlist and we''ll let you know when it is.';
  end if;

  if not chosen_city.is_live and not public.is_platform_admin() and auth.uid() is not null then
    raise exception using
      errcode = 'P0001',
      message = 'Promotello isn''t live in ' || chosen_city.name || ' yet.';
  end if;

  -- Area, which must be in the city
  if new.area_id is not null then
    select * into chosen_area from public.areas where id = new.area_id;
  else
    select * into chosen_area from public.areas
    where city_id = chosen_city.id and lower(name) = lower(trim(coalesce(new.region, '')));
  end if;

  if chosen_area.id is null or chosen_area.city_id <> chosen_city.id then
    raise exception using
      errcode = 'P0001',
      message = 'Choose your area from the list.';
  end if;

  -- Postcode: checked on new locations and whenever it changes.
  if tg_op = 'INSERT' or new.postal_code is distinct from old.postal_code or new.city_id is distinct from old.city_id then
    postcode := public.normalise_postcode(new.postal_code);

    if postcode is null then
      raise exception using
        errcode = 'P0001',
        message = 'Enter a full postcode, like BS7 8AA.';
    end if;

    if not (split_part(postcode, ' ', 1) = any (chosen_city.postcode_districts)) then
      raise exception using
        errcode = 'P0001',
        message = 'That postcode isn''t in ' || chosen_city.name || '.';
    end if;

    new.postal_code := postcode;
  end if;

  new.city_id := chosen_city.id;
  new.area_id := chosen_area.id;
  new.city := chosen_city.name;
  new.region := chosen_area.name;

  return new;
end;
$$;

drop trigger if exists business_locations_validate on public.business_locations;

create trigger business_locations_validate
before insert or update on public.business_locations
for each row
execute function public.validate_business_location();

-- ---------------------------------------------------------------------------
-- Waitlist for businesses in towns we're not in yet
-- ---------------------------------------------------------------------------

create table if not exists public.business_waitlist (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 1 and 120),
  email text not null check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' and char_length(email) <= 320),
  business_name text check (business_name is null or char_length(business_name) <= 160),
  town text not null check (char_length(trim(town)) between 2 and 100),
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists business_waitlist_town_idx on public.business_waitlist (lower(town));

alter table public.business_waitlist enable row level security;

drop policy if exists business_waitlist_insert_anyone on public.business_waitlist;
drop policy if exists business_waitlist_select_admins on public.business_waitlist;

create policy business_waitlist_insert_anyone on public.business_waitlist
  for insert to anon, authenticated with check (true);

create policy business_waitlist_select_admins on public.business_waitlist
  for select to authenticated using (public.is_platform_admin());
