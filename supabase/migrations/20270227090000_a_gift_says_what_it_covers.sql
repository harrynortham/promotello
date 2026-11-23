-- A gift from an automation arrives with a reward and nothing else: no
-- picture, and no line saying what it covers. An offer has had both
-- since the beginning, and the counter is where that shows -- "can I
-- use this with the other one?" is asked of staff, not of us.
--
-- Terms are copied onto the voucher rather than read back from the
-- automation, the same way `reward` already is. The email has gone; a
-- business editing its terms afterwards must not change what somebody
-- was already promised, or staff would read one thing on the page while
-- the customer holds another in their inbox.

alter table public.business_automations
    add column if not exists terms text,
    add column if not exists image_url text;

alter table public.reward_vouchers
    add column if not exists terms text,
    add column if not exists image_url text;

comment on column public.reward_vouchers.terms is
    'Copied from the automation when the voucher was issued, so an edit cannot rewrite a promise already made.';

-- Return type changes, so both have to go and come back.
drop function if exists public.issue_automation_vouchers(uuid, uuid);

create function public.issue_automation_vouchers(
    requested_business_id uuid default null,
    requested_user_id uuid default null
)
returns table(
    voucher_id uuid,
    kind text,
    reward text,
    code text,
    expires_at timestamp with time zone,
    business_id uuid,
    business_name text,
    email text,
    first_name text,
    unsubscribe_token uuid,
    terms text,
    image_url text
)
language plpgsql
security definer
set search_path to 'public'
as $function$
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
    -- The terms and the picture are copied here, beside the reward, and
    -- are the voucher's own from this moment on.
    insert into public.reward_vouchers (business_id, user_id, kind, reward, expires_at, terms, image_url)
    select c.business_id, c.user_id, c.kind, a.reward, now() + make_interval(days => a.valid_days),
           nullif(btrim(coalesce(a.terms, '')), ''), a.image_url
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
    ef.unsubscribe_token,
    t.terms,
    t.image_url
  from to_send t
  join public.businesses b on b.id = t.business_id
  join auth.users u on u.id = t.user_id
  join eligible_followers ef on ef.business_id = t.business_id and ef.user_id = t.user_id;
end;
$function$;

grant execute on function public.issue_automation_vouchers(uuid, uuid) to service_role;

-- What staff see when they scan it.
drop function if exists public.staff_get_reward_voucher(text);

create function public.staff_get_reward_voucher(requested_code text)
returns table(
    voucher_id uuid,
    code text,
    business_id uuid,
    business_name text,
    kind text,
    reward text,
    created_at timestamp with time zone,
    expires_at timestamp with time zone,
    used_at timestamp with time zone,
    customer_name text,
    terms text,
    image_url text
)
language sql
stable
security definer
set search_path to 'public'
as $function$
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
    nullif(split_part(coalesce(u.raw_user_meta_data ->> 'full_name', ''), ' ', 1), ''),
    v.terms,
    v.image_url
  from public.reward_vouchers v
  join public.businesses b on b.id = v.business_id
  join auth.users u on u.id = v.user_id
  where v.code = upper(trim(requested_code))
    and public.is_business_member(v.business_id, 'member');
$function$;

grant execute on function public.staff_get_reward_voucher(text) to authenticated, service_role;
