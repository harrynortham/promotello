-- Automations (Growth): welcome, birthday and win-back emails to a
-- business's followers, each carrying a personal reward voucher that staff
-- redeem like any other. Followers have opted in to the business's emails,
-- and every email can be unsubscribed from.

-- ---------------------------------------------------------------------------
-- Customer birthdays (day and month only), for birthday rewards
-- ---------------------------------------------------------------------------

create table if not exists public.customer_birthdays (
  user_id uuid primary key
    references auth.users (id)
    on delete cascade,

  birth_month smallint not null check (birth_month between 1 and 12),
  birth_day smallint not null check (birth_day between 1 and 31),

  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.customer_birthdays enable row level security;

drop policy if exists customer_birthdays_own on public.customer_birthdays;

create policy customer_birthdays_own
on public.customer_birthdays
for all
to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- A business's automation settings
-- ---------------------------------------------------------------------------

create table if not exists public.business_automations (
  business_id uuid not null
    references public.businesses (id)
    on delete cascade,

  kind text not null check (kind in ('welcome', 'birthday', 'winback')),
  enabled boolean not null default false,

  -- What the customer gets, e.g. "A free pastry with any coffee".
  reward text not null check (char_length(trim(reward)) between 3 and 120),
  valid_days integer not null default 30 check (valid_days between 7 and 90),

  -- Win-back only: customers who haven't visited for this many days.
  inactive_days integer not null default 60 check (inactive_days between 30 and 365),

  updated_at timestamptz not null default timezone('utc', now()),

  primary key (business_id, kind)
);

alter table public.business_automations enable row level security;

drop policy if exists business_automations_select_members on public.business_automations;
drop policy if exists business_automations_write_admins on public.business_automations;

create policy business_automations_select_members
on public.business_automations
for select
to authenticated
using (public.is_business_member(business_id, 'member'));

-- Admins manage them; switching one on needs Growth.
create policy business_automations_write_admins
on public.business_automations
for all
to authenticated
using (public.is_business_member(business_id, 'admin'))
with check (
  public.is_business_member(business_id, 'admin')
  and (not enabled or public.business_has_growth(business_id))
);

-- ---------------------------------------------------------------------------
-- Reward vouchers issued by automations
-- ---------------------------------------------------------------------------

create table if not exists public.reward_vouchers (
  id uuid primary key default gen_random_uuid(),

  business_id uuid not null
    references public.businesses (id)
    on delete cascade,

  user_id uuid not null
    references auth.users (id)
    on delete cascade,

  kind text not null check (kind in ('welcome', 'birthday', 'winback')),
  reward text not null,

  -- "G" + 9 hex characters: can't clash with offer voucher codes (10 hex).
  code text not null unique
    default 'G' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 9)),

  created_at timestamptz not null default timezone('utc', now()),
  expires_at timestamptz not null,
  used_at timestamptz
);

create index if not exists reward_vouchers_user_idx
  on public.reward_vouchers (user_id, created_at desc);

create index if not exists reward_vouchers_business_idx
  on public.reward_vouchers (business_id, kind, created_at desc);

alter table public.reward_vouchers enable row level security;

drop policy if exists reward_vouchers_select_own on public.reward_vouchers;
drop policy if exists reward_vouchers_select_members on public.reward_vouchers;

create policy reward_vouchers_select_own
on public.reward_vouchers
for select
to authenticated
using (user_id = (select auth.uid()));

create policy reward_vouchers_select_members
on public.reward_vouchers
for select
to authenticated
using (public.is_business_member(business_id, 'member'));

-- ---------------------------------------------------------------------------
-- Issuing vouchers. Server only (service role): returns the email address
-- to send each new voucher to. Pass a business and user to welcome one new
-- follower straight away; pass nothing to run every automation (daily job).
-- ---------------------------------------------------------------------------

create or replace function public.issue_automation_vouchers(
  requested_business_id uuid default null,
  requested_user_id uuid default null
)
returns table (
  voucher_id uuid,
  kind text,
  reward text,
  code text,
  expires_at timestamptz,
  business_id uuid,
  business_name text,
  email text,
  first_name text,
  unsubscribe_token uuid
)
language plpgsql
security definer
set search_path = public
as $$
#variable_conflict use_column
declare
  today date := timezone('Europe/London', now())::date;
