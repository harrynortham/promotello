-- Quiet-hours offers (Growth): an offer can repeat on chosen weekdays within
-- a time window, e.g. Monday to Thursday, 2pm to 4pm. Customers can claim it
-- any time, but staff can only redeem it inside the window (UK time).

alter table public.offers
  add column if not exists schedule_days smallint[],
  add column if not exists schedule_start time,
  add column if not exists schedule_end time;

alter table public.offers drop constraint if exists offers_schedule_check;

-- Days are 0 (Sunday) to 6 (Saturday). All three are set, or none.
alter table public.offers
  add constraint offers_schedule_check
  check (
    (schedule_days is null and schedule_start is null and schedule_end is null)
    or (
      cardinality(schedule_days) between 1 and 7
      and schedule_days <@ array[0, 1, 2, 3, 4, 5, 6]::smallint[]
      and schedule_start < schedule_end
    )
  );

-- Whether a schedule is open right now, in UK time. No schedule = always.
create or replace function public.offer_schedule_open(
  days smallint[],
  starts time,
  ends time
)
returns boolean
language sql
stable
set search_path = public
as $$
  select days is null
    or (
      extract(dow from timezone('Europe/London', now()))::smallint = any (days)
      and timezone('Europe/London', now())::time >= starts
      and timezone('Europe/London', now())::time < ends
    );
$$;

grant execute on function public.offer_schedule_open(smallint[], time, time) to anon, authenticated;

-- Scheduling an offer needs Growth.
create or replace function public.enforce_offer_schedule_plan()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.schedule_days is not null
     and (tg_op = 'INSERT'
          or old.schedule_days is distinct from new.schedule_days
          or old.schedule_start is distinct from new.schedule_start
          or old.schedule_end is distinct from new.schedule_end)
     and not public.business_has_growth(new.business_id) then
    raise exception using
      errcode = 'P0004',
      message = 'Quiet-hours offers are part of the Growth plan.';
  end if;

  return new;
end;
$$;

drop trigger if exists offers_enforce_schedule_plan on public.offers;

create trigger offers_enforce_schedule_plan
before insert or update on public.offers
for each row
execute function public.enforce_offer_schedule_plan();

-- Marking a voucher used now respects the offer's schedule.
create or replace function public.mark_redemption_used(
  requested_redemption_id uuid
)
returns public.offer_redemptions
language plpgsql
security definer
set search_path = public
as $$
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

  if redemption_offer.id is not null
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
$$;

revoke all on function public.mark_redemption_used(uuid) from public;
grant execute on function public.mark_redemption_used(uuid) to authenticated;

-- Staff lookup also returns the schedule so the scan page can warn.
drop function if exists public.staff_get_redemption(text);

create function public.staff_get_redemption(
  requested_code text
)
returns table (
  redemption_id uuid,
  redemption_code text,
  business_id uuid,
  business_name text,
  offer_title text,
  offer_discount text,
  offer_expires_at date,
  redeemed_at timestamptz,
  used_at timestamptz,
  customer_name text,
  schedule_days smallint[],
  schedule_start time,
  schedule_end time,
  schedule_open boolean
)
language sql
stable
security definer
set search_path = public
as $$
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
    o.schedule_days,
    o.schedule_start,
    o.schedule_end,
    public.offer_schedule_open(o.schedule_days, o.schedule_start, o.schedule_end)
  from public.offer_redemptions r
  join public.offers o on o.id = r.offer_id
  join public.businesses b on b.id = o.business_id
  join auth.users u on u.id = r.user_id
  where r.redemption_code = upper(trim(requested_code))
    and public.is_business_member(o.business_id, 'member');
$$;

revoke all on function public.staff_get_redemption(text) from public, anon;
grant execute on function public.staff_get_redemption(text) to authenticated;
