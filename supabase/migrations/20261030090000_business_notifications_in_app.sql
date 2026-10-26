-- Business notification emails move from Supabase edge functions into the
-- app (lib/business-notifications.ts), so every email uses one sender and
-- one template:
--   daily summary         from the app's daily job, for businesses that
--                         turned it on
--   fully claimed offer   straight after the claim that uses the last one
--   low inventory         straight after a claim that reaches the threshold
-- The old scheduled job that called the send-business-daily-summary edge
-- function is removed.

-- ---------------------------------------------------------------------------
-- The old schedule
-- ---------------------------------------------------------------------------

select cron.unschedule('send-business-daily-summary')
where exists (select 1 from cron.job where jobname = 'send-business-daily-summary');

-- ---------------------------------------------------------------------------
-- Delivery log: offer alerts are per offer, not per day
-- ---------------------------------------------------------------------------

alter table public.business_notification_deliveries
  add column if not exists offer_id uuid references public.offers (id) on delete cascade;

alter table public.business_notification_deliveries
  drop constraint if exists business_notification_delivery_unique;

-- Daily summaries: one per business, day and recipient.
create unique index if not exists business_notification_daily_unique
  on public.business_notification_deliveries (business_id, notification_type, delivery_date, recipient_email)
  where offer_id is null;

-- Offer alerts: one of each kind per offer and recipient, ever.
create unique index if not exists business_notification_offer_unique
  on public.business_notification_deliveries (offer_id, notification_type, recipient_email)
  where offer_id is not null;

-- Owners' and admins' email addresses for a business.
create or replace function public.business_manager_emails(requested_business_id uuid)
returns text[]
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(array_agg(distinct u.email::text), '{}')
  from public.business_members m
  join auth.users u on u.id = m.user_id
  where m.business_id = requested_business_id
    and m.role in ('owner', 'admin')
    and u.email is not null;
$$;

revoke all on function public.business_manager_emails(uuid) from public, anon, authenticated;
grant execute on function public.business_manager_emails(uuid) to service_role;

-- ---------------------------------------------------------------------------
-- Daily summary
-- ---------------------------------------------------------------------------

-- Marks the summaries for one UK day as sent and returns them: per
-- business with the summary turned on and something to report, its
-- offers' vouchers claimed and used that day. Running it twice for the
-- same day returns nothing the second time.
create or replace function public.claim_daily_summaries(summary_date date)
returns table (
  business_id uuid,
  business_name text,
  emails text[],
  offers jsonb,
  claimed integer,
  used integer
)
language plpgsql
security definer
set search_path = public
as $$
#variable_conflict use_column
declare
  day_start timestamptz := timezone('Europe/London', summary_date::timestamp);
  day_end timestamptz := timezone('Europe/London', (summary_date + 1)::timestamp);
begin
  return query
  with activity as (
    select
      o.business_id,
      o.id as offer_id,
      o.title,
      count(*) filter (where r.redeemed_at >= day_start and r.redeemed_at < day_end)::integer as claimed,
      count(*) filter (where r.used_at >= day_start and r.used_at < day_end)::integer as used
    from public.offer_redemptions r
    join public.offers o on o.id = r.offer_id
    join public.business_notification_settings s on s.business_id = o.business_id and s.daily_summary_enabled
    join public.businesses b on b.id = o.business_id and b.approval_status = 'approved' and not coalesce(b.is_sample, false)
    where (r.redeemed_at >= day_start and r.redeemed_at < day_end)
       or (r.used_at >= day_start and r.used_at < day_end)
    group by o.business_id, o.id, o.title
  ),
  totals as (
    select
      a.business_id,
      jsonb_agg(jsonb_build_object('title', a.title, 'claimed', a.claimed, 'used', a.used) order by a.claimed desc, a.used desc) as offers,
      sum(a.claimed)::integer as claimed,
      sum(a.used)::integer as used
    from activity a
    group by a.business_id
  ),
  claimed_rows as (
    insert into public.business_notification_deliveries (business_id, notification_type, delivery_date, recipient_email)
    select t.business_id, 'daily_summary', summary_date, email
    from totals t
    cross join lateral unnest(public.business_manager_emails(t.business_id)) as email
    on conflict do nothing
    returning business_notification_deliveries.business_id, business_notification_deliveries.recipient_email
  )
  select t.business_id, b.name, array_agg(c.recipient_email), t.offers, t.claimed, t.used
  from claimed_rows c
  join totals t on t.business_id = c.business_id
  join public.businesses b on b.id = t.business_id
  group by t.business_id, b.name, t.offers, t.claimed, t.used;
end;
$$;

revoke all on function public.claim_daily_summaries(date) from public, anon, authenticated;
grant execute on function public.claim_daily_summaries(date) to service_role;

-- ---------------------------------------------------------------------------
-- Fully claimed and low inventory alerts
-- ---------------------------------------------------------------------------

-- After a claim: whether the offer has just run out or reached the
-- business's low-inventory threshold, and if so who to tell. Each alert is
-- sent once per offer. Both are on unless the business turned them off.
create or replace function public.claim_offer_stock_alert(requested_offer_id uuid)
returns table (
  kind text,
  business_id uuid,
  business_name text,
  offer_title text,
  remaining integer,
  max_redemptions integer,
  emails text[]
)
language plpgsql
security definer
set search_path = public
as $$
#variable_conflict use_column
declare
  selected public.offers;
  settings public.business_notification_settings;
  claims integer;
  left_over integer;
  alert text;
begin
  select * into selected from public.offers where id = requested_offer_id;

  if selected.id is null or selected.max_redemptions is null then
    return;
  end if;

  select * into settings from public.business_notification_settings s where s.business_id = selected.business_id;
  select count(*) into claims from public.offer_redemptions r where r.offer_id = selected.id;
  left_over := greatest(selected.max_redemptions - claims, 0);

  if left_over = 0 and coalesce(settings.offer_fully_claimed_enabled, true) then
    alert := 'offer_fully_claimed';
  elsif left_over > 0
    and coalesce(settings.low_inventory_enabled, true)
    -- Only when the limit is bigger than the threshold, or a small offer
    -- would alert on its first claim.
    and selected.max_redemptions > coalesce(settings.low_inventory_threshold, 10)
    and left_over <= coalesce(settings.low_inventory_threshold, 10) then
    alert := 'low_inventory';
  else
    return;
  end if;

  return query
  with claimed_rows as (
    insert into public.business_notification_deliveries (business_id, notification_type, delivery_date, recipient_email, offer_id)
    select selected.business_id, alert, current_date, email, selected.id
    from unnest(public.business_manager_emails(selected.business_id)) as email
    on conflict do nothing
    returning recipient_email
  )
  select alert, selected.business_id, b.name, selected.title, left_over, selected.max_redemptions, array_agg(c.recipient_email)
  from claimed_rows c
  join public.businesses b on b.id = selected.business_id
  group by b.name;
end;
$$;

revoke all on function public.claim_offer_stock_alert(uuid) from public, anon, authenticated;
grant execute on function public.claim_offer_stock_alert(uuid) to service_role;
