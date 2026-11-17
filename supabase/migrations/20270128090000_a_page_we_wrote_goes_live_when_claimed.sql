-- A page we wrote goes live when it is claimed, as it was promised
--
-- The preview page said "We wrote this page and checked it before we sent
-- it, so it goes live as soon as you claim it", and the register page said
-- "live, because we've already read it". Neither was true. Claiming left
-- the business `pending` with review_requested_at null — not published, and
-- not even in the queue — and the setup panel beside the claim went on
-- saying "Nothing is public until we've checked it", which was the only
-- honest sentence on the screen.
--
-- The cause is that 20270124090000 reused the three-thing rule from
-- 20270123090000 — description, address, hours — and said so: "The same
-- three as 20270123090000, and for the same reason." The reason is not the
-- same. For a cold sign-up that rule decides when a draft is worth a
-- REVIEWER's time, and all three belong in it. For a claimed preview there
-- is no reviewer: the claim publishes. The question there is whether a page
-- WE wrote and checked is fit to be public, and hours are not what decides
-- that.
--
-- They were never going to be there either. /admin/previews/new collects a
-- name, category, description, website, address, area, postcode, contact,
-- Instagram, a sample offer and two photos — and no hours at all. So the
-- rule could not pass on a preview built the normal way, and every claimed
-- preview took the "incomplete, stay a draft" branch. That branch was
-- written as the unreachable case — a floor under the decision, for a page
-- of ours somehow missing the basics — and it turned out to be the only
-- case. It fired every time.
--
-- So the claim path asks for the two things that make a page a page: words
-- about the business, and where it is. A listing without hours is thinner,
-- not wrong, and the owner adds them during setup minutes later — at which
-- point 20270123090000's triggers are already watching and nothing more is
-- needed.
--
-- The cold sign-up path is untouched. All three are still what joins the
-- queue, because there the rule is doing its original job.

create or replace function public.prevent_unauthorized_business_approval()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.approval_status is distinct from new.approval_status
     and not public.is_platform_admin()
     and not (
       old.approval_status = 'pending'
       and new.approval_status = 'approved'
       and new.review_requested_at is not null
       -- Or no user at all, which is our own server: the approval can
       -- now come from the trigger in 20270123090000, which fires in
       -- whatever session wrote the hours or the address. When that is
       -- the service role — a seed, an admin tool, anything of ours —
       -- auth.uid() is null, is_business_member is false, and this
       -- refused the profile write itself rather than just the
       -- approval. Nothing is loosened by allowing it: who may write
       -- the row at all is businesses_update_admins' decision, and a
       -- session with no user has already had to bypass RLS to get
       -- here, which takes the service key.
       and (auth.uid() is null or public.is_business_member(new.id, 'admin'))
       and exists (
         select 1
         from public.business_previews p
         where p.business_id = new.id
           and p.claimed_at is not null
       )
       -- Two, not three. Hours are the one the preview form never asks
       -- us for, and the one that does not decide whether a page we
       -- wrote is fit to be seen.
       and coalesce(btrim(new.description), '') <> ''
       and exists (select 1 from public.business_locations l where l.business_id = new.id)
     ) then
    raise exception using
      errcode = '42501',
      message = 'Only platform administrators can change business approval status';
  end if;

  return new;
end;
$$;

create or replace function public.claim_business_preview(requested_token uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  preview public.business_previews;
  ready boolean;
begin
  if auth.uid() is null then
    raise exception using errcode = '42501', message = 'Please sign in to claim this business.';
  end if;

  select * into preview
  from public.business_previews
  where token = requested_token
    and created_at > timezone('utc', now()) - interval '90 days'
  for update;

  if preview.business_id is null then
    raise exception using errcode = 'P0002', message = 'This link has expired. Get in touch and we''ll send a new one.';
  end if;

  if preview.claimed_at is not null then
    if preview.claimed_by = auth.uid() then
      return preview.business_id;
    end if;

    raise exception using errcode = '42501', message = 'This business has already been claimed.';
  end if;

  insert into public.business_members (business_id, user_id, role)
  values (preview.business_id, auth.uid(), 'owner')
  on conflict (business_id, user_id)
  do update set role = 'owner', updated_at = timezone('utc', now());

  delete from public.business_members
  where business_id = preview.business_id
    and user_id <> auth.uid();

  update public.business_previews
  set claimed_at = timezone('utc', now()), claimed_by = auth.uid()
  where business_id = preview.business_id;

  -- Two, not the three in 20270123090000: words about the business, and
  -- where it is. That rule decides when a cold sign-up's draft is worth a
  -- reviewer's time. This decides whether a page we wrote and checked is fit
  -- to be public, which hours do not answer — and which the preview form
  -- never collects, so asking for them here refused every claim.
  select
    coalesce(btrim(b.description), '') <> ''
    and exists (select 1 from public.business_locations l where l.business_id = b.id)
  into ready
  from public.businesses b
  where b.id = preview.business_id;

  -- A page with nothing written about it and nowhere to go is still not
  -- a listing, and stays a draft: review_requested_at is what the admin
  -- queue is built on, so stamping it here would put a half-written
  -- page in front of a reviewer, and tell its owner it was "Pending
  -- approval" when nobody was looking at it and the work was theirs.
  -- The triggers in 20270123090000 pick it up the moment it becomes
  -- one, and approve it then.
  if coalesce(ready, false) then
    update public.businesses
    set review_requested_at = coalesce(review_requested_at, timezone('utc', now())),
        approval_status = 'approved',
        updated_at = timezone('utc', now())
    where id = preview.business_id
      and approval_status = 'pending'
      and closed_at is null;
  end if;

  return preview.business_id;
end;
$$;
