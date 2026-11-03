-- Retrying an automation email without re-issuing the voucher.
--
-- issue_automation_vouchers creates a real reward and then the email is sent
-- separately. If that send failed, the voucher still existed, so the "not
-- exists" guards stopped it being issued again -- and the customer was never
-- told about a reward they actually had. Unlike the other scheduled emails
-- the claim must NOT be released: deleting it would take away the reward.
--
-- So the voucher records whether its email went out, and one that never did
-- is handed back on the next run to be tried again.

alter table public.reward_vouchers
  add column if not exists emailed_at timestamptz;

-- Everything issued before this migration was emailed at the time, or has
-- long since expired. Stamping them keeps the next run from mailing the lot.
update public.reward_vouchers
  set emailed_at = created_at
  where emailed_at is null;

comment on column public.reward_vouchers.emailed_at is
  'When the customer was emailed about this voucher. Null means the send failed and it is due a retry.';

-- Finds the few that are waiting, rather than scanning every voucher.
create index if not exists reward_vouchers_unemailed_idx
  on public.reward_vouchers (created_at desc)
  where emailed_at is null;

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
  ),
  -- Issued on an earlier run, but the email never went out. Bounded to three
  -- days so a long-dead send is not resurrected, and skipped once the voucher
  -- has expired, since there would be nothing to claim.
  retries as (
    select v.*
    from public.reward_vouchers v
    join eligible_followers ef
      on ef.business_id = v.business_id and ef.user_id = v.user_id
    where v.emailed_at is null
      and v.created_at > now() - interval '3 days'
      and v.expires_at > now()
      and v.used_at is null
      and not exists (select 1 from issued i where i.id = v.id)
  ),
  to_send as (
    select * from issued
    union all
    select * from retries
  )
  select
    t.id,
    t.kind,
    t.reward,
    t.code,
    t.expires_at,
    t.business_id,
    b.name,
    u.email::text,
    nullif(split_part(coalesce(u.raw_user_meta_data ->> 'full_name', ''), ' ', 1), ''),
    ef.unsubscribe_token
  from to_send t
  join public.businesses b on b.id = t.business_id
  join auth.users u on u.id = t.user_id
  join eligible_followers ef on ef.business_id = t.business_id and ef.user_id = t.user_id;
end;
$$;

revoke all on function public.issue_automation_vouchers(uuid, uuid) from public, anon, authenticated;
grant execute on function public.issue_automation_vouchers(uuid, uuid) to service_role;
