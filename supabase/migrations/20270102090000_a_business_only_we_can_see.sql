-- A business only we can see.
--
-- Selling is an email and then a conversation on a doorstep, and there
-- is nothing to show. /business/demo is a hand-written dashboard with
-- made-up numbers and no database under it, so nobody can hold a real
-- card, watch a stamp land on it, or see a report that was counted
-- rather than typed.
--
-- So: one real business, approved, with offers, a card, holders and
-- three months of visits behind it — and invisible to everybody but us.
--
-- `demo_at` does the hiding, in one place. Every public listing, the
-- search, the city and category pages, the sitemap and all the SEO
-- pages read `businesses` through RLS as the visitor, so a single
-- clause on the public select policy takes it out of all of them at
-- once. Platform admins and the business's own members still see it,
-- which is what makes it demoable: signed in, everything works.
--
-- The holders are deliberately guests. A guest card has no account
-- behind it and nothing in the product ever emails one, so a demo can
-- never post mail to a person who isn't real — and
-- business_repeat_visits() counts guests in full on both sides of its
-- sum (20261229090000), so the report page is honest arithmetic over
-- real rows.

alter table public.businesses
  add column if not exists demo_at timestamptz;

comment on column public.businesses.demo_at is
  'Ours, for selling: approved so every flow works, and hidden from everybody but platform admins and its own members.';

create index if not exists businesses_demo_idx
  on public.businesses (demo_at)
  where demo_at is not null;

-- The one clause that hides it.
drop policy if exists businesses_select_approved_public on public.businesses;

create policy businesses_select_approved_public
on public.businesses for select
to anon, authenticated
using (approval_status = 'approved' and demo_at is null);

-- ---------------------------------------------------------------------------
-- Our own numbers stay honest
-- ---------------------------------------------------------------------------
--
-- Unchanged but for one line: `real_businesses` already dropped the
-- sample pages, and now drops the demo too. Everything else in here
-- joins that CTE, so the demo's visits, its Growth subscription and its
-- place in the top-businesses table all go with it.

create or replace function public.platform_metrics()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  now_ts timestamptz := now();
  current_start timestamptz := date_trunc('day', now()) - interval '29 days';
  previous_start timestamptz := date_trunc('day', now()) - interval '59 days';
  week_start timestamptz := now() - interval '7 days';
  result jsonb;
