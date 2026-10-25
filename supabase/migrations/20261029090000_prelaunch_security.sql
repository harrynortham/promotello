-- Pre-launch security review fixes.

-- 1. business_slug_for() is only for the slug trigger. Called directly, it
--    returned any business's area and city by id, including pending
--    businesses and private previews.
revoke all on function public.business_slug_for(public.businesses) from public, anon, authenticated;

-- 2. Team membership changes only through the invitation, hand-over, role
--    and removal functions, which check permissions and log changes. These
--    direct policies let an admin add any user to their team without an
--    invitation, or reassign a membership to someone else.
drop policy if exists business_members_insert_admins on public.business_members;
drop policy if exists business_members_update_admins on public.business_members;
drop policy if exists business_members_delete_admins on public.business_members;

-- 3. Old offer slugs are looked up by canonical_path() (security definer),
--    so nobody needs to read the table, which also held the titles of
--    offers that were never approved.
drop policy if exists offer_slug_history_select_all on public.offer_slug_history;

-- 4. Logos and offer images: images only, up to 5 MB, as the upload forms
--    already say. Without this anyone with a business could upload any
--    file, of any size, to public storage.
update storage.buckets
set
  file_size_limit = 5242880,
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']
where id in ('business-logos', 'offer-images');

-- 5. An approved offer that's edited goes back for review, unless the
--    business is one whose offers are approved automatically (approved
--    and on Pro). Otherwise a harmless offer could be approved and then
--    rewritten into anything.
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
     and not public.is_platform_admin()
     and not public.offer_auto_approvable(new.business_id) then
    new.approval_status := 'pending';
  end if;

  return new;
end;
$$;

revoke all on function public.require_review_of_edited_offer() from public, anon, authenticated;

-- Runs after offers_prevent_unauthorized_approval (triggers fire in name
-- order), which checks the status the business sent.
drop trigger if exists offers_review_edits on public.offers;
create trigger offers_review_edits
before update on public.offers
for each row
execute function public.require_review_of_edited_offer();
