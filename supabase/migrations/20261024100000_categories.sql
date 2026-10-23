-- Admin-managed categories. Top-level categories (parent_id null) group
-- subcategories; businesses and offers choose a subcategory. The existing
-- free-text `category` columns are kept in sync with the chosen name so
-- older code keeps working.

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),

  parent_id uuid
    references public.categories (id)
    on delete restrict,

  slug text not null unique
    check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),

  name text not null
    check (char_length(trim(name)) between 2 and 60),

  description text
    check (description is null or char_length(description) <= 300),

  image_url text,
  sort_order integer not null default 0,
  is_active boolean not null default true,

  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists categories_parent_id_idx
  on public.categories (parent_id);

create unique index if not exists categories_parent_name_key
  on public.categories (
    coalesce(parent_id, '00000000-0000-0000-0000-000000000000'::uuid),
    lower(name)
  );

drop trigger if exists categories_set_updated_at on public.categories;

create trigger categories_set_updated_at
before update on public.categories
for each row
execute function public.set_updated_at();

-- Only two levels: a subcategory's parent must be top-level.
create or replace function public.validate_category_parent()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.parent_id is null then
    return new;
  end if;

  if new.parent_id = new.id then
    raise exception using errcode = '22023', message = 'A category cannot be its own parent';
  end if;

  if exists (select 1 from public.categories where id = new.parent_id and parent_id is not null) then
    raise exception using errcode = '22023', message = 'Subcategories can only sit under a top-level category';
  end if;

  if exists (select 1 from public.categories where parent_id = new.id) then
    raise exception using errcode = '22023', message = 'A category with subcategories cannot become a subcategory';
  end if;

  return new;
end;
$$;

drop trigger if exists categories_validate_parent on public.categories;

create trigger categories_validate_parent
before insert or update of parent_id on public.categories
for each row
execute function public.validate_category_parent();

-- RLS: everyone reads active categories; platform admins manage them.
alter table public.categories enable row level security;

drop policy if exists categories_public_select on public.categories;

create policy categories_public_select
on public.categories
for select
to anon, authenticated
using (
  is_active or public.is_platform_admin()
);

drop policy if exists categories_platform_admin_insert on public.categories;

create policy categories_platform_admin_insert
on public.categories
for insert
to authenticated
with check (public.is_platform_admin());

drop policy if exists categories_platform_admin_update on public.categories;

create policy categories_platform_admin_update
on public.categories
for update
to authenticated
using (public.is_platform_admin())
with check (public.is_platform_admin());

drop policy if exists categories_platform_admin_delete on public.categories;

create policy categories_platform_admin_delete
on public.categories
for delete
to authenticated
using (public.is_platform_admin());

-- ---------------------------------------------------------------------------
-- Seed: 6 top-level categories and their subcategories
-- ---------------------------------------------------------------------------

insert into public.categories (slug, name, description, sort_order)
values
  ('food-drink', 'Food & drink', 'Cafés, restaurants, bakeries, bars and local food spots.', 10),
  ('things-to-do', 'Things to do', 'Activities, experiences, entertainment and days out.', 20),
  ('shopping', 'Shopping', 'Independent shops, makers and local retailers.', 30),
  ('health-beauty', 'Health & beauty', 'Hair, beauty, spas and wellbeing.', 40),
  ('services', 'Services', 'Trusted local services for your home, pets and bike.', 50),
  ('travel-stays', 'Travel & stays', 'Places to stay, tours and getaways.', 60)
on conflict (slug) do nothing;

insert into public.categories (parent_id, slug, name, sort_order)
select parent.id, child.slug, child.name, child.sort_order
from (
  values
    ('food-drink', 'cafes-coffee', 'Cafés & coffee', 10),
    ('food-drink', 'bakeries', 'Bakeries', 20),
    ('food-drink', 'restaurants', 'Restaurants', 30),
    ('food-drink', 'pubs-bars', 'Pubs & bars', 40),
    ('food-drink', 'takeaways', 'Takeaways', 50),
    ('food-drink', 'ice-cream-desserts', 'Ice cream & desserts', 60),
    ('food-drink', 'delis-grocers', 'Delis & grocers', 70),
    ('food-drink', 'farm-shops', 'Farm shops & producers', 80),
    ('things-to-do', 'activities-experiences', 'Activities & experiences', 10),
    ('things-to-do', 'cinema-theatre', 'Cinema & theatre', 20),
    ('things-to-do', 'fitness-sport', 'Fitness & sport', 30),
    ('things-to-do', 'classes-workshops', 'Classes & workshops', 40),
    ('things-to-do', 'attractions', 'Attractions', 50),
    ('shopping', 'fashion-vintage', 'Fashion & vintage', 10),
    ('shopping', 'books-music', 'Books & music', 20),
    ('shopping', 'home-gifts', 'Home & gifts', 30),
    ('shopping', 'plants-flowers', 'Plants & flowers', 40),
    ('shopping', 'makers-markets', 'Makers & markets', 50),
    ('health-beauty', 'hair-barbers', 'Hair & barbers', 10),
    ('health-beauty', 'beauty-nails', 'Beauty & nails', 20),
    ('health-beauty', 'spas-massage', 'Spas & massage', 30),
    ('health-beauty', 'yoga-wellbeing', 'Yoga & wellbeing', 40),
    ('services', 'bike-repair', 'Bike repair', 10),
    ('services', 'pet-care', 'Pet care', 20),
    ('services', 'home-garden', 'Home & garden', 30),
    ('services', 'repairs-alterations', 'Repairs & alterations', 40),
    ('services', 'professional-services', 'Professional services', 50),
    ('travel-stays', 'hotels-bnbs', 'Hotels & B&Bs', 10),
    ('travel-stays', 'tours-days-out', 'Tours & days out', 20)
) as child (parent_slug, slug, name, sort_order)
join public.categories parent
  on parent.slug = child.parent_slug
