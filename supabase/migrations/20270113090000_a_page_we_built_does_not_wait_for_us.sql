-- A page we built does not wait for us.
--
-- Approval sits exactly where enthusiasm peaks. A business whose page we
-- built and vetted ourselves still had to finish a checklist, press
-- "Send your page for review", and then wait for us — a dead day in the
-- most fragile part of the funnel, and the one checklist step they could
-- do nothing about (docs/LAUNCH-FUNNEL.md).
--
-- The obvious version of this was to approve on claim, and it is wrong:
-- the claim button says "Free, and nothing goes public until you say
-- so", and that promise is the reason it is safe to press. So the wait
-- goes rather than the choice. They still decide when it goes live. It
-- just goes live when they decide, instead of when we next look.
--
-- Two conditions, both necessary:
--
--   * it is a page we built and they claimed — a cold sign-up has never
--     been read by anyone and still needs to be;
--   * the profile is the five things the send button is locked behind,
--     so an instant approval can never publish a half-finished page.
--
-- Anything else queues exactly as it did.
--
-- The audit trigger logs this as business_approved with the owner as the
-- actor, because they are who asked. The reading is right: the review
-- happened when we built the page, and this is the moment it was
-- accepted.

create or replace function public.request_business_review(requested_business_id uuid)
returns public.businesses
language plpgsql
security definer
set search_path = public
as $$
declare
  business public.businesses;
  ours boolean;
  ready boolean;
begin
  if not public.is_business_member(requested_business_id, 'admin') then
    raise exception using
      errcode = '42501',
      message = 'Only the business can ask for a review';
  end if;

  update public.businesses
  set review_requested_at = timezone('utc', now())
  where id = requested_business_id
    and approval_status = 'pending'
    and review_requested_at is null
  returning * into business;

  if business.id is null then
    raise exception using
      errcode = 'P0009',
      message = 'That business has already been sent for review';
  end if;

  -- A page of ours, claimed by the person now sending it.
  select exists (
    select 1
    from public.business_previews p
    where p.business_id = business.id
      and p.claimed_at is not null
  ) into ours;

  -- The same five the dashboard locks the send button behind. Checked
  -- here as well, because the lock is in a page and this is a function.
  select
    business.logo_url is not null
    and coalesce(btrim(business.description), '') <> ''
    and business.cover_image_url is not null
    and exists (select 1 from public.business_locations l where l.business_id = business.id)
    and exists (select 1 from public.business_hours h where h.business_id = business.id)
  into ready;

  if ours and ready then
    update public.businesses
    set approval_status = 'approved',
        updated_at = timezone('utc', now())
    where id = business.id
    returning * into business;
  end if;

  return business;
end;
$$;
