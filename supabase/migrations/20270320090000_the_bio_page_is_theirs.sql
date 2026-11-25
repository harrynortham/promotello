-- The bio page becomes theirs to arrange.
--
-- Until now the page at /@theirhandle was a fixed list in a fixed
-- order, and a section appeared because a column happened to be filled
-- in. That is the right default and a poor product: the link they put
-- in an Instagram bio is the one page most of these businesses will
-- ever have, and they cannot move a thing on it.
--
-- Three tables. bio_sections says which blocks show and in what order;
-- bio_links holds the rows they write themselves, which is the thing a
-- link-in-bio page actually is; bio_taps counts what gets pressed.
--
-- The important rule is in the absence of rows. A business that never
-- opens this screen has no bio_sections at all and keeps exactly the
-- page it has today -- lib/bio-sections.ts holds that default order and
-- the page falls back to it. Nothing is seeded, so an unclaimed page,
-- which has nobody to arrange it, is unaffected.

-- ---------------------------------------------------------------------------
-- The few things that live only on this page
-- ---------------------------------------------------------------------------

alter table public.businesses
  -- Click-to-message. For a salon or a trade this beats a phone number,
  -- and it is the same digits in a different wrapper.
  add column if not exists whatsapp text,
  -- One line, with a date it stops being true: "Closed Sunday 24th".
  -- Nobody else gives a business this, and it is the first thing they
  -- want when something changes.
  add column if not exists bio_notice text,
  add column if not exists bio_notice_until date,
  -- Their colour on their page. Same shape as the loyalty card's.
  add column if not exists bio_accent text;

alter table public.businesses
  drop constraint if exists businesses_bio_notice_length,
  add constraint businesses_bio_notice_length
    check (bio_notice is null or length(btrim(bio_notice)) between 3 and 140);

alter table public.businesses
  drop constraint if exists businesses_bio_accent_hex,
  add constraint businesses_bio_accent_hex
    check (bio_accent is null or bio_accent ~ '^#[0-9a-fA-F]{6}$');

-- ---------------------------------------------------------------------------
-- Which blocks, in what order
-- ---------------------------------------------------------------------------

create table if not exists public.bio_sections (
  business_id uuid not null references public.businesses (id) on delete cascade,
  kind text not null check (kind in (
    'notice', 'offers', 'loyalty', 'links', 'booking', 'menu', 'hours',
    'find_us', 'call', 'whatsapp', 'website', 'review', 'photos', 'socials'
  )),
  position integer not null,
  enabled boolean not null default true,
  primary key (business_id, kind)
);

create index if not exists bio_sections_business_order
  on public.bio_sections (business_id, position);

create table if not exists public.bio_links (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  label text not null check (length(btrim(label)) between 1 and 40),
  -- http(s) only, and checked again in the app. A bio page that can
  -- carry a javascript: url is a bio page that can carry anything.
  url text not null check (url ~* '^https?://'),
  position integer not null default 0,
  enabled boolean not null default true,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists bio_links_business_order
  on public.bio_links (business_id, position);

alter table public.bio_sections enable row level security;
alter table public.bio_links enable row level security;

-- Readable exactly where the page itself is readable, kept in step on
-- purpose: a page that can be opened can have its arrangement read, and
-- one that cannot, cannot.
create policy bio_sections_public_read on public.bio_sections
for select
to anon, authenticated
using (
  exists (
    select 1 from public.businesses b
    where b.id = bio_sections.business_id
      and b.demo_at is null
      and (
        b.approval_status = 'approved'
        or (b.approval_status = 'pending' and b.listed_at is not null and b.closed_at is null)
      )
  )
);

create policy bio_links_public_read on public.bio_links
for select
to anon, authenticated
using (
  exists (
    select 1 from public.businesses b
    where b.id = bio_links.business_id
      and b.demo_at is null
      and (
        b.approval_status = 'approved'
        or (b.approval_status = 'pending' and b.listed_at is not null and b.closed_at is null)
      )
  )
);

create policy bio_sections_team_write on public.bio_sections
for all
to authenticated
using (public.is_business_member(business_id, 'admin'))
with check (public.is_business_member(business_id, 'admin'));

create policy bio_links_team_write on public.bio_links
for all
to authenticated
using (public.is_business_member(business_id, 'admin'))
with check (public.is_business_member(business_id, 'admin'));

-- ---------------------------------------------------------------------------
-- What gets pressed
-- ---------------------------------------------------------------------------

create table if not exists public.bio_taps (
  id bigserial primary key,
  business_id uuid not null references public.businesses (id) on delete cascade,
  kind text not null,
  link_id uuid references public.bio_links (id) on delete set null,
  tapped_at timestamptz not null default timezone('utc', now())
);

create index if not exists bio_taps_business_time
  on public.bio_taps (business_id, tapped_at desc);

alter table public.bio_taps enable row level security;

-- No insert policy, the same way page views are counted: written only
-- by the function below, so nothing can be stuffed from a console.
create policy bio_taps_team_read on public.bio_taps
for select
to authenticated
using (public.is_business_member(business_id, 'member'));

create or replace function public.record_bio_tap(
  requested_business_id uuid,
  tapped_kind text,
  tapped_link_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Only for a page somebody could actually be looking at.
  if not exists (
    select 1 from public.businesses b
    where b.id = requested_business_id
      and b.demo_at is null
      and (
        b.approval_status = 'approved'
        or (b.approval_status = 'pending' and b.listed_at is not null and b.closed_at is null)
      )
  ) then
    return;
  end if;

  insert into public.bio_taps (business_id, kind, link_id)
  values (requested_business_id, left(coalesce(tapped_kind, ''), 40), tapped_link_id);
end;
$$;

revoke all on function public.record_bio_tap(uuid, text, uuid) from public;
grant execute on function public.record_bio_tap(uuid, text, uuid) to anon, authenticated;

-- Taps per section over a window, for the dashboard. Counting in the
-- database rather than shipping every row to a page that only wants a
-- total per kind.
create or replace function public.bio_tap_counts(
  requested_business_id uuid,
  since_days integer default 30
)
returns table (kind text, link_id uuid, taps bigint)
language sql
security definer
set search_path = public
stable
as $$
  select t.kind, t.link_id, count(*) as taps
  from public.bio_taps t
  where t.business_id = requested_business_id
    and public.is_business_member(requested_business_id, 'member')
    and t.tapped_at > timezone('utc', now()) - make_interval(days => greatest(since_days, 1))
  group by t.kind, t.link_id;
$$;

revoke all on function public.bio_tap_counts(uuid, integer) from public, anon;
grant execute on function public.bio_tap_counts(uuid, integer) to authenticated;