on conflict (slug) do nothing;

-- ---------------------------------------------------------------------------
-- Link businesses and offers to a subcategory
-- ---------------------------------------------------------------------------

alter table public.businesses
  add column if not exists category_id uuid
    references public.categories (id)
    on delete restrict;

alter table public.offers
  add column if not exists category_id uuid
    references public.categories (id)
    on delete restrict;

create index if not exists businesses_category_id_idx
  on public.businesses (category_id);

create index if not exists offers_category_id_idx
  on public.offers (category_id);

-- Keeps the text `category` column equal to the chosen category's name,
-- requires an active subcategory, and lets offers default to their
-- business's category.
create or replace function public.apply_category_choice()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  chosen public.categories;
begin
  -- Nested: PL/pgSQL resolves every field in a condition, and businesses
  -- has no business_id column.
  if tg_table_name = 'offers' then
    if new.category_id is null and new.business_id is not null then
      select category_id
      into new.category_id
      from public.businesses
      where id = new.business_id;
    end if;
  end if;

  if new.category_id is null then
    return new;
  end if;

  if tg_op = 'UPDATE' then
    if new.category_id is not distinct from old.category_id then
      return new;
    end if;
  end if;

  select *
  into chosen
  from public.categories
  where id = new.category_id;

  if chosen.id is null or chosen.parent_id is null then
    raise exception using errcode = '22023', message = 'Please choose a subcategory';
  end if;

  if not chosen.is_active and not public.is_platform_admin() then
    raise exception using errcode = '22023', message = 'That category is no longer available';
  end if;

  new.category := chosen.name;

  return new;
end;
$$;

drop trigger if exists businesses_apply_category_choice on public.businesses;

create trigger businesses_apply_category_choice
before insert or update on public.businesses
for each row
execute function public.apply_category_choice();

drop trigger if exists offers_apply_category_choice on public.offers;

create trigger offers_apply_category_choice
before insert or update on public.offers
for each row
execute function public.apply_category_choice();

-- Renaming a category updates the denormalised name everywhere.
create or replace function public.propagate_category_name()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.name is distinct from old.name then
    update public.businesses set category = new.name where category_id = new.id;
    update public.offers set category = new.name where category_id = new.id;
  end if;

  return new;
end;
$$;

drop trigger if exists categories_propagate_name on public.categories;

create trigger categories_propagate_name
after update of name on public.categories
for each row
execute function public.propagate_category_name();

-- ---------------------------------------------------------------------------
-- Business creation accepts a category id (or slug) in business_category.
-- Free text that matches no category is still stored as before.
-- ---------------------------------------------------------------------------

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
  chosen_category_id uuid;
begin
  if (select auth.uid()) is null then
    raise exception using errcode = '42501', message = 'Authentication is required';
  end if;

  select id
  into chosen_category_id
  from public.categories
  where parent_id is not null
    and is_active
    and (id::text = trim(business_category) or slug = trim(business_category));

  insert into public.businesses (
    name, category, category_id, description, website_url, contact_email, created_by
  )
  values (
    trim(business_name), trim(business_category), chosen_category_id,
    nullif(trim(business_description), ''),
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

-- ---------------------------------------------------------------------------
-- Map existing data
-- ---------------------------------------------------------------------------

update public.businesses b
set category_id = c.id
from public.categories c
where b.category_id is null
  and c.slug = case lower(trim(b.category))
    when 'cafe' then 'cafes-coffee'
    when 'café' then 'cafes-coffee'
    when 'coffee' then 'cafes-coffee'
    when 'hairdressers' then 'hair-barbers'
    when 'hairdresser' then 'hair-barbers'
    when 'barbers' then 'hair-barbers'
    when 'farm' then 'farm-shops'
    else null
  end;

update public.offers o
set category_id = b.category_id
from public.businesses b
where o.business_id = b.id
  and o.category_id is null
  and b.category_id is not null;
