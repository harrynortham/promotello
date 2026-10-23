-- Platform metrics for the admin overview: businesses, subscriptions,
-- weekly active businesses, customers and activity over the last 30 days
-- compared with the 30 days before. Sample businesses are left out.
-- Platform admins only.

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
    select id, name, approval_status, created_at
    from public.businesses
    where not coalesce(is_sample, false)
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
  )
  select jsonb_build_object(
    'generated_at', now_ts,

    'businesses', (
      select jsonb_build_object(
        'approved', count(*) filter (where approval_status = 'approved'),
        'pending', count(*) filter (where approval_status = 'pending'),
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

revoke all on function public.platform_metrics() from public, anon;
grant execute on function public.platform_metrics() to authenticated;
