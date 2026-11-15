-- The guard learns the one exception.
--
-- 20270113090000 made request_business_review approve a page we built
-- when its owner sends it. Running the test against the real database
-- showed it never could: prevent_unauthorized_business_approval refuses
-- any change to approval_status by somebody who is not a platform
-- admin, and SECURITY DEFINER does not help — auth.uid() inside the
-- function is still the business owner, which is the whole point of it.
--
-- The tempting fix is a transaction-local flag the function sets and the
-- trigger trusts. That would be a hole: businesses_update_admins lets a
-- business admin update their own row with any approval_status in it, so
-- this trigger is the only thing standing between a business and
-- approving itself. Anyone can call set_config.
--
-- So the trigger learns the policy instead, in full. The exception is
-- not "this call came from our function" — it is the same set of facts
-- the function checks, which means a direct update is held to exactly
-- the same bar and there is nothing to bypass:
--
--   * pending becoming approved, and nothing else;
--   * a page we built and they claimed;
--   * sent by an owner or admin of it, who asked (review_requested_at);
--   * finished — the five things the send button is locked behind.
--
-- Fail any one of those and it raises exactly as before.

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
       and public.is_business_member(new.id, 'admin')
       and exists (
         select 1
         from public.business_previews p
         where p.business_id = new.id
           and p.claimed_at is not null
       )
       and new.logo_url is not null
       and coalesce(btrim(new.description), '') <> ''
       and new.cover_image_url is not null
       and exists (select 1 from public.business_locations l where l.business_id = new.id)
       and exists (select 1 from public.business_hours h where h.business_id = new.id)
     ) then
    raise exception using
      errcode = '42501',
      message = 'Only platform administrators can change business approval status';
  end if;

  return new;
end;
$$;
