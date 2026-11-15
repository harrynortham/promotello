-- A suspension says why too.
--
-- 20270107090000 made a decline carry its reason, and left suspension
-- where it was: accepted by both functions, logged by the audit trigger,
-- shown as a banner on the dashboard — and reachable only by hand in
-- SQL, sending nothing. Something that was live could come off the site
-- without a word to the business whose page it was.
--
-- It has a control now, so it also has the guard the other paths have:
-- taking something down requires a reason, in the same shape and stored
-- in the same two columns. The words for it are their own list in
-- lib/review-reasons.ts — the causes for taking down a live page are
-- about what has happened since, not about how it was written.
--
-- Only the guards change. The updates, the business-must-be-approved
-- check and the clearing on approval are as they were.

create or replace function public.review_business(
  business_id uuid,
  decision text,
  reason text,
  note text
)
returns public.businesses
language plpgsql
security definer
set search_path = public
as $$
declare
  reviewed_business public.businesses;
  tidy_reason text := nullif(btrim(coalesce(reason, '')), '');
  tidy_note text := nullif(btrim(coalesce(note, '')), '');
begin
  if not public.is_platform_admin() then
    raise exception using
      errcode = '42501',
      message = 'Platform administrator access is required';
  end if;

  if decision not in ('approved', 'rejected', 'suspended') then
    raise exception using
      errcode = '22023',
      message = 'Invalid business decision';
  end if;

  -- Taking something down without saying why is the thing being removed,
  -- whether it was ever live or not.
  if decision in ('rejected', 'suspended') and tidy_reason is null then
    raise exception using
      errcode = '22023',
      message = 'Say why it was not approved';
  end if;

  if decision in ('rejected', 'suspended') and tidy_reason = 'other' and tidy_note is null then
    raise exception using
      errcode = '22023',
      message = 'Write what to tell them';
  end if;

  update public.businesses
  set
    approval_status = decision,
    review_reason = case when decision = 'approved' then null else tidy_reason end,
    review_note = case when decision = 'approved' then null else left(tidy_note, 400) end,
    updated_at = timezone('utc', now())
  where id = business_id
  returning * into reviewed_business;

  if reviewed_business.id is null then
    raise exception using
      errcode = 'P0002',
      message = 'Business not found';
  end if;

  return reviewed_business;
end;
$$;

create or replace function public.review_business(business_id uuid, decision text)
returns public.businesses
language plpgsql
security definer
set search_path = public
as $$
begin
  if decision in ('rejected', 'suspended') then
    raise exception using
      errcode = '22023',
      message = 'Say why it was not approved';
  end if;

  return public.review_business(business_id, decision, null, null);
end;
$$;

create or replace function public.review_offer(
  offer_id uuid,
  decision text,
  reason text,
  note text
)
returns public.offers
language plpgsql
security definer
set search_path = public
as $$
declare
  reviewed_offer public.offers;
  business_name text;
  business_status text;
  tidy_reason text := nullif(btrim(coalesce(reason, '')), '');
  tidy_note text := nullif(btrim(coalesce(note, '')), '');
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

  if decision in ('rejected', 'suspended') and tidy_reason is null then
    raise exception using
      errcode = '22023',
      message = 'Say why it was not approved';
  end if;

  if decision in ('rejected', 'suspended') and tidy_reason = 'other' and tidy_note is null then
    raise exception using
      errcode = '22023',
      message = 'Write what to tell them';
  end if;

  -- An offer can only be approved once its business is: the public
  -- policy already requires that, so approving early published nothing
  -- and left the business reading "Approved" on an offer no one could
  -- reach (20261206110000). This covers putting a suspended offer back
  -- as well, which is the same decision.
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
    review_reason = case when decision = 'approved' then null else tidy_reason end,
    review_note = case when decision = 'approved' then null else left(tidy_note, 400) end,
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

create or replace function public.review_offer(offer_id uuid, decision text)
returns public.offers
language plpgsql
security definer
set search_path = public
as $$
begin
  if decision in ('rejected', 'suspended') then
    raise exception using
      errcode = '22023',
      message = 'Say why it was not approved';
  end if;

  return public.review_offer(offer_id, decision, null, null);
end;
$$;
