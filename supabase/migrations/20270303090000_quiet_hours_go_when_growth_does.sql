-- "Quiet hours enforced when scanned" is Growth-only in the feature
-- table, but nothing checked the plan. A business that dropped to Pro
-- or Free kept the restriction: staff still could not mark a voucher
-- used outside the window, for a feature the business had stopped
-- paying for. The wrong way round -- they lost what they were buying
-- and kept what it cost them.
--
-- The columns stay. Pausing rather than clearing is how every other
-- plan limit works here (plan_paused_at), and a business that comes
-- back to Growth gets its hours back exactly as it left them.

create or replace function public.mark_redemption_used(requested_redemption_id uuid)
returns offer_redemptions
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  updated_redemption public.offer_redemptions;
  redemption_offer public.offers;
begin
  if auth.uid() is null then
    raise exception using
      errcode = '42501',
      message = 'Authentication is required';
  end if;

  select o.*
  into redemption_offer
  from public.offer_redemptions r
  join public.offers o on o.id = r.offer_id
  where r.id = requested_redemption_id;

  -- Only while they are on the plan that sells it. Off it, the hours
  -- are still what the offer says and still what customers are told;
  -- they are simply not a thing staff are held to any more.
  if redemption_offer.id is not null
     and public.business_has_growth(redemption_offer.business_id)
     and not public.offer_schedule_open(
       redemption_offer.schedule_days,
       redemption_offer.schedule_start,
       redemption_offer.schedule_end
     ) then
    raise exception using
      errcode = 'P0001',
      message = 'This voucher can only be used during the offer''s set days and times';
  end if;

  update public.offer_redemptions as redemption
  set used_at = coalesce(redemption.used_at, now())
  from public.offers as offer
  where redemption.id = requested_redemption_id
    and redemption.offer_id = offer.id
    and exists (
      select 1
      from public.business_members as member
      where member.business_id = offer.business_id
        and member.user_id = auth.uid()
        and member.role in ('owner', 'admin', 'member')
    )
  returning redemption.*
  into updated_redemption;

  if updated_redemption.id is null then
    raise exception using
      errcode = '42501',
      message = 'Redemption not found or access denied';
  end if;

  return updated_redemption;
end;
$function$;

-- And the screen staff read before pressing the button. Telling them
-- about a window that no longer stops anything would have them turning
-- a customer away for nothing.
create or replace function public.staff_get_redemption(requested_code text)
returns table(
    redemption_id uuid,
    redemption_code text,
    business_id uuid,
    business_name text,
    offer_title text,
    offer_discount text,
    offer_expires_at date,
    redeemed_at timestamp with time zone,
    used_at timestamp with time zone,
    customer_name text,
    schedule_days smallint[],
    schedule_start time without time zone,
    schedule_end time without time zone,
    schedule_open boolean,
    offer_description text,
    offer_terms text
)
language sql
stable
security definer
set search_path to 'public'
as $function$
  select
    r.id,
    r.redemption_code,
    o.business_id,
    b.name,
    o.title,
    o.discount,
    o.expires_at,
    r.redeemed_at,
    r.used_at,
    nullif(split_part(coalesce(u.raw_user_meta_data ->> 'full_name', ''), ' ', 1), ''),
    case when public.business_has_growth(o.business_id) then o.schedule_days end,
    case when public.business_has_growth(o.business_id) then o.schedule_start end,
    case when public.business_has_growth(o.business_id) then o.schedule_end end,
    -- Open, when nothing is being enforced.
    not public.business_has_growth(o.business_id)
      or public.offer_schedule_open(o.schedule_days, o.schedule_start, o.schedule_end),
    o.description,
    o.terms
  from public.offer_redemptions r
  join public.offers o on o.id = r.offer_id
  join public.businesses b on b.id = o.business_id
  join auth.users u on u.id = r.user_id
  where r.redemption_code = upper(trim(requested_code))
    and public.is_business_member(o.business_id, 'member');
$function$;

-- Which of these businesses are on Growth, for the customer's wallet:
-- it holds vouchers from several at once, and a lookup each would be a
-- round trip each. Says nothing about a plan beyond this one fact, and
-- only for businesses the caller asked about.
create or replace function public.businesses_with_growth(requested_ids uuid[])
returns table(business_id uuid)
language sql
stable
security definer
set search_path to 'public'
as $function$
  select b.id
  from public.businesses b
  where b.id = any(requested_ids)
    and public.business_has_growth(b.id);
$function$;

revoke all on function public.businesses_with_growth(uuid[]) from public;
grant execute on function public.businesses_with_growth(uuid[]) to authenticated, service_role;
