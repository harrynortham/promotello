-- The proof is not the thing to charge for.
--
-- The monthly report, and the first-visit split inside it — "41 first
-- timers, 12 came back" — were Growth only. The roadmap calls that split
-- the number nobody else can print and worth more than every parked
-- feature put together, and we were showing it to the businesses least
-- in need of convincing while the Free one decided whether to pay by
-- going and looking at a dashboard (docs/LAUNCH-FUNNEL.md).
--
-- So the report now goes to every approved business. What Growth keeps
-- is the detail: all seven metrics with last month beside each one.
-- Free and Pro get the headline, who came back, and the one thing to do
-- next. Charge for the actions, never for the evidence.
--
-- Generated from the deployed definition rather than retyped: only the
-- `due` filter and one key in the payload are new.

CREATE OR REPLACE FUNCTION public.claim_monthly_reports(report_month date)
 RETURNS TABLE(business_id uuid, business_name text, emails text[], figures jsonb)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
      -- Every approved business, not only Growth. The report is the
      -- proof, and the business that most needs it is the one deciding
      -- whether to pay (docs/LAUNCH-FUNNEL.md).
      --
      -- A business that did not exist during the month is not reported
      -- on: "nothing came through Promotello in October" to somebody
      -- who joined in November is a bad first impression of a true
      -- sentence. The Growth-only gate was hiding this.
      and b.created_at < month_end
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
      -- Which report to write. Growth gets every number with last month
      -- beside it; everyone else gets the headline, who came back, and
      -- one thing to do about it.
      'full_report', public.business_has_growth(d.business_id),
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
$function$
;
