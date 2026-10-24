-- Readable addresses for businesses and offers:
--   /businesses/harbour-grind (was /businesses/<uuid>)
--   /offers/harbour-grind-20-off-flat-whites (was /offers/20-off-flat-whites-1a2b3c)
-- Slugs follow the name (or the business name and offer title). When one
-- changes, the old slug is kept so old links, emails and QR codes
-- redirect to the new address.

-- "Fern & Fig Café" -> "fern-and-fig-cafe"
create or replace function public.slugify(value text)
returns text
language sql
immutable
as $$
  select left(
    trim(both '-' from regexp_replace(
      translate(
        replace(replace(replace(lower(coalesce(value, '')), '&', ' and '), '''', ''), '’', ''),
        'àáâäãåāçćčèéêëēėęîïíīįìłñńôöòóœøōõßśšûüùúūÿžźż',
        'aaaaaaaccceeeeeeeiiiiiilnnoooooooosssuuuuuyzzz'
      ),
      '[^a-z0-9]+', '-', 'g'
    )),
    70
  );
$$;

-- ---------------------------------------------------------------------------
-- Businesses
-- ---------------------------------------------------------------------------

alter table public.businesses add column if not exists slug text;

create table if not exists public.business_slug_history (
  slug text primary key,
  business_id uuid not null references public.businesses (id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists business_slug_history_business_idx on public.business_slug_history (business_id);

alter table public.business_slug_history enable row level security;

drop policy if exists business_slug_history_select_all on public.business_slug_history;
create policy business_slug_history_select_all on public.business_slug_history
  for select to anon, authenticated using (true);

-- Whether a business slug is free: not another business's current or old
-- slug, and not a city (/businesses/bristol is Bristol's directory).
create or replace function public.business_slug_taken(candidate text, own_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.businesses where slug = candidate and id <> own_id)
      or exists (select 1 from public.business_slug_history where slug = candidate and business_id <> own_id)
      or exists (select 1 from public.cities where slug = candidate)
      or candidate in ('new', 'search', 'map');
$$;

create or replace function public.set_business_slug()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  base text;
  candidate text;
  n integer := 1;
begin
  if tg_op = 'UPDATE' and new.name is not distinct from old.name and old.slug is not null then
    new.slug := old.slug;
    return new;
  end if;

  base := coalesce(nullif(public.slugify(new.name), ''), 'business');
  candidate := base;

  while public.business_slug_taken(candidate, new.id) loop
    n := n + 1;
    candidate := base || '-' || n;
  end loop;

  if tg_op = 'UPDATE' and old.slug is not null and old.slug <> candidate then
    insert into public.business_slug_history (slug, business_id)
    values (old.slug, new.id)
    on conflict (slug) do nothing;
  end if;

  -- Renamed back to an earlier name: that slug is current again.
  delete from public.business_slug_history where slug = candidate and business_id = new.id;

  new.slug := candidate;
  return new;
end;
$$;

drop trigger if exists businesses_set_slug on public.businesses;
create trigger businesses_set_slug
before insert or update of name, slug on public.businesses
for each row
execute function public.set_business_slug();

-- Existing businesses, oldest first so they get the plain slug.
do $$
declare
  b record;
begin
  for b in select id from public.businesses where slug is null order by created_at loop
    update public.businesses set slug = null where id = b.id;
  end loop;
end;
$$;

alter table public.businesses alter column slug set not null;
create unique index if not exists businesses_slug_key on public.businesses (slug);

-- ---------------------------------------------------------------------------
-- Offers
-- ---------------------------------------------------------------------------

create table if not exists public.offer_slug_history (
  slug text primary key,
  offer_id uuid not null references public.offers (id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists offer_slug_history_offer_idx on public.offer_slug_history (offer_id);

alter table public.offer_slug_history enable row level security;

drop policy if exists offer_slug_history_select_all on public.offer_slug_history;
create policy offer_slug_history_select_all on public.offer_slug_history
  for select to anon, authenticated using (true);

create or replace function public.offer_slug_taken(candidate text, own_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.offers where slug = candidate and id <> own_id)
      or exists (select 1 from public.offer_slug_history where slug = candidate and offer_id <> own_id)
      or exists (select 1 from public.cities where slug = candidate);
$$;

-- An offer's slug is its business's name and its title. The app may send
-- a slug on insert; it's replaced here.
create or replace function public.set_offer_slug()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  business_name text;
  base text;
  candidate text;
  n integer := 1;
begin
  if tg_op = 'UPDATE' and new.title is not distinct from old.title
     and new.business_id is not distinct from old.business_id
     and new.slug is not distinct from old.slug then
    return new;
  end if;

  select name into business_name from public.businesses where id = new.business_id;

  base := left(public.slugify(coalesce(business_name, '') || ' ' || new.title), 90);
  base := coalesce(nullif(trim(both '-' from base), ''), 'offer');
  candidate := base;

  while public.offer_slug_taken(candidate, new.id) loop
    n := n + 1;
    candidate := base || '-' || n;
  end loop;

  if tg_op = 'UPDATE' and old.slug is not null and old.slug <> candidate then
    insert into public.offer_slug_history (slug, offer_id)
    values (old.slug, new.id)
    on conflict (slug) do nothing;
  end if;

  delete from public.offer_slug_history where slug = candidate and offer_id = new.id;

  new.slug := candidate;
  return new;
end;
$$;

drop trigger if exists offers_set_slug on public.offers;
create trigger offers_set_slug
before insert or update of title, business_id, slug on public.offers
for each row
execute function public.set_offer_slug();

-- A renamed business renames its offers' addresses too.
create or replace function public.rename_business_offer_slugs()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.offers set slug = null where business_id = new.id;
  return null;
end;
$$;

drop trigger if exists businesses_rename_offer_slugs on public.businesses;
create trigger businesses_rename_offer_slugs
after update of name on public.businesses
for each row
when (old.name is distinct from new.name)
execute function public.rename_business_offer_slugs();

-- Existing offers get the new style; their old slugs redirect.
do $$
declare
  o record;
begin
  for o in select id from public.offers order by created_at loop
    update public.offers set slug = null where id = o.id;
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- QR codes go straight to the business's readable address
-- ---------------------------------------------------------------------------

create or replace function public.record_qr_scan(
  requested_code text,
  requested_device text default 'other'
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  qr public.qr_codes;
  offer_slug text;
  business_slug text;
begin
  select q.*
  into qr
  from public.qr_codes q
  join public.businesses b
    on b.id = q.business_id
  where q.code = lower(requested_code)
    and q.archived_at is null
    and b.approval_status = 'approved';

  if qr.id is null then
    return null;
  end if;

  insert into public.qr_scans (qr_code_id, device)
  values (
    qr.id,
    case
      when requested_device in ('mobile', 'tablet', 'desktop') then requested_device
      else 'other'
    end
  );

  -- Send scans for an offer that has ended or been paused to the business.
  if qr.offer_id is not null then
    select o.slug
    into offer_slug
    from public.offers o
    where o.id = qr.offer_id
      and o.approval_status = 'approved'
      and o.expires_at >= current_date
      and o.plan_paused_at is null;
  end if;

  if offer_slug is not null then
    return '/offers/' || offer_slug;
  end if;

  select slug into business_slug from public.businesses where id = qr.business_id;

  return '/businesses/' || business_slug;
end;
$$;

revoke all on function public.record_qr_scan(text, text) from public;
grant execute on function public.record_qr_scan(text, text) to anon, authenticated;
