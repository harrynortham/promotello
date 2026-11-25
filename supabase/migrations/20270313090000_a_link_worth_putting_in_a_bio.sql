-- A link a business would put in its own bio.
--
-- B5 asks where consumers come from, and the honest answer today is
-- nowhere: SEO pages and no traffic. The cheapest channel we have is
-- the one each business already owns. A café with 2,000 Instagram
-- followers has more local reach than this directory, and the only
-- thing between those followers and Promotello is the one link
-- Instagram allows in a bio.
--
-- For that link to be ours, it has to be worth more to them than what
-- is there now. Which means it is their page, with their things on it,
-- and the address has to read as theirs:
--
--   promotello.com/businesses/harbour-grind-harbourside-bristol-rqqc8n
--   promotello.com/@harbourgrind
--
-- Nobody puts the first one in a bio.
--
-- Handles live in their own table rather than a column, because a
-- business that changes its handle must not break the link it has
-- already printed, posted and put in its bio. Every handle it has ever
-- had stays reserved and keeps resolving; one of them is current, and
-- the others redirect to it.

create table if not exists public.business_handles (
  handle text primary key
    check (handle ~ '^[a-z0-9]([a-z0-9-]{1,28}[a-z0-9])$'),

  business_id uuid not null
    references public.businesses (id)
    on delete cascade,

  -- The one the page is served at. The rest are old addresses that
  -- still work.
  is_current boolean not null default true,

  created_at timestamptz not null default timezone('utc', now())
);

-- One current handle each. The others are history, and there can be any
-- number of them.
create unique index if not exists business_handles_one_current_idx
  on public.business_handles (business_id)
  where is_current;

create index if not exists business_handles_business_idx
  on public.business_handles (business_id);

alter table public.business_handles enable row level security;

-- Readable by anybody: a handle is a public address, and resolving one
-- is what the page does before it knows who is asking. Writing goes
-- through set_business_handle() below.
drop policy if exists business_handles_public_select on public.business_handles;

create policy business_handles_public_select
on public.business_handles for select
to anon, authenticated
using (true);

-- ---------------------------------------------------------------------------
-- The three links a bio actually needs
-- ---------------------------------------------------------------------------
--
-- A website is not what somebody arriving from Instagram wants. They
-- want the menu, a table, or the phone. These sit beside website_url
-- and the six socials, and an empty one simply does not draw a button.

alter table public.businesses
  add column if not exists menu_url text
    check (menu_url is null or menu_url ~* '^https?://.+'),
  add column if not exists booking_url text
    check (booking_url is null or booking_url ~* '^https?://.+'),
  -- Loose on purpose. A UK business writes its number six ways and all
  -- of them dial; the only thing worth refusing is something that is
  -- plainly not a number.
  add column if not exists phone text
    check (phone is null or phone ~ '^[0-9+()\s-]{7,20}$');

comment on column public.businesses.menu_url is 'Their menu, for the link-in-bio page.';
comment on column public.businesses.booking_url is 'Where to book a table or an appointment.';
comment on column public.businesses.phone is 'Shown as a Call button on the link-in-bio page. Never in an email.';

-- ---------------------------------------------------------------------------
-- Making one, and changing it
-- ---------------------------------------------------------------------------

-- Names that are ours, or that would read as ours on a page with
-- somebody else's shop on it.
create or replace function public.handle_is_reserved(candidate text)
returns boolean
language sql
immutable
as $$
  select candidate = any (array[
    'promotello', 'admin', 'support', 'help', 'about', 'legal', 'privacy',
    'terms', 'business', 'businesses', 'offers', 'offer', 'login', 'signup',
    'dashboard', 'account', 'settings', 'api', 'blog', 'contact', 'team',
    'security', 'status', 'app', 'www', 'mail', 'billing'
  ]);
$$;

-- A handle from a business name: "The Drapers Arms" is
-- "thedrapersarms". Spaces and punctuation go, because a handle is
-- typed on a phone and read aloud down a counter.
create or replace function public.handle_from_name(business_name text)
returns text
language sql
immutable
as $$
  select nullif(
    btrim(
      left(regexp_replace(lower(coalesce(business_name, '')), '[^a-z0-9]', '', 'g'), 30),
      '-'
    ),
    ''
  );
$$;

