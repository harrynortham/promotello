-- Monthly value report (Growth): on the 1st, each Growth business's owners
-- get an email summing up last month against the month before.

-- One report per business per month, recorded before sending.
create table if not exists public.monthly_report_sends (
  business_id uuid not null
    references public.businesses (id)
    on delete cascade,

  month date not null,
  sent_at timestamptz not null default timezone('utc', now()),

  primary key (business_id, month)
);

alter table public.monthly_report_sends enable row level security;

-- No policies: server only.

-- Claims this month's reports and returns what each one needs: the
-- business, its owners' email addresses and the figures. Server only.
create or replace function public.claim_monthly_reports(report_month date)
returns table (
  business_id uuid,
  business_name text,
  emails text[],
  figures jsonb
)
language plpgsql
security definer
set search_path = public
as $$
#variable_conflict use_column
declare
  month_start timestamptz := timezone('Europe/London', date_trunc('month', report_month)::timestamp);
  month_end timestamptz := timezone('Europe/London', (date_trunc('month', report_month) + interval '1 month')::timestamp);
  previous_start timestamptz := timezone('Europe/London', (date_trunc('month', report_month) - interval '1 month')::timestamp);
begin
  return query
  with due as (
    insert into public.monthly_report_sends (business_id, month)
    select b.id, date_trunc('month', report_month)::date
    from public.businesses b
    where b.approval_status = 'approved'
      and not coalesce(b.is_sample, false)
      and public.business_has_growth(b.id)
    on conflict do nothing
    returning monthly_report_sends.business_id
  ),
  counts as (
    select
      d.business_id,
      metric,
      count(*) filter (where at >= month_start and at < month_end) as current,
      count(*) filter (where at >= previous_start and at < month_start) as previous
    from due d
    cross join lateral (
      select 'views' as metric, viewed_at as at from public.page_views pv
      where pv.business_id = d.business_id and viewed_at >= previous_start
      union all
      select 'qr_scans', s.scanned_at from public.qr_scans s
      join public.qr_codes q on q.id = s.qr_code_id
      where q.business_id = d.business_id and s.scanned_at >= previous_start
      union all
      select 'claims', r.redeemed_at from public.offer_redemptions r
      join public.offers o on o.id = r.offer_id
      where o.business_id = d.business_id and r.redeemed_at >= previous_start
      union all
      select 'visits', r.used_at from public.offer_redemptions r
      join public.offers o on o.id = r.offer_id
      where o.business_id = d.business_id and r.used_at >= previous_start
      union all
      select 'visits', e.created_at from public.loyalty_events e
      join public.loyalty_cards c on c.id = e.card_id
      join public.loyalty_programs p on p.id = c.program_id
      where p.business_id = d.business_id and e.kind = 'stamp' and e.created_at >= previous_start
      union all
      select 'visits', v.used_at from public.reward_vouchers v
      where v.business_id = d.business_id and v.used_at >= previous_start
      union all
      select 'loyalty_rewards', e.created_at from public.loyalty_events e
      join public.loyalty_cards c on c.id = e.card_id
      join public.loyalty_programs p on p.id = c.program_id
      where p.business_id = d.business_id and e.kind = 'reward' and e.created_at >= previous_start
      union all
      select 'new_followers', f.created_at from public.business_followers f
      where f.business_id = d.business_id and f.created_at >= previous_start
      union all
      select 'review_clicks', k.created_at from public.review_link_clicks k
      where k.business_id = d.business_id and k.created_at >= previous_start
    ) events
    group by d.business_id, metric
  )
  select
    d.business_id,
    b.name,
    coalesce(
      (select array_agg(u.email::text)
       from public.business_members m
       join auth.users u on u.id = m.user_id
       where m.business_id = d.business_id and m.role = 'owner' and u.email is not null),
      '{}'
    ),
    jsonb_build_object(
      'followers', (select count(*) from public.business_followers f where f.business_id = d.business_id),
      'metrics', coalesce(
        (select jsonb_object_agg(c.metric, jsonb_build_object('current', c.current, 'previous', c.previous))
         from counts c where c.business_id = d.business_id),
        '{}'::jsonb
      )
    )
  from due d
  join public.businesses b on b.id = d.business_id;
end;
$$;

revoke all on function public.claim_monthly_reports(date) from public, anon, authenticated;
grant execute on function public.claim_monthly_reports(date) to service_role;
