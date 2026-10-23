-- Followers and new-offer emails. Customers follow a business; when one of
-- its offers is approved, followers get an email (Pro businesses only).
-- Every email carries an unsubscribe link keyed by the follower's token, and
-- customers can turn these emails off for one business or for all of them.

create table if not exists public.business_followers (
  business_id uuid not null
    references public.businesses (id)
    on delete cascade,

  user_id uuid not null
    references auth.users (id)
    on delete cascade,

  emails_enabled boolean not null default true,

  -- Secret used in unsubscribe links so customers don't need to sign in.
  unsubscribe_token uuid not null default gen_random_uuid() unique,

  created_at timestamptz not null default timezone('utc', now()),

  primary key (business_id, user_id)
);

create index if not exists business_followers_user_idx
  on public.business_followers (user_id, created_at desc);

create index if not exists business_followers_business_created_idx
  on public.business_followers (business_id, created_at desc);

alter table public.business_followers enable row level security;

drop policy if exists business_followers_select_own on public.business_followers;
drop policy if exists business_followers_insert_own on public.business_followers;
drop policy if exists business_followers_update_own on public.business_followers;
drop policy if exists business_followers_delete_own on public.business_followers;

-- Customers manage their own follows. Businesses only see a count, through
-- business_follower_count() below, never who follows them.
create policy business_followers_select_own
on public.business_followers
for select
to authenticated
using (user_id = (select auth.uid()));

create policy business_followers_insert_own
on public.business_followers
for insert
to authenticated
with check (
  user_id = (select auth.uid())
  and exists (
    select 1 from public.businesses b
    where b.id = business_id and b.approval_status = 'approved'
  )
);

create policy business_followers_update_own
on public.business_followers
for update
to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

create policy business_followers_delete_own
on public.business_followers
for delete
to authenticated
using (user_id = (select auth.uid()));

-- The token is set by the database; customers may only change emails_enabled.
revoke update on public.business_followers from authenticated;
grant update (emails_enabled) on public.business_followers to authenticated;

-- Account-wide switch for emails from followed businesses. A missing
-- settings row means the emails are on (following is the opt-in).
alter table public.account_notification_settings
  add column if not exists followed_business_emails_enabled boolean not null default true;

-- One new-offer email per offer per follower, so re-approving an edited
-- offer never emails people twice.
create table if not exists public.offer_email_sends (
  offer_id uuid not null
    references public.offers (id)
    on delete cascade,

  user_id uuid not null
    references auth.users (id)
    on delete cascade,

  sent_at timestamptz not null default timezone('utc', now()),

  primary key (offer_id, user_id)
);

alter table public.offer_email_sends enable row level security;

-- No policies: written and read only by the functions below.

-- ---------------------------------------------------------------------------
-- Follower count for a business, for its own dashboard.
-- ---------------------------------------------------------------------------

create or replace function public.business_follower_count(requested_business_id uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select case
    when public.is_business_member(requested_business_id, 'member')
      then (select count(*)::integer from public.business_followers where business_id = requested_business_id)
    else null
  end;
$$;

revoke all on function public.business_follower_count(uuid) from public, anon;
grant execute on function public.business_follower_count(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Claims the followers to email about a newly approved offer and returns
-- their addresses. Each follower is returned once per offer, ever. Server
-- only (service role): it reads email addresses from auth.users.
-- ---------------------------------------------------------------------------

create or replace function public.claim_new_offer_email_recipients(requested_offer_id uuid)
returns table (
  user_id uuid,
  email text,
  unsubscribe_token uuid
)
language plpgsql
security definer
set search_path = public
as $$
declare
  offer_business_id uuid;
begin
  select o.business_id
  into offer_business_id
  from public.offers o
  join public.businesses b on b.id = o.business_id
  where o.id = requested_offer_id
    and o.approval_status = 'approved'
    and b.approval_status = 'approved'
    and (o.expires_at is null or o.expires_at >= current_date);

  if offer_business_id is null or not public.business_has_pro(offer_business_id) then
    return;
  end if;

  return query
  with eligible as (
    select f.user_id, u.email::text as email, f.unsubscribe_token
    from public.business_followers f
    join auth.users u on u.id = f.user_id
    left join public.account_notification_settings s on s.user_id = f.user_id
    where f.business_id = offer_business_id
      and f.emails_enabled
      and coalesce(s.followed_business_emails_enabled, true)
      and u.email is not null
  ),
  claimed as (
    insert into public.offer_email_sends (offer_id, user_id)
    select requested_offer_id, e.user_id from eligible e
    on conflict do nothing
    returning offer_email_sends.user_id
  )
  select e.user_id, e.email, e.unsubscribe_token
  from eligible e
  join claimed c on c.user_id = e.user_id;
end;
$$;

revoke all on function public.claim_new_offer_email_recipients(uuid) from public, anon, authenticated;
grant execute on function public.claim_new_offer_email_recipients(uuid) to service_role;

-- ---------------------------------------------------------------------------
-- Unsubscribe links. Anyone holding the token can see which business it is
-- for and turn the emails off, for that business or for every business.
-- ---------------------------------------------------------------------------

create or replace function public.follower_by_unsubscribe_token(requested_token uuid)
returns table (
  business_id uuid,
  business_name text,
  emails_enabled boolean,
  all_emails_enabled boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select
    b.id,
    b.name,
    f.emails_enabled,
    coalesce(s.followed_business_emails_enabled, true)
  from public.business_followers f
  join public.businesses b on b.id = f.business_id
  left join public.account_notification_settings s on s.user_id = f.user_id
  where f.unsubscribe_token = requested_token;
$$;

create or replace function public.unsubscribe_by_token(
  requested_token uuid,
  everything boolean default false
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  follower_user_id uuid;
begin
  update public.business_followers
  set emails_enabled = false
  where unsubscribe_token = requested_token
  returning user_id into follower_user_id;

  if follower_user_id is null then
    return false;
  end if;

  if everything then
    insert into public.account_notification_settings (user_id, followed_business_emails_enabled)
    values (follower_user_id, false)
    on conflict (user_id) do update set followed_business_emails_enabled = false;
  end if;

  return true;
end;
$$;

revoke all on function public.follower_by_unsubscribe_token(uuid) from public;
grant execute on function public.follower_by_unsubscribe_token(uuid) to anon, authenticated;

revoke all on function public.unsubscribe_by_token(uuid, boolean) from public;
grant execute on function public.unsubscribe_by_token(uuid, boolean) to anon, authenticated;
