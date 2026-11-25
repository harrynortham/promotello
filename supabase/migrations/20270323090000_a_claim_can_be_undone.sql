-- Undoing a claim.
--
-- A page we wrote is claimed by pressing one button, and until now
-- there was no way back from it. That is fine for a business claiming
-- its own page and wrong for us: we hold the token for every lead, we
-- open those links to check them, and the button does not ask twice.
-- One misplaced tap turns a page we were about to pitch into a
-- business that has apparently signed up.
--
-- Two things were in the way. The approval guard only ever allowed
-- pending -> approved, so the reverse was refused even for a platform
-- admin; and nothing anywhere knew how to put the preview back.
--
-- What is deliberately NOT undone is the membership row. Whoever built
-- the preview owns the business it created -- that is
-- create_business_with_owner() doing its job, and every unclaimed lead
-- page has exactly that one member. Removing it would leave the page
-- in a state none of its neighbours are in.

-- ---------------------------------------------------------------------------
-- The guard learns the way back
-- ---------------------------------------------------------------------------

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
     )
     -- A claim being undone, which is the same journey backwards. The
     -- preview has already been put back by the time this runs, so
     -- "unclaimed" is the thing being checked, not asserted: nothing
     -- here can send an approved business that nobody previewed back
     -- to pending.
     and not (
       old.approval_status = 'approved'
       and new.approval_status = 'pending'
       and (auth.uid() is null or public.is_platform_admin())
       and exists (
         select 1
         from public.business_previews p
         where p.business_id = new.id
           and p.claimed_at is null
       )
     ) then
    raise exception using
      errcode = '42501',
      message = 'Only platform administrators can change business approval status';
  end if;

  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Putting it back
-- ---------------------------------------------------------------------------

create or replace function public.unclaim_business_preview(requested_business_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  was_claimed timestamptz;
begin
  -- Admin, or our own server with no user on it: the same two the
  -- guard above answers to.
  if auth.uid() is not null and not public.is_platform_admin() then
    raise exception using errcode = '42501', message = 'Admin access is required';
  end if;

  select claimed_at into was_claimed
  from public.business_previews
  where business_id = requested_business_id
  for update;

  -- Nothing to undo. Not an error: a migration that runs against a
  -- database where this business has never existed should do nothing
  -- and say so, rather than refuse to apply.
  if was_claimed is null then
    return false;
  end if;

  -- The preview first. The guard reads it, so it has to be true
  -- before the approval moves.
  update public.business_previews
  set claimed_at = null,
      claimed_by = null
  where business_id = requested_business_id;

  -- The token is left alone on purpose: the link already sent to the
  -- business is the one we want working again, not a new one they have
  -- never seen.
  update public.businesses
  set approval_status = 'pending'
  where id = requested_business_id
    and approval_status = 'approved';

  return true;
end;
$$;

comment on function public.unclaim_business_preview(uuid) is
  'Puts a claimed preview back to an unclaimed page. Platform admins only. Leaves the token and the membership row alone.';

revoke all on function public.unclaim_business_preview(uuid) from public, anon;
grant execute on function public.unclaim_business_preview(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- The one that prompted this
-- ---------------------------------------------------------------------------

-- Jinzu, claimed by accident on 25 November 2026 while checking the
-- page. Nothing had been built on it -- no offers, no card, no
-- subscription, no followers -- so putting the preview back is the
-- whole of the repair. Does nothing anywhere this business does not
-- exist, which is every database but the live one.
do $$
declare
  undone boolean;
begin
  select public.unclaim_business_preview('2ec966c8-9d11-4757-8cba-b0db0a211cf7') into undone;

  if undone then
    raise notice 'Jinzu is an unclaimed page again.';
  end if;
end;
$$;