begin
  if not public.is_platform_admin() then
    raise exception using errcode = '42501', message = 'Platform admin access is required';
  end if;

  with real_businesses as (
    select id, name, approval_status, created_at, review_requested_at, closed_at
    from public.businesses
    where not coalesce(is_sample, false)
      and demo_at is null
  ),

  -- Every customer interaction we can date, tagged by business.
  events as (
    select 'claims' as metric, o.business_id, r.user_id, r.redeemed_at as at
    from public.offer_redemptions r
    join public.offers o on o.id = r.offer_id
    where r.redeemed_at >= previous_start

    union all
    select 'used', o.business_id, r.user_id, r.used_at
    from public.offer_redemptions r
    join public.offers o on o.id = r.offer_id
    where r.used_at >= previous_start

    union all
    select 'stamps', p.business_id, c.user_id, e.created_at
    from public.loyalty_events e
    join public.loyalty_cards c on c.id = e.card_id
    join public.loyalty_programs p on p.id = c.program_id
    where e.kind = 'stamp' and e.created_at >= previous_start

    union all
    select 'qr_scans', q.business_id, null::uuid, s.scanned_at
    from public.qr_scans s
    join public.qr_codes q on q.id = s.qr_code_id
    where s.scanned_at >= previous_start

    union all
    select 'page_views', business_id, null::uuid, viewed_at
    from public.page_views
    where viewed_at >= previous_start

    union all
    select 'review_clicks', business_id, user_id, created_at
    from public.review_link_clicks
    where created_at >= previous_start

    union all
    select 'follows', business_id, user_id, created_at
    from public.business_followers
    where created_at >= previous_start
  ),
  real_events as (
    select e.*
    from events e
    join real_businesses b on b.id = e.business_id
  ),
  -- A visit is a voucher used or a loyalty stamp: the customer was there.
  visits as (
    select business_id, user_id, at
    from real_events
    where metric in ('used', 'stamps') and user_id is not null
  ),
  paying as (
    select s.business_id, s.status, s.price_id
    from public.subscriptions s
    join real_businesses b on b.id = s.business_id
    where s.status in ('trialing', 'active', 'past_due')
  ),
  signups as (
    select created_at as at from auth.users where created_at >= previous_start
  ),
  finished_trials as (
    select s.status, s.trial_end, s.canceled_at
    from public.subscriptions s
    join real_businesses b on b.id = s.business_id
    where s.trial_end is not null and s.trial_end < now_ts
  )
  select jsonb_build_object(
    'generated_at', now_ts,

    'businesses', (
      select jsonb_build_object(
        'approved', count(*) filter (where approval_status = 'approved'),
        -- The queue, not every unapproved row: a business that hasn't sent
        -- its page isn't waiting on us, and a closed one never will be.
        'pending', count(*) filter (
          where approval_status = 'pending'
            and review_requested_at is not null
            and closed_at is null
        ),
        'new', count(*) filter (where created_at >= current_start),
        'new_previous', count(*) filter (where created_at >= previous_start and created_at < current_start)
      )
      from real_businesses
    ),

    'pending_offers', (
      select count(*)
      from public.offers o
      join real_businesses b on b.id = o.business_id
      where o.approval_status = 'pending'
    ),

    'open_billing_alerts', (
      select count(*) from public.billing_alerts where resolved_at is null
    ),

    'subscriptions', jsonb_build_object(
      'trialing', (select count(*) from paying where status = 'trialing'),
      'active', (select count(*) from paying where status = 'active'),
      'past_due', (select count(*) from paying where status = 'past_due'),
      -- Paying (not trialing) subscriptions' prices, for monthly revenue.
      'paying_price_ids', coalesce(
        (select jsonb_agg(price_id) from paying where status in ('active', 'past_due')),
        '[]'::jsonb
      ),
      'canceled', (
        select count(*)
        from public.subscriptions s
        join real_businesses b on b.id = s.business_id
        where s.canceled_at >= current_start
      ),
      -- Trials that have run their course, and the share of them that
      -- went on to pay.
      'trials_finished', (select count(*) from finished_trials),
      'trials_converted', (
        select count(*)
        from finished_trials
        where status in ('active', 'past_due')
           or (canceled_at is not null and canceled_at > trial_end)
      )
    ),

    'weekly_active', jsonb_build_object(
      'paid_active', (
        select count(distinct p.business_id)
        from paying p
        where exists (
          select 1 from visits v where v.business_id = p.business_id and v.at >= week_start
        )
      ),
      'paid_total', (select count(distinct business_id) from paying),
      'all_active', (
        select count(distinct business_id) from visits where at >= week_start
      )
    ),

    'customers', jsonb_build_object(
      'accounts', (select count(*) from auth.users),
      'new', (select count(*) from signups where at >= current_start),
      'new_previous', (select count(*) from signups where at < current_start),
      'followers', (
        select count(distinct f.user_id)
        from public.business_followers f
        join real_businesses b on b.id = f.business_id
      ),
      'loyalty_holders', (
        select count(distinct c.user_id)
        from public.loyalty_cards c
        join public.loyalty_programs p on p.id = c.program_id
        join real_businesses b on b.id = p.business_id
      ),
      'visitors', (
        select count(distinct user_id) from visits where at >= current_start
      ),
      'repeat_visitors', (
        select count(*) from (
          select user_id
          from visits
          where at >= current_start
          group by user_id
          having count(*) >= 2
        ) repeaters
      ),
      'cross_visitors', (
        select count(*) from (
          select user_id
          from visits
          where at >= current_start
          group by user_id
          having count(distinct business_id) >= 2
        ) explorers
      )
    ),

    'activity', coalesce((
      select jsonb_object_agg(metric, jsonb_build_object('current', current, 'previous', previous))
      from (
        select
          metric,
          count(*) filter (where at >= current_start) as current,
          count(*) filter (where at < current_start) as previous
        from real_events
        group by metric
      ) totals
    ), '{}'::jsonb),

    'daily', coalesce((
      select jsonb_agg(jsonb_build_object('day', day, 'signups', signups, 'claims', claims, 'visits', visits) order by day)
      from (
        select
          d::date as day,
          (select count(*) from signups s where s.at >= d and s.at < d + interval '1 day') as signups,
          (select count(*) from real_events e where e.metric = 'claims' and e.at >= d and e.at < d + interval '1 day') as claims,
          (select count(*) from visits v where v.at >= d and v.at < d + interval '1 day') as visits
        from generate_series(current_start, date_trunc('day', now_ts), interval '1 day') as d
      ) days
    ), '[]'::jsonb),

    'top_businesses', coalesce((
      select jsonb_agg(row_to_json(top))
      from (
        select
          b.id,
          b.name,
          count(*) filter (where e.metric in ('used', 'stamps')) as visits,
          count(*) filter (where e.metric = 'claims') as claims,
          count(*) filter (where e.metric = 'page_views') as views,
          exists (select 1 from paying p where p.business_id = b.id) as pro
        from real_events e
        join real_businesses b on b.id = e.business_id
        where e.at >= current_start
        group by b.id, b.name
        order by visits desc, claims desc, views desc
        limit 8
      ) top
    ), '[]'::jsonb)
  )
  into result;

  return result;