begin
  return query
  with eligible_followers as (
    -- Followers of Growth businesses who still want this business's emails.
    select f.business_id, f.user_id, f.created_at as followed_at, f.unsubscribe_token
    from public.business_followers f
    join public.businesses b on b.id = f.business_id
    left join public.account_notification_settings s on s.user_id = f.user_id
    where b.approval_status = 'approved'
      and f.emails_enabled
      and coalesce(s.followed_business_emails_enabled, true)
      and (requested_business_id is null or f.business_id = requested_business_id)
      and (requested_user_id is null or f.user_id = requested_user_id)
      and public.business_has_growth(f.business_id)
  ),
  candidates as (
    -- Welcome: followed in the last week, never welcomed by this business.
    select ef.business_id, ef.user_id, 'welcome'::text as kind
    from eligible_followers ef
    join public.business_automations a
      on a.business_id = ef.business_id and a.kind = 'welcome' and a.enabled
    where ef.followed_at > now() - interval '7 days'
      and not exists (
        select 1 from public.reward_vouchers v
        where v.business_id = ef.business_id and v.user_id = ef.user_id and v.kind = 'welcome'
      )

    union all

    -- Birthday: today (29 February birthdays fall on 28 February in other
    -- years), at most once a year.
    select ef.business_id, ef.user_id, 'birthday'
    from eligible_followers ef
    join public.business_automations a
      on a.business_id = ef.business_id and a.kind = 'birthday' and a.enabled
    join public.customer_birthdays cb on cb.user_id = ef.user_id
    where requested_user_id is null
      and cb.birth_month = extract(month from today)
      and (
        cb.birth_day = extract(day from today)
        or (cb.birth_month = 2 and cb.birth_day = 29 and extract(day from today) = 28
            and extract(day from (today + 1)) = 1)
      )
      and not exists (
        select 1 from public.reward_vouchers v
        where v.business_id = ef.business_id and v.user_id = ef.user_id and v.kind = 'birthday'
          and v.created_at > now() - interval '300 days'
      )

    union all

    -- Win-back: visited before (voucher used or loyalty stamp), but not for
    -- inactive_days; at most one win-back every 90 days.
    select ef.business_id, ef.user_id, 'winback'
    from eligible_followers ef
    join public.business_automations a
      on a.business_id = ef.business_id and a.kind = 'winback' and a.enabled
    cross join lateral (
      select max(visit_at) as last_visit
      from (
        select r.used_at as visit_at
        from public.offer_redemptions r
        join public.offers o on o.id = r.offer_id
        where o.business_id = ef.business_id and r.user_id = ef.user_id and r.used_at is not null

        union all

        select e.created_at
        from public.loyalty_events e
        join public.loyalty_cards c on c.id = e.card_id
        join public.loyalty_programs p on p.id = c.program_id
        where p.business_id = ef.business_id and c.user_id = ef.user_id and e.kind = 'stamp'

        union all

        select rv.used_at
        from public.reward_vouchers rv
        where rv.business_id = ef.business_id and rv.user_id = ef.user_id and rv.used_at is not null
      ) visits
    ) lv
    where requested_user_id is null
      and lv.last_visit is not null
      and lv.last_visit < now() - make_interval(days => a.inactive_days)
      and not exists (
        select 1 from public.reward_vouchers v
        where v.business_id = ef.business_id and v.user_id = ef.user_id and v.kind = 'winback'
          and v.created_at > now() - interval '90 days'
      )
  ),
  issued as (
    insert into public.reward_vouchers (business_id, user_id, kind, reward, expires_at)
    select c.business_id, c.user_id, c.kind, a.reward, now() + make_interval(days => a.valid_days)
    from candidates c
    join public.business_automations a on a.business_id = c.business_id and a.kind = c.kind
    returning *
  )
  select
    i.id,
    i.kind,
    i.reward,
    i.code,
    i.expires_at,
    i.business_id,
    b.name,
    u.email::text,
    nullif(split_part(coalesce(u.raw_user_meta_data ->> 'full_name', ''), ' ', 1), ''),
    ef.unsubscribe_token
  from issued i
  join public.businesses b on b.id = i.business_id
  join auth.users u on u.id = i.user_id
  join eligible_followers ef on ef.business_id = i.business_id and ef.user_id = i.user_id;
end;
$$;

revoke all on function public.issue_automation_vouchers(uuid, uuid) from public, anon, authenticated;
grant execute on function public.issue_automation_vouchers(uuid, uuid) to service_role;

-- ---------------------------------------------------------------------------
-- Staff redeem reward vouchers through the same /redeem/<code> page.
-- ---------------------------------------------------------------------------

create or replace function public.staff_get_reward_voucher(requested_code text)
returns table (
  voucher_id uuid,
  code text,
  business_id uuid,
  business_name text,
  kind text,
  reward text,
  created_at timestamptz,
  expires_at timestamptz,
  used_at timestamptz,
  customer_name text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    v.id,
    v.code,
    v.business_id,
    b.name,
    v.kind,
    v.reward,
    v.created_at,
    v.expires_at,
    v.used_at,
    nullif(split_part(coalesce(u.raw_user_meta_data ->> 'full_name', ''), ' ', 1), '')
  from public.reward_vouchers v
  join public.businesses b on b.id = v.business_id
  join auth.users u on u.id = v.user_id
  where v.code = upper(trim(requested_code))
    and public.is_business_member(v.business_id, 'member');
$$;

revoke all on function public.staff_get_reward_voucher(text) from public, anon;
grant execute on function public.staff_get_reward_voucher(text) to authenticated;

create or replace function public.mark_reward_voucher_used(requested_voucher_id uuid)
returns public.reward_vouchers
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_voucher public.reward_vouchers;
begin
  update public.reward_vouchers v
  set used_at = coalesce(v.used_at, now())
  where v.id = requested_voucher_id
    and v.expires_at > now()
    and public.is_business_member(v.business_id, 'member')
  returning v.* into updated_voucher;

  if updated_voucher.id is null then
    raise exception using
      errcode = '42501',
      message = 'Voucher not found, expired or access denied';
  end if;

  return updated_voucher;
end;
$$;

revoke all on function public.mark_reward_voucher_used(uuid) from public, anon;
grant execute on function public.mark_reward_voucher_used(uuid) to authenticated;
