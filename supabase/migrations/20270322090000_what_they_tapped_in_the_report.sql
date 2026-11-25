-- What they tapped, in the monthly report.
--
-- bio_taps has been counting every press on a bio link since
-- 20270320090000 and the only place it showed was the screen where a
-- business arranges the page. The report is where a business finds out
-- whether any of this is working, and taps on the link they put in
-- their own bio is the number they will care about most -- it is the
-- one that is about a choice they made rather than about us.
--
-- The whole function is restated because that is how it has always
-- been changed here, and a union branch cannot be added to a function
-- in place. Everything but the one branch below is as it was in
-- 20270112090000.

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
      union all
      -- What was pressed on their bio link. The one number here that
      -- is about the link they chose to put in a bio rather than
      -- about us, which is why it is worth a line of its own.
      select 'bio_taps', t.tapped_at from public.bio_taps t
      where t.business_id = d.business_id and t.tapped_at >= previous_start
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


