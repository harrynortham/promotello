-- Social sharing: links shared from the share panel carry ?ref=share, and
-- views that arrive through them are counted, so businesses can see what
-- sharing brings in.

alter table public.page_views drop constraint if exists page_views_source_check;
alter table public.page_views
  add constraint page_views_source_check check (source in ('web', 'qr', 'share'));

create or replace function public.record_page_view(
  requested_business_id uuid,
  requested_offer_id uuid default null,
  requested_source text default 'web'
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Only count views of public, approved listings.
  if not exists (
    select 1 from public.businesses
    where id = requested_business_id and approval_status = 'approved'
  ) then
    return;
  end if;

  if requested_offer_id is not null and not exists (
    select 1 from public.offers
    where id = requested_offer_id and business_id = requested_business_id
  ) then
    return;
  end if;

  insert into public.page_views (business_id, offer_id, source)
  values (
    requested_business_id,
    requested_offer_id,
    case when requested_source in ('qr', 'share') then requested_source else 'web' end
  );
end;
$$;

-- business_analytics() gains a shared_views total.
create or replace function public.business_analytics(
  requested_business_id uuid,
  days integer default 30
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  period interval;
  current_start timestamptz;
  previous_start timestamptz;
  result jsonb;
begin
  if not public.is_business_member(requested_business_id, 'member') then
    raise exception using errcode = '42501', message = 'Business access is required';
  end if;

  days := least(greatest(coalesce(days, 30), 7), 90);
  period := make_interval(days => days);
  current_start := date_trunc('day', now()) - period + interval '1 day';
  previous_start := current_start - period;

  with events as (
    select 'profile_views' as metric, viewed_at as at
    from public.page_views
    where business_id = requested_business_id and offer_id is null and viewed_at >= previous_start

    union all
    select 'offer_views', viewed_at
    from public.page_views
    where business_id = requested_business_id and offer_id is not null and viewed_at >= previous_start

    union all
    select 'claims', r.redeemed_at
    from public.offer_redemptions r
    join public.offers o on o.id = r.offer_id
    where o.business_id = requested_business_id and r.redeemed_at >= previous_start

    union all
    select 'used', r.used_at
    from public.offer_redemptions r
    join public.offers o on o.id = r.offer_id
    where o.business_id = requested_business_id and r.used_at >= previous_start

    union all
    select 'qr_scans', s.scanned_at
    from public.qr_scans s
    join public.qr_codes q on q.id = s.qr_code_id
    where q.business_id = requested_business_id and s.scanned_at >= previous_start

    union all
    select 'loyalty_stamps', e.created_at
    from public.loyalty_events e
    join public.loyalty_cards c on c.id = e.card_id
    join public.loyalty_programs p on p.id = c.program_id
    where p.business_id = requested_business_id and e.kind = 'stamp' and e.created_at >= previous_start

    union all
    select 'shared_views', viewed_at
    from public.page_views
    where business_id = requested_business_id and source = 'share' and viewed_at >= previous_start

    union all
    select 'review_clicks', created_at
    from public.review_link_clicks
    where business_id = requested_business_id and created_at >= previous_start
  ),
  totals as (
    select
      metric,
      count(*) filter (where at >= current_start) as current,
      count(*) filter (where at < current_start) as previous
    from events
    group by metric
  ),
  daily as (
    select
      d::date as day,
      count(*) filter (where e.metric in ('profile_views', 'offer_views')) as views,
      count(*) filter (where e.metric = 'claims') as claims,
      count(*) filter (where e.metric = 'used') as used
    from generate_series(current_start, date_trunc('day', now()), interval '1 day') as d
    left join events e
      on e.at >= d and e.at < d + interval '1 day'
    group by d
    order by d
  )
  select jsonb_build_object(
    'days', days,
    'totals', coalesce((select jsonb_object_agg(metric, jsonb_build_object('current', current, 'previous', previous)) from totals), '{}'::jsonb),
    'daily', coalesce((select jsonb_agg(jsonb_build_object('day', day, 'views', views, 'claims', claims, 'used', used)) from daily), '[]'::jsonb)
  )
  into result;

  return result;
end;
$$;

revoke all on function public.business_analytics(uuid, integer) from public, anon;
grant execute on function public.business_analytics(uuid, integer) to authenticated;

-- Views and shared-link views per promotion over the last 30 days, for the
-- share panel in the promotions list. Members of the business only.
create or replace function public.offer_view_counts(requested_business_id uuid)
returns table (
  offer_id uuid,
  views bigint,
  shared_views bigint
)
language sql
stable
security definer
set search_path = public
as $$
  select
    pv.offer_id,
    count(*),
    count(*) filter (where pv.source = 'share')
  from public.page_views pv
  where pv.business_id = requested_business_id
    and pv.offer_id is not null
    and pv.viewed_at > now() - interval '30 days'
    and public.is_business_member(requested_business_id, 'member')
  group by pv.offer_id;
$$;

revoke all on function public.offer_view_counts(uuid) from public, anon;
grant execute on function public.offer_view_counts(uuid) to authenticated;
