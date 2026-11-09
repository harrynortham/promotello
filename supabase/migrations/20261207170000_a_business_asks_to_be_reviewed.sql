-- A business asks to be reviewed.
--
-- 20261207160000 kept unclaimed previews out of the approval queue, which was
-- only half the problem. The page we build for a preview is our words, our
-- sample offer and, often, a stock photo from Unsplash standing in for a shop
-- we have never seen. Claiming it means "this account is mine". It does not
-- mean "publish that".
--
-- So the queue stops being "pending" and becomes "pending, and the business
-- has said it is ready". A business signing up for itself has only ever typed
-- its own words, so it asks on the way in, by the column's default. A
-- business we built a page for asks for itself, once it has looked.
--
-- This replaces awaiting_claim, which this migration removes: an unclaimed
-- preview has simply never asked, so the one column says both things.

alter table public.businesses
  add column if not exists review_requested_at timestamptz;

-- Everything already here was already in the queue.
update public.businesses
set review_requested_at = created_at
where review_requested_at is null;

-- Except a page we built that hasn't been approved yet, claimed or not.
-- Nobody has looked at our stand-in photo but us.
update public.businesses b
set review_requested_at = null
where b.approval_status = 'pending'
  and exists (
    select 1
    from public.business_previews p
    where p.business_id = b.id
  );

alter table public.businesses
  alter column review_requested_at set default timezone('utc', now());

create index if not exists businesses_review_requested_idx
  on public.businesses (review_requested_at)
  where review_requested_at is null;

-- A preview's business is created first and the preview a moment later, so
-- the default has already been written by the time we know what it is.
create or replace function public.clear_review_request_for_preview()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.businesses
  set review_requested_at = null
  where id = new.business_id
    and approval_status = 'pending';

  return new;
end;
$$;

drop trigger if exists business_previews_clear_review_request on public.business_previews;

create trigger business_previews_clear_review_request
after insert on public.business_previews
for each row
execute function public.clear_review_request_for_preview();

create or replace function public.request_business_review(requested_business_id uuid)
returns public.businesses
language plpgsql
security definer
set search_path = public
as $$
declare
  business public.businesses;
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

  return business;
end;
$$;

revoke all on function public.request_business_review(uuid) from public, anon;
grant execute on function public.request_business_review(uuid) to authenticated;

-- awaiting_claim said "an unclaimed preview exists". review_requested_at says
-- "nobody has asked yet", which is true of that and of a claimed preview
-- still being looked over, so the narrower column goes.
drop trigger if exists business_previews_sync_awaiting_claim on public.business_previews;
drop function if exists public.sync_awaiting_claim();
drop index if exists public.businesses_awaiting_claim_idx;

alter table public.businesses
  drop column if exists awaiting_claim;

comment on column public.businesses.review_requested_at is
  'When the business asked to be reviewed. Set on the way in for a business that signed itself up; null for a page we built, until its owner has looked at it and sent it. The admin queue is pending businesses where this is not null.';
