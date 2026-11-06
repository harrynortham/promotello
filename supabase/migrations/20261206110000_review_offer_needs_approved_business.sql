-- An offer can only be approved once its business is.
--
-- The public policy on offers already requires an approved business, so
-- approving an offer early published nothing. It left the state lying:
-- the business sees "Approved" on an offer no one can reach, and the
-- offer goes live later without anyone looking at it again, the moment
-- the business is approved.
--
-- Rejecting and suspending stay open whatever the business's status —
-- there is no reason to make someone approve a business first in order
-- to turn down its offer.

create or replace function public.review_offer(offer_id uuid, decision text)
returns offers
language plpgsql
security definer
set search_path = public
as $$
declare
  reviewed_offer public.offers;
  business_name text;
  business_status text;
begin
  if not public.is_platform_admin() then
    raise exception using
      errcode = '42501',
      message = 'Platform administrator access is required';
  end if;

  if decision not in ('approved', 'rejected', 'suspended') then
    raise exception using
      errcode = '22023',
      message = 'Invalid offer decision';
  end if;

  if decision = 'approved' then
    select b.name, b.approval_status into business_name, business_status
    from public.offers o
    join public.businesses b on b.id = o.business_id
    where o.id = offer_id;

    if business_status is distinct from 'approved' then
      raise exception using
        errcode = 'P0003',
        message = format(
          'Approve the business first: %s is %s.',
          coalesce(business_name, 'the business'),
          coalesce(business_status, 'not approved')
        );
    end if;
  end if;

  update public.offers
  set
    approval_status = decision,
    updated_at = timezone('utc', now())
  where id = offer_id
  returning * into reviewed_offer;

  if reviewed_offer.id is null then
    raise exception using
      errcode = 'P0002',
      message = 'Offer not found';
  end if;

  return reviewed_offer;
end;
$$;
