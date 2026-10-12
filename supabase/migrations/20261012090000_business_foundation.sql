-- Promotello business foundation.
--
-- Business creation is intentionally exposed through create_business_with_owner()
-- rather than a table INSERT policy. This keeps ownership assignment atomic and
-- prevents clients from granting themselves a different role.

create table if not exists public.businesses (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 2 and 160),
  category text not null check (char_length(trim(category)) between 2 and 100),
  description text check (description is null or char_length(description) <= 5000),
  website_url text,
  contact_email text,
  approval_status text not null default 'pending'
    check (approval_status in ('pending', 'approved', 'rejected', 'suspended')),
  created_by uuid not null references auth.users (id) on delete restrict,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.business_members (
  business_id uuid not null references public.businesses (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null check (role in ('owner', 'admin', 'member')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (business_id, user_id)
);

create table if not exists public.business_locations (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  name text not null default 'Main location'
    check (char_length(trim(name)) between 2 and 160),
  address_line_1 text not null check (char_length(trim(address_line_1)) between 2 and 200),
  address_line_2 text,
  city text not null check (char_length(trim(city)) between 2 and 100),
  region text,
  postal_code text,
  country_code text not null default 'GB'
    check (country_code ~ '^[A-Z]{2}$'),
  latitude double precision check (latitude is null or latitude between -90 and 90),
  longitude double precision check (longitude is null or longitude between -180 and 180),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists businesses_created_by_idx
  on public.businesses (created_by);
create index if not exists businesses_approval_status_idx
  on public.businesses (approval_status);
create index if not exists business_members_user_id_idx
  on public.business_members (user_id);
create index if not exists business_locations_business_id_idx
  on public.business_locations (business_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists businesses_set_updated_at on public.businesses;
create trigger businesses_set_updated_at
before update on public.businesses
for each row execute function public.set_updated_at();

drop trigger if exists business_members_set_updated_at on public.business_members;
create trigger business_members_set_updated_at
before update on public.business_members
for each row execute function public.set_updated_at();

drop trigger if exists business_locations_set_updated_at on public.business_locations;
create trigger business_locations_set_updated_at
before update on public.business_locations
for each row execute function public.set_updated_at();

-- SECURITY DEFINER avoids recursive business_members RLS checks inside policies.
-- The fixed search_path is required so this helper cannot be shadowed.
create or replace function public.is_business_member(
  requested_business_id uuid,
  minimum_role text default null
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.business_members bm
    where bm.business_id = requested_business_id
      and bm.user_id = (select auth.uid())
      and (
        minimum_role is null
        or (minimum_role = 'member' and bm.role in ('member', 'admin', 'owner'))
        or (minimum_role = 'admin' and bm.role in ('admin', 'owner'))
        or (minimum_role = 'owner' and bm.role = 'owner')
      )
  );
$$;

revoke all on function public.is_business_member(uuid, text) from public;
grant execute on function public.is_business_member(uuid, text) to authenticated;

alter table public.businesses enable row level security;
alter table public.business_members enable row level security;
alter table public.business_locations enable row level security;

drop policy if exists businesses_select_members on public.businesses;
create policy businesses_select_members
on public.businesses for select to authenticated
using (public.is_business_member(id, 'member'));

drop policy if exists businesses_update_admins on public.businesses;
create policy businesses_update_admins
on public.businesses for update to authenticated
using (public.is_business_member(id, 'admin'))
with check (
  public.is_business_member(id, 'admin')
  and approval_status in ('pending', 'approved', 'rejected', 'suspended')
);

drop policy if exists business_members_select_members on public.business_members;
create policy business_members_select_members
on public.business_members for select to authenticated
using (public.is_business_member(business_id, 'member'));

-- Staff management is intentionally limited to non-owner roles. Ownership
-- cannot be transferred or created through a client table mutation.
drop policy if exists business_members_insert_admins on public.business_members;
create policy business_members_insert_admins
on public.business_members for insert to authenticated
with check (
  public.is_business_member(business_id, 'admin')
  and role in ('admin', 'member')
);

drop policy if exists business_members_update_admins on public.business_members;
create policy business_members_update_admins
on public.business_members for update to authenticated
using (public.is_business_member(business_id, 'admin') and role <> 'owner')
with check (
  public.is_business_member(business_id, 'admin')
  and role in ('admin', 'member')
);

drop policy if exists business_members_delete_admins on public.business_members;
create policy business_members_delete_admins
on public.business_members for delete to authenticated
using (public.is_business_member(business_id, 'admin') and role <> 'owner');

drop policy if exists business_locations_select_members on public.business_locations;
create policy business_locations_select_members
on public.business_locations for select to authenticated
using (public.is_business_member(business_id, 'member'));

drop policy if exists business_locations_insert_admins on public.business_locations;
create policy business_locations_insert_admins
on public.business_locations for insert to authenticated
with check (public.is_business_member(business_id, 'admin'));

drop policy if exists business_locations_update_admins on public.business_locations;
create policy business_locations_update_admins
on public.business_locations for update to authenticated
using (public.is_business_member(business_id, 'admin'))
with check (public.is_business_member(business_id, 'admin'));

drop policy if exists business_locations_delete_admins on public.business_locations;
create policy business_locations_delete_admins
on public.business_locations for delete to authenticated
using (public.is_business_member(business_id, 'admin'));

create or replace function public.create_business_with_owner(
  business_name text,
  business_category text,
  business_description text default null,
  business_website_url text default null,
  business_contact_email text default null,
  location_name text default 'Main location',
  location_address_line_1 text default null,
  location_address_line_2 text default null,
  location_city text default null,
  location_region text default null,
  location_postal_code text default null,
  location_country_code text default 'GB'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_business_id uuid;
begin
  if (select auth.uid()) is null then
    raise exception using errcode = '42501', message = 'Authentication is required';
  end if;

  insert into public.businesses (
    name, category, description, website_url, contact_email, created_by
  )
  values (
    trim(business_name), trim(business_category), nullif(trim(business_description), ''),
    nullif(trim(business_website_url), ''), nullif(trim(business_contact_email), ''),
    (select auth.uid())
  )
  returning id into new_business_id;

  insert into public.business_members (business_id, user_id, role)
  values (new_business_id, (select auth.uid()), 'owner');

  if location_address_line_1 is not null and location_city is not null then
    insert into public.business_locations (
      business_id, name, address_line_1, address_line_2, city, region,
      postal_code, country_code
    )
    values (
      new_business_id, trim(location_name), trim(location_address_line_1),
      nullif(trim(location_address_line_2), ''), trim(location_city),
      nullif(trim(location_region), ''), nullif(trim(location_postal_code), ''),
      upper(trim(location_country_code))
    );
  end if;

  return new_business_id;
end;
$$;

revoke all on function public.create_business_with_owner(
  text, text, text, text, text, text, text, text, text, text, text, text
) from public;
grant execute on function public.create_business_with_owner(
  text, text, text, text, text, text, text, text, text, text, text, text
) to authenticated;
