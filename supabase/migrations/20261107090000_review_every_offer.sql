-- Every offer is reviewed before customers see it. Pro and Growth used to
-- skip review for approved businesses, which left a gap: a business could
-- publish anything without a person ever reading it. Plans now buy more
-- offers and more reach, not a way past review.

-- 1. Stop approving offers on insert.
drop trigger if exists offers_auto_approve on public.offers;
drop function if exists public.auto_approve_offer();

-- 2. Only platform admins change an offer's approval status.
create or replace function public.prevent_unauthorized_offer_approval()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.approval_status is distinct from new.approval_status
     and not public.is_platform_admin() then
    raise exception using
      errcode = '42501',
      message = 'Only platform administrators can change offer approval status';
  end if;

  return new;
end;
$$;

-- 3. Editing an approved offer always sends it back for review, so an
--    approved offer cannot be rewritten into something else.
create or replace function public.require_review_of_edited_offer()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.approval_status = 'approved'
     and new.approval_status = 'approved'
     and (
       new.title is distinct from old.title
       or new.description is distinct from old.description
       or new.discount is distinct from old.discount
       or new.terms is distinct from old.terms
       or new.availability is distinct from old.availability
       or new.image_url is distinct from old.image_url
     )
     and not public.is_platform_admin() then
    new.approval_status := 'pending';
  end if;

  return new;
end;
$$;

revoke all on function public.require_review_of_edited_offer() from public, anon, authenticated;

-- 4. Nothing decides approval by plan any more.
drop function if exists public.offer_auto_approvable(uuid);
