-- Events (Growth): tastings, live music, workshops and so on, shown on the
-- business's page and the public events listing.

create table if not exists public.business_events (
  id uuid primary key default gen_random_uuid(),

  business_id uuid not null
    references public.businesses (id)
    on delete cascade,

  title text not null check (char_length(trim(title)) between 3 and 120),
  description text not null default '' check (char_length(description) <= 2000),
  starts_at timestamptz not null,
  ends_at timestamptz,
  -- Optional, e.g. "Upstairs room"; the business's address is shown anyway.
  location text check (location is null or char_length(location) <= 160),
  price text check (price is null or char_length(price) <= 60),

  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),

  check (ends_at is null or ends_at > starts_at)
);

create index if not exists business_events_upcoming_idx
  on public.business_events (starts_at);

create index if not exists business_events_business_idx
  on public.business_events (business_id, starts_at);

alter table public.business_events enable row level security;

drop policy if exists business_events_select_public on public.business_events;
drop policy if exists business_events_select_members on public.business_events;
drop policy if exists business_events_write_admins on public.business_events;

-- Anyone can see events of approved businesses.
create policy business_events_select_public
on public.business_events
for select
to anon, authenticated
using (
  exists (
    select 1 from public.businesses b
    where b.id = business_id and b.approval_status = 'approved'
  )
);

create policy business_events_select_members
on public.business_events
for select
to authenticated
using (public.is_business_member(business_id, 'member'));

-- Admins add, edit and delete events; adding or editing needs Growth.
create policy business_events_write_admins
on public.business_events
for all
to authenticated
using (public.is_business_member(business_id, 'admin'))
with check (
  public.is_business_member(business_id, 'admin')
  and public.business_has_growth(business_id)
);
