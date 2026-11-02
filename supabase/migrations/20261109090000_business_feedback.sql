-- What businesses tell us they need. Written from the dashboard, read by
-- platform admins; it is a note to us rather than a conversation, so a
-- business does not read its own back.

create table if not exists public.business_feedback (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  -- Kept if the person later deletes their account: the feedback stays.
  user_id uuid references auth.users (id) on delete set null,
  kind text not null check (kind in ('idea', 'problem', 'other')),
  message text not null check (char_length(btrim(message)) between 10 and 2000),
  -- The dashboard page they were on, which says a lot about what they meant.
  page text,
  status text not null default 'new' check (status in ('new', 'planned', 'done', 'declined')),
  created_at timestamptz not null default timezone('utc', now())
);

comment on table public.business_feedback is
  'Feedback and feature requests from businesses, written from their dashboard.';

alter table public.business_feedback enable row level security;

-- Anyone on the team can write, for their own business and as themselves.
drop policy if exists business_feedback_member_insert on public.business_feedback;

create policy business_feedback_member_insert
on public.business_feedback
for insert
to authenticated
with check (
  public.is_business_member(business_id, 'member')
  and user_id = (select auth.uid())
);

-- Only platform admins read it or move it along.
drop policy if exists business_feedback_admin_read on public.business_feedback;

create policy business_feedback_admin_read
on public.business_feedback
for select
to authenticated
using (public.is_platform_admin());

drop policy if exists business_feedback_admin_update on public.business_feedback;

create policy business_feedback_admin_update
on public.business_feedback
for update
to authenticated
using (public.is_platform_admin())
with check (public.is_platform_admin());

-- The admin list reads newest first, and filters to what is still open.
create index if not exists business_feedback_status_created_idx
  on public.business_feedback (status, created_at desc);
