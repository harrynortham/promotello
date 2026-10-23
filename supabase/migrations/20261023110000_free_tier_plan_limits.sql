-- Free tier: a business without a Pro subscription may have 1 live offer.
-- Pro (trialing, active, or past_due while Stripe retries) is unlimited.
--
-- An offer counts towards the limit while it is pending or approved, not
-- expired, and not paused. Pending offers count so that approving one can
-- never push a free business over its limit.

alter table public.offers
  add column if not exists plan_paused_at timestamptz;

comment on column public.offers.plan_paused_at is
  'Set when the offer is hidden because the business is over its plan limit. Cleared on upgrade.';

-- ---------------------------------------------------------------------------
-- Plan lookup
-- ---------------------------------------------------------------------------

create or replace function public.business_has_pro(
  requested_business_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.subscriptions s
    where s.business_id = requested_business_id
      and s.status in ('trialing', 'active', 'past_due')
  );
$$;

revoke all on function public.business_has_pro(uuid)
from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Enforce the free offer limit on every insert and update
-- ---------------------------------------------------------------------------

create or replace function public.enforce_offer_plan_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  other_live_offers integer;
begin
  if new.business_id is null
     or new.approval_status not in ('pending', 'approved')
     or new.expires_at < current_date
     or new.plan_paused_at is not null then
    return new;
  end if;

  -- Already counted before this update, so edits to a live offer are fine.
  if tg_op = 'UPDATE'
     and old.business_id = new.business_id
     and old.approval_status in ('pending', 'approved')
     and old.expires_at >= current_date
     and old.plan_paused_at is null then
    return new;
  end if;

  if public.business_has_pro(new.business_id) then
    return new;
  end if;

  -- Serialise concurrent offer changes for this business.
  perform 1
  from public.businesses
  where id = new.business_id
  for update;

  select count(*)
  into other_live_offers
  from public.offers
  where business_id = new.business_id
    and id <> new.id
    and approval_status in ('pending', 'approved')
    and expires_at >= current_date
    and plan_paused_at is null;

  if other_live_offers >= 1 then
    raise exception using
      errcode = 'P0004',
      message = 'The Free plan includes 1 live offer. Upgrade to Pro for unlimited offers.';
  end if;

  return new;
end;
$$;

drop trigger if exists offers_enforce_plan_limit on public.offers;

create trigger offers_enforce_plan_limit
before insert or update on public.offers
for each row
execute function public.enforce_offer_plan_limit();

-- ---------------------------------------------------------------------------
-- Pause or restore offers when a business changes plan. Called by the
-- Stripe webhook after every subscription sync.
-- ---------------------------------------------------------------------------

create or replace function public.apply_business_plan(
  requested_business_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.business_has_pro(requested_business_id) then
    update public.offers
    set plan_paused_at = null
    where business_id = requested_business_id
      and plan_paused_at is not null;

    return;
  end if;

  -- On Free, keep the newest live offer and pause the rest.
  update public.offers
  set plan_paused_at = now()
  where business_id = requested_business_id
    and plan_paused_at is null
    and approval_status in ('pending', 'approved')
    and expires_at >= current_date
    and id <> (
      select o.id
      from public.offers o
      where o.business_id = requested_business_id
        and o.plan_paused_at is null
        and o.approval_status in ('pending', 'approved')
        and o.expires_at >= current_date
      order by o.created_at desc
      limit 1
    );
end;
$$;

revoke all on function public.apply_business_plan(uuid)
from public, anon, authenticated;

grant execute on function public.apply_business_plan(uuid)
to service_role;

-- ---------------------------------------------------------------------------
-- Paused offers are hidden from the public and can't be redeemed
-- ---------------------------------------------------------------------------

drop policy if exists offers_public_select_approved on public.offers;

create policy offers_public_select_approved
on public.offers
for select
to anon, authenticated
using (
  approval_status = 'approved'
  and expires_at >= current_date
  and plan_paused_at is null
  and exists (
    select 1
    from public.businesses business
    where business.id = offers.business_id
      and business.approval_status = 'approved'
  )
);

create or replace function public.redeem_offer(
  requested_offer_id uuid
)
returns public.offer_redemptions
language plpgsql
security definer
set search_path = public
as $$
declare
  selected_offer public.offers;
  new_redemption public.offer_redemptions;
begin
  if auth.uid() is null then
    raise exception using
      errcode = '42501',
      message = 'Authentication is required';
  end if;

  /*
    Lock the offer row while checking and updating its limit.
    This prevents two customers from exceeding the limit at the same time.
  */
  select o.*
  into selected_offer
  from public.offers o
  join public.businesses b
    on b.id = o.business_id
  where o.id = requested_offer_id
    and o.approval_status = 'approved'
    and o.expires_at >= current_date
    and o.plan_paused_at is null
    and b.approval_status = 'approved'
  for update;

  if selected_offer.id is null then
    raise exception using
      errcode = 'P0002',
      message = 'This offer is not available';
  end if;

  if selected_offer.max_redemptions is not null
     and selected_offer.redemption_count >= selected_offer.max_redemptions then
    raise exception using
      errcode = 'P0003',
      message = 'This offer has been fully claimed';
  end if;

  insert into public.offer_redemptions (
    offer_id,
    user_id,
    redeemed_at
  )
  values (
    requested_offer_id,
    auth.uid(),
    now()
  )
  returning * into new_redemption;

  update public.offers
  set redemption_count = redemption_count + 1
  where id = requested_offer_id;

  return new_redemption;

exception
  when unique_violation then
    raise exception using
      errcode = '23505',
      message = 'You have already redeemed this offer';
end;
$$;

-- ---------------------------------------------------------------------------
-- Bring existing businesses (all currently without a subscription) in line
-- ---------------------------------------------------------------------------

select public.apply_business_plan(id)
from public.businesses;
