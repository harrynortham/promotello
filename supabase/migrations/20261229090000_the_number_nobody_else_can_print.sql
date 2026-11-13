-- First visits Promotello sent, and who came back.
--
-- "Promotello sent you 41 first-time customers this quarter. 12 came
-- back. 5 are now regulars." No loyalty app can print the first
-- number, because it was never there for the first visit: it only ever
-- sees the card it issued. A directory, an offer and a card in one
-- place can (docs/ROADMAP.md, Positioning).
--
-- Nothing new is recorded for this. A visit already means the same
-- three things everywhere else in the product — a voucher marked used,
-- a reward voucher used, or a loyalty stamp
-- (20261026180000_monthly_reports.sql) — and all three carry a person.
--
-- Two judgements are written into this, and both are deliberately the
-- cautious reading, because the number is a sales claim:
--
--  1. "Promotello sent them" means they claimed an offer or joined the
--     card before they ever came in. Views and scans are anonymous by
--     design, so neither can be tied to a person, and neither is
--     counted. The claim is therefore narrower than the truth, never
--     wider.
--
--  2. Before means at least an hour before. Somebody joining the card
--     at the counter is already in the shop, and a join a minute
--     before the first stamp is that, not a customer we sent. An hour
--     loses the person who claimed an offer outside the window and
--     walked straight in; losing them is the right way round.

create or replace function public.business_repeat_visits(
  requested_business_id uuid,
  months integer default 3
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  -- The daily job asks for every business it is emailing, with no
  -- session of its own; anyone else has to work there.
  asked_by uuid := auth.uid();
  since timestamptz;
  result jsonb;
begin
  if asked_by is not null and not public.is_business_member(requested_business_id, 'member') then
    raise exception using errcode = '42501', message = 'Business access is required';
  end if;

  months := least(greatest(coalesce(months, 3), 1), 24);
  since := date_trunc('month', timezone('utc', now())) - make_interval(months => months - 1);

  with visits as (
    select r.user_id::text as person, r.used_at as at
    from public.offer_redemptions r
    join public.offers o on o.id = r.offer_id
    where o.business_id = requested_business_id
      and r.used_at is not null
      and r.user_id is not null

    union all

    select v.user_id::text, v.used_at
    from public.reward_vouchers v
    where v.business_id = requested_business_id
      and v.used_at is not null
      and v.user_id is not null

    union all

    -- A guest's card has no account behind it, and a guest at the till
    -- is exactly the first-timer this counts, so the email stands in.
    select coalesce(c.user_id::text, 'guest:' || lower(c.guest_email)), e.created_at
    from public.loyalty_events e
    join public.loyalty_cards c on c.id = e.card_id
    join public.loyalty_programs p on p.id = c.program_id
    where p.business_id = requested_business_id
      and e.kind = 'stamp'
      and (c.user_id is not null or c.guest_email is not null)
  ),

  -- When Promotello first put this business in front of them.
  touches as (
    select r.user_id::text as person, min(r.redeemed_at) as at
    from public.offer_redemptions r
    join public.offers o on o.id = r.offer_id
    where o.business_id = requested_business_id
      and r.user_id is not null
    group by 1

    union all

    select coalesce(c.user_id::text, 'guest:' || lower(c.guest_email)), min(c.created_at)
    from public.loyalty_cards c
    join public.loyalty_programs p on p.id = c.program_id
    where p.business_id = requested_business_id
      and (c.user_id is not null or c.guest_email is not null)
    group by 1
  ),

  found as (
    select person, min(at) as at from touches group by person
  ),

  people as (
    select
      v.person,
      min(v.at) as first_visit,
      max(v.at) as last_visit,
      count(*) as visits,
      -- Every visit they will ever make counts towards coming back:
      -- a customer who returns next month still came back.
      (min(f.at) is not null and min(f.at) <= min(v.at) - interval '1 hour') as sent_by_us
    from visits v
    left join found f on f.person = v.person
    group by v.person
  ),

  cohort as (
    select * from people where first_visit >= since
  ),

  by_month as (
    select
      date_trunc('month', first_visit)::date as month,
      count(*) as new_customers,
      count(*) filter (where sent_by_us) as sent,
      count(*) filter (where visits >= 2) as returned
    from cohort
    group by 1
    order by 1
  )

  select jsonb_build_object(
    'months', months,
    'since', since,
    'generated_at', timezone('utc', now()),

    -- Everybody whose first visit landed in these months.
    'new_customers', (select count(*) from cohort),
    'returned', (select count(*) filter (where visits >= 2) from cohort),
    'regulars', (select count(*) filter (where visits >= 3) from cohort),

    -- And the same three for the ones we sent, which is the sentence:
    -- "sent you 41 … 12 came back" has to be 12 of those 41, not 12 of
    -- everybody who happened to walk in.
    'sent_by_promotello', (select count(*) filter (where sent_by_us) from cohort),
    'sent_returned', (select count(*) filter (where sent_by_us and visits >= 2) from cohort),
    'sent_regulars', (select count(*) filter (where sent_by_us and visits >= 3) from cohort),

    -- Everybody who came in during the window, new or not, and what
    -- they did: the denominator for anyone who asks.
    'customers', (
      select count(distinct v.person) from visits v where v.at >= since
    ),
    'visits', (
      select count(*) from visits v where v.at >= since
    ),

    'by_month', coalesce(
      (select jsonb_agg(jsonb_build_object(
        'month', month,
        'new_customers', new_customers,
        'sent', sent,
        'returned', returned
      )) from by_month),
      '[]'::jsonb
    )
  )
  into result;

  return result;
end;
$$;

comment on function public.business_repeat_visits(uuid, integer) is
  'First-time customers at this business in the last N months, how many Promotello sent them (a claim or a card join at least an hour before their first visit), how many came back, and how many are regulars.';

revoke all on function public.business_repeat_visits(uuid, integer) from public, anon;
grant execute on function public.business_repeat_visits(uuid, integer) to authenticated, service_role;