end;
$$;

-- ---------------------------------------------------------------------------
-- Building it, and putting it back the way it demos best
-- ---------------------------------------------------------------------------
--
-- Idempotent on purpose. The business, its page and its offers are
-- updated in place; the card and its holders are rebuilt every time,
-- because a sales call stamps them and the next call should start from
-- the same picture.
--
-- Whoever presses the button becomes the owner, so it is in their own
-- dashboard and the till tools work on their own phone.

create or replace function public.refresh_demo_business()
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  admin_id uuid := auth.uid();
  demo_id uuid;
  town public.cities;
  area_id uuid;
  cafe uuid;
  borrowed_logo text;
  program_id uuid;
  poster_id uuid;
  card_id uuid;
  -- Twelve holders, each a little further along, each joined before
  -- they ever came in — which is what makes them ours to claim.
  holders text[] := array['Ava','Ben','Cleo','Dara','Esme','Femi','Grace','Hugo','Iris','Jonah','Kemi','Leo'];
  stamps_each integer[] := array[6, 5, 5, 4, 4, 3, 3, 2, 2, 1, 1, 0];
  joined_days integer[] := array[88, 84, 80, 74, 70, 64, 58, 50, 44, 36, 24, 9];
  person integer;
  stamp integer;
  joined timestamptz;
  stamped timestamptz;
