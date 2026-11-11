-- Everything Promotello says, it says by email.
--
-- Your business was approved, your offer is live, an offer has run out,
-- a business you follow has something new — all of it arrives in an
-- inbox. Somebody already on the site has no way to see any of it here,
-- and somebody who turned an email off never hears at all.
--
-- A notification belongs to the person, not to a business. Somebody who
-- is a customer and also runs a shop has one list and one dot, whichever
-- side of the site they are looking at. business_id on a row is context
-- — "which of mine is this about" — and is never used to decide who may
-- read it.

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  -- One of the types in lib/notifications.ts. No check constraint, so a
  -- new kind of notification needs no migration.
  type text not null,
  -- Written when the notification is made, not rebuilt from the type on
  -- every read: an old one still reads correctly after the offer or the
  -- business it mentions is renamed or deleted.
  title text not null,
  body text,
  -- Somewhere in this app, so a notification can never carry somebody
  -- off the site.
  href text check (href is null or href ~ '^/[^/]'),
  business_id uuid references public.businesses (id) on delete cascade,
  -- Stops one event telling somebody twice.
  dedupe_key text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

-- The list.
create index if not exists notifications_for_user
  on public.notifications (user_id, created_at desc);

-- The count behind the dot, which runs on every page.
create index if not exists notifications_unread
  on public.notifications (user_id)
  where read_at is null;

-- What makes `on conflict do nothing` enough to send twice safely.
create unique index if not exists notifications_once_per_event
  on public.notifications (user_id, dedupe_key)
  where dedupe_key is not null;

alter table public.notifications enable row level security;

-- Yours, and only yours.
drop policy if exists notifications_select_own on public.notifications;
create policy notifications_select_own on public.notifications
  for select
  to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists notifications_update_own on public.notifications;
create policy notifications_update_own on public.notifications
  for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists notifications_delete_own on public.notifications;
create policy notifications_delete_own on public.notifications
  for delete
  to authenticated
  using (user_id = (select auth.uid()));

-- No insert policy on purpose: nobody writes a notification from a
-- browser. Rows come from server code holding the service role, which
-- has already checked who is asking.

-- Marking one read is the only change a person makes to it. Rewriting
-- its words, or moving it to somebody else, is not — the same shape
-- business_followers uses for emails_enabled.
revoke update on public.notifications from authenticated;
grant update (read_at) on public.notifications to authenticated;

-- The twin of business_manager_emails: who to tell in the app, rather
-- than where to write to.
create or replace function public.business_manager_ids(requested_business_id uuid)
returns uuid[]
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(array_agg(distinct m.user_id), '{}')
  from public.business_members m
  where m.business_id = requested_business_id
    and m.role in ('owner', 'admin');
$$;

revoke all on function public.business_manager_ids(uuid) from public, anon, authenticated;
grant execute on function public.business_manager_ids(uuid) to service_role;