-- Claims a handle for a business, retiring whatever it had.
--
-- The old one is kept and keeps resolving: a handle that has been in a
-- bio, on a poster or in a printed letter cannot be allowed to stop
-- working because somebody changed their mind in Settings.
create or replace function public.set_business_handle(
  requested_business_id uuid,
  requested_handle text
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  wanted text := lower(btrim(coalesce(requested_handle, '')));
  owner_of_wanted uuid;
begin
  if not public.is_business_member(requested_business_id, 'admin')
     and not public.is_platform_admin() then
    raise exception using errcode = '42501', message = 'Only an owner or admin can change the handle';
  end if;

  if wanted !~ '^[a-z0-9]([a-z0-9-]{1,28}[a-z0-9])$' then
    raise exception using errcode = '22023',
      message = 'A handle is 3 to 30 characters: letters, numbers and hyphens, starting and ending with a letter or number.';
  end if;

  if public.handle_is_reserved(wanted) then
    raise exception using errcode = '22023', message = 'That handle is reserved.';
  end if;

  select business_id into owner_of_wanted from public.business_handles where handle = wanted;

  if owner_of_wanted is not null and owner_of_wanted <> requested_business_id then
    raise exception using errcode = '23505', message = 'That handle is taken.';
  end if;

  update public.business_handles
  set is_current = false
  where business_id = requested_business_id and is_current and handle <> wanted;

  insert into public.business_handles (handle, business_id, is_current)
  values (wanted, requested_business_id, true)
  on conflict (handle) do update set is_current = true;

  return wanted;
end;
$$;

revoke all on function public.set_business_handle(uuid, text) from public, anon;
grant execute on function public.set_business_handle(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- One for everybody who already exists
-- ---------------------------------------------------------------------------
--
-- Given rather than asked for. A business that has to go and invent a
-- handle before it has a bio link does not have a bio link, and the
-- name they already chose is the right answer nearly every time. It is
-- changeable from Settings, and the one we gave keeps working after
-- they do.
--
-- Collisions take the business's own public_id, which is already unique
-- and already the end of its slug: "harbourgrind" then
-- "harbourgrind-rqqc8n".

do $$
declare
  business record;
  candidate text;
begin
  for business in
    select b.id, b.name, b.public_id
    from public.businesses b
    where not exists (select 1 from public.business_handles h where h.business_id = b.id)
    order by b.created_at
  loop
    candidate := public.handle_from_name(business.name);

    if candidate is null or length(candidate) < 3 or public.handle_is_reserved(candidate) then
      candidate := 'shop-' || business.public_id;
    end if;

    if exists (select 1 from public.business_handles where handle = candidate) then
      candidate := left(candidate, 23) || '-' || business.public_id;
    end if;

    insert into public.business_handles (handle, business_id)
    values (candidate, business.id)
    on conflict (handle) do nothing;
  end loop;
end;
$$;

-- New businesses get one the moment they exist, by the same rules.
create or replace function public.give_business_a_handle()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  candidate text;
begin
  candidate := public.handle_from_name(new.name);

  if candidate is null or length(candidate) < 3 or public.handle_is_reserved(candidate) then
    candidate := 'shop-' || new.public_id;
  end if;

  if exists (select 1 from public.business_handles where handle = candidate) then
    candidate := left(candidate, 23) || '-' || new.public_id;
  end if;

  insert into public.business_handles (handle, business_id)
  values (candidate, new.id)
  on conflict (handle) do nothing;

  return new;
end;
$$;

drop trigger if exists businesses_give_a_handle on public.businesses;

create trigger businesses_give_a_handle
after insert on public.businesses
for each row execute function public.give_business_a_handle();

-- ---------------------------------------------------------------------------
-- Counting the arrivals
-- ---------------------------------------------------------------------------
--
-- A fourth source beside web, qr and share. The point of the bio link
-- is to find out whether a business's own followers are a channel, and
-- that question cannot be answered by a view we cannot tell apart from
-- a Google one.
--
-- profile_views in business_analytics() counts every source, so the
-- totals are unaffected; shared_views filters to 'share', so a bio
-- arrival is correctly not counted as a share.

alter table public.page_views drop constraint if exists page_views_source_check;

alter table public.page_views
  add constraint page_views_source_check
  check (source = any (array['web', 'qr', 'share', 'bio']));
