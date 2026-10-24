-- Business and offer addresses end with a short unique id, so two
-- businesses with the same name in the same town never clash and a link
-- keeps working when a name or area changes:
--   /businesses/harbour-grind-clifton-bristol-k3x9q2
--   /offers/harbour-grind-20-off-flat-whites-a7d2kq
-- The id finds the record; the words before it are for people and search
-- engines, and an outdated version redirects to the current one.

-- Six characters from an alphabet without look-alikes (0/o, 1/l).
create or replace function public.short_id()
returns text
language sql
volatile
as $$
  select string_agg(substr('abcdefghijkmnpqrstuvwxyz23456789', 1 + floor(random() * 32)::int, 1), '')
  from generate_series(1, 6);
$$;

-- ---------------------------------------------------------------------------
-- Businesses: name, area and city, then the id
-- ---------------------------------------------------------------------------

alter table public.businesses add column if not exists public_id text;

create or replace function public.business_slug_for(target public.businesses)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(nullif(trim(both '-' from left(public.slugify(concat_ws(' ',
      target.name,
      case when lower(l.region) is distinct from lower(l.city) then l.region end,
      l.city
    )), 80)), ''), 'business') || '-' || target.public_id
  from (select 1) one
  left join lateral (
    select region, city
    from public.business_locations
    where business_id = target.id
    order by created_at
    limit 1
  ) l on true;
$$;

create or replace function public.set_business_slug()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.public_id is null then
    loop
      new.public_id := public.short_id();
      exit when not exists (select 1 from public.businesses where public_id = new.public_id);
    end loop;
  end if;

  new.slug := public.business_slug_for(new);
  return new;
end;
$$;

-- Moving to a new area or city updates the address.
create or replace function public.refresh_business_slug()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.businesses
  set slug = null
  where id = case when tg_op = 'DELETE' then old.business_id else new.business_id end;

  return null;
end;
$$;

drop trigger if exists business_locations_refresh_slug on public.business_locations;
create trigger business_locations_refresh_slug
after insert or delete or update of region, city on public.business_locations
for each row
execute function public.refresh_business_slug();

-- The readable slugs from the previous migration were never shown on the
-- live site (it still linked by id), so they need no redirects.
drop table if exists public.business_slug_history;
drop function if exists public.business_slug_taken(text, uuid);

update public.businesses set slug = null;

alter table public.businesses alter column public_id set not null;
create unique index if not exists businesses_public_id_key on public.businesses (public_id);

-- ---------------------------------------------------------------------------
-- Offers: business name and title, then the id
-- ---------------------------------------------------------------------------

alter table public.offers add column if not exists public_id text;

create or replace function public.set_offer_slug()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  business_name text;
begin
  if tg_op = 'UPDATE' and new.title is not distinct from old.title
     and new.business_id is not distinct from old.business_id
     and new.slug is not distinct from old.slug
     and old.public_id is not null then
    return new;
  end if;

  if new.public_id is null then
    loop
      new.public_id := public.short_id();
      exit when not exists (select 1 from public.offers where public_id = new.public_id);
    end loop;
  end if;

  select name into business_name from public.businesses where id = new.business_id;

  new.slug := coalesce(
    nullif(trim(both '-' from left(public.slugify(concat_ws(' ', business_name, new.title)), 80)), ''),
    'offer'
  ) || '-' || new.public_id;

  return new;
end;
$$;

drop function if exists public.offer_slug_taken(text, uuid);

-- Today's slugs (without ids) have been live briefly; keep them working.
-- The older random-ending ones are already in the history.
insert into public.offer_slug_history (slug, offer_id)
select slug, id from public.offers
on conflict (slug) do nothing;

update public.offers set slug = null;

alter table public.offers alter column public_id set not null;
create unique index if not exists offers_public_id_key on public.offers (public_id);

-- ---------------------------------------------------------------------------
-- Where an old or outdated address now lives
-- ---------------------------------------------------------------------------

-- The current path for /businesses/<segment> or /offers/<segment> when the
-- segment is outdated (an id, an old name, an old slug), or null when it's
-- current or unknown. Used for permanent redirects.
create or replace function public.canonical_path(kind text, segment text)
returns text
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  current_slug text;
  suffix text := substring(lower(segment) from '-([a-z0-9]{6})$');
begin
  if exists (select 1 from public.cities where slug = segment) then
    return null;
  end if;

  if kind = 'business' then
    if exists (select 1 from public.businesses where slug = segment) then
      return null;
    end if;

    if segment ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
      select slug into current_slug from public.businesses
      where id = segment::uuid and approval_status = 'approved';
    elsif suffix is not null then
      select slug into current_slug from public.businesses
      where public_id = suffix and approval_status = 'approved';
    end if;

    return '/businesses/' || current_slug;
  end if;

  if kind = 'offer' then
    if exists (select 1 from public.offers where slug = segment) then
      return null;
    end if;

    select o.slug into current_slug
    from public.offer_slug_history h
    join public.offers o on o.id = h.offer_id
    where h.slug = segment and o.approval_status = 'approved';

    if current_slug is null and suffix is not null then
      select slug into current_slug from public.offers
      where public_id = suffix and approval_status = 'approved';
    end if;

    return '/offers/' || current_slug;
  end if;

  return null;
end;
$$;

revoke all on function public.canonical_path(text, text) from public;
grant execute on function public.canonical_path(text, text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- QR scans: business scans go to /businesses/<id>, which works on every
-- version of the site and redirects to the current address.
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

  return '/businesses/' || qr.business_id;
end;
$$;

revoke all on function public.record_qr_scan(text, text) from public;
grant execute on function public.record_qr_scan(text, text) to anon, authenticated;