begin
  if not public.is_platform_admin() then
    raise exception using errcode = '42501', message = 'Admin access is required';
  end if;

  if admin_id is null then
    raise exception using errcode = '42501', message = 'Sign in to build the demo business';
  end if;

  select * into town from public.cities where slug = 'bristol';

  if town.id is null then
    raise exception using errcode = 'P0002', message = 'No city to put the demo business in';
  end if;

  select id into area_id from public.areas where city_id = town.id and name = 'Harbourside';
  select id into cafe from public.categories where slug = 'cafes-coffee';

  -- A logo without a Node script to make one: the sample café already
  -- has one in storage, and a picture that loads beats initials when
  -- the point of the thing is how it looks.
  select logo_url into borrowed_logo
  from public.businesses
  where is_sample and logo_url is not null and category_id = cafe
  limit 1;

  select id into demo_id from public.businesses where demo_at is not null order by created_at limit 1;

  if demo_id is null then
    insert into public.businesses (
      name, category_id, category, description, website_url, contact_email,
      approval_status, review_requested_at, demo_at, created_by, logo_url
    )
    values (
      'Quayside Coffee',
      cafe,
      'Cafés & coffee',
      'A small harbourside coffee bar, roasting on site and pulling shots from six in the morning. Flat whites, filter by the cup, and pastries from the bakery two doors up.',
      'https://example.com/quayside-coffee',
      'hello@example.com',
      'approved',
      timezone('utc', now()) - interval '95 days',
      timezone('utc', now()),
      admin_id,
      borrowed_logo
    )
    returning id into demo_id;
  else
    update public.businesses
    set name = 'Quayside Coffee',
        category_id = cafe,
        description = 'A small harbourside coffee bar, roasting on site and pulling shots from six in the morning. Flat whites, filter by the cup, and pastries from the bakery two doors up.',
        approval_status = 'approved',
        demo_at = coalesce(demo_at, timezone('utc', now())),
        closed_at = null,
        -- A logo or cover added through the dashboard is kept.
        logo_url = coalesce(logo_url, borrowed_logo)
    where id = demo_id;
  end if;

  insert into public.business_members (business_id, user_id, role)
  values (demo_id, admin_id, 'owner')
  on conflict (business_id, user_id) do update set role = 'owner';

  -- Growth, so the card, the automations and the report are all on.
  -- price_id stays null: it is not one of the fifty founding places,
  -- and platform_metrics() leaves demo businesses out of the revenue
  -- anyway. Nothing reconciles this row against Stripe.
  insert into public.subscriptions (
    business_id, stripe_subscription_id, stripe_customer_id, status, tier, current_period_end
  )
  values (
    demo_id,
    'sub_demo_' || demo_id::text,
    'cus_demo_' || demo_id::text,
    'active',
    'growth',
    timezone('utc', now()) + interval '30 days'
  )
  on conflict (stripe_subscription_id) do update
  set status = 'active',
      tier = 'growth',
      current_period_end = timezone('utc', now()) + interval '30 days',
      canceled_at = null,
      cancel_at_period_end = false;

  delete from public.business_locations where business_id = demo_id;

  insert into public.business_locations (
    business_id, name, address_line_1, city, region, postal_code, city_id, area_id
  )
  values (demo_id, 'Quayside Coffee', '14 Narrow Quay', town.name, 'Harbourside', 'BS1 4QA', town.id, area_id);

  delete from public.business_hours where business_id = demo_id;

  insert into public.business_hours (business_id, day_of_week, is_closed, opens_at, closes_at)
  select demo_id, dow, dow = 0, case when dow = 0 then null else '07:00'::time end,
         case when dow = 0 then null when dow = 6 then '17:00'::time else '16:00'::time end
  from generate_series(0, 6) as dow;

  -- The offers. Three shapes, so the pack can show more than one.
  delete from public.offers where business_id = demo_id;

  insert into public.offers (
    business_id, category_id, title, description, discount, availability, terms,
    expires_at, approval_status, created_by, kind, kind_value, kind_item,
    available_days, available_from, available_until, max_redemptions, audience
  )
  values
    (
      demo_id, cafe,
      'Free pastry with any hot drink before 10am',
      'Start the day properly: order any coffee or tea before ten and take a pastry from the counter on us.',
      'Free pastry', 'Weekdays until 10:00',
      'One per customer per visit. While the counter lasts.',
      current_date + interval '90 days', 'approved', admin_id,
      'freebie', null, 'pastry',
      array[1, 2, 3, 4, 5]::smallint[], '07:00', '10:00', 150, 'everyone'
    ),
    (
      demo_id, cafe,
      'Half-price bags of house beans',
      'Take a 250g bag of the house espresso or this month''s filter roast home for half what it usually costs.',
      '50% off', 'Any time',
      'One bag per customer. Not with other offers.',
      current_date + interval '90 days', 'approved', admin_id,
      'percent_off', 50, 'house beans',
      null, null, null, 40, 'everyone'
    ),
    (
      demo_id, cafe,
      'Two filter coffees for the price of one',
      'Bring somebody with you on a Monday or Tuesday afternoon and the second filter coffee is on the house.',
      '2 for 1 on filter coffee', 'Mondays and Tuesdays, 14:00 to 17:00',
      'Cheapest cup free. Dine in only.',
      current_date + interval '60 days', 'approved', admin_id,
      'two_for_one', null, 'filter coffee',
      array[1, 2]::smallint[], '14:00', '17:00', null, 'everyone'
    );

  -- The card, its holders and their visits, rebuilt from scratch.
  delete from public.loyalty_programs where business_id = demo_id;

  insert into public.loyalty_programs (
    business_id, name, stamps_required, reward, terms, card_colour, stamp_icon, is_active
  )
  values (
    demo_id, 'Coffee card', 6, 'A free coffee of your choice',
    'One stamp per visit. The card is on your phone, so there is nothing to lose.',
    'charcoal', 'coffee', true
  )
  returning id into program_id;

  for person in 1 .. array_length(holders, 1) loop
    joined := timezone('utc', now()) - make_interval(days => joined_days[person]);

    insert into public.loyalty_cards (
      program_id, guest_name, guest_email, guest_token, stamps, created_at
    )
    values (
      program_id,
      holders[person],
      lower(holders[person]) || '@quayside.example',
      gen_random_uuid(),
      stamps_each[person],
      joined
    )
    returning id into card_id;

    -- Every stamp is a visit, the first of them a clear day after they
    -- joined: joined first, came in afterwards, which is the whole
    -- claim the report makes.
    for stamp in 1 .. stamps_each[person] loop
      stamped := joined + make_interval(days => stamp * 9 - 8);

      if stamped < timezone('utc', now()) then
        insert into public.loyalty_events (card_id, kind, created_by, created_at)
        values (card_id, 'stamp', admin_id, stamped);

        update public.loyalty_cards set last_stamped_at = stamped where id = card_id;
      end if;
    end loop;
  end loop;

  -- A poster on the counter, and the scans it has had.
  delete from public.qr_codes where business_id = demo_id;

  insert into public.qr_codes (business_id, loyalty_program_id, label, created_by, poster_colour, poster_headline)
  values (demo_id, program_id, 'On the counter', admin_id, 'charcoal', 'Six coffees, the seventh on us')
  returning id into poster_id;

  insert into public.qr_scans (qr_code_id, scanned_at, device)
  select poster_id,
         timezone('utc', now()) - make_interval(days => (n % 30), hours => (n * 7) % 11),
         -- qr_scans.device is the shape of the thing, not its make.
         case when n % 9 = 0 then 'desktop' when n % 7 = 0 then 'tablet' else 'mobile' end
  from generate_series(1, 64) as n;

  -- And the page it all points at, being looked at.
  delete from public.page_views where business_id = demo_id;

  insert into public.page_views (business_id, source, viewed_at)
  select demo_id,
         case when n % 5 = 0 then 'qr' when n % 17 = 0 then 'share' else 'web' end,
         timezone('utc', now()) - make_interval(days => (n % 58), hours => (n * 5) % 13)
  from generate_series(1, 420) as n;

  return demo_id;
end;
$$;

comment on function public.refresh_demo_business() is
  'Builds or puts back the one demo business: approved, stocked, and hidden from everybody but admins. The caller becomes its owner.';

revoke all on function public.refresh_demo_business() from public, anon;
grant execute on function public.refresh_demo_business() to authenticated;
