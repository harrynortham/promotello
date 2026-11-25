-- The link to put in a DM.
--
-- Two ways to claim a page exist and neither suits an Instagram
-- message. The claim panel on /@theirhandle files a request somebody
-- has to release, which is right for a stranger who found the page and
-- wrong for a business we deliberately wrote to. The preview link
-- claims in one tap, which is right, and looks like this:
--
--   promotello.com/business/preview/jinzu-6f0f7c1e-...-9ab2
--
-- Nobody opens that from a DM. It reads as the thing every message
-- about "your business listing" turns out to be.
--
-- So the token travels on the address that reads as theirs:
--
--   promotello.com/@jinzu?c=6f0f7c1e-...-9ab2
--
-- Same token, same one tap, same proof — the secret in the link is
-- what says this person was written to on purpose. This function is
-- the check, and it tells a caller nothing it did not already supply:
-- a yes or a no about a token it already holds.

create or replace function public.preview_token_is(
  requested_business_id uuid,
  candidate uuid
)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.business_previews p
    where p.business_id = requested_business_id
      and p.token = candidate
      and p.claimed_at is null
      -- The same 90 days claim_business_preview() enforces. A link
      -- that would be refused on the next screen must not be offered
      -- on this one.
      and p.created_at > timezone('utc', now()) - interval '90 days'
  );
$$;

comment on function public.preview_token_is(uuid, uuid) is
  'Whether this token claims this business. Answers only about a token the caller already has.';

revoke all on function public.preview_token_is(uuid, uuid) from public;
grant execute on function public.preview_token_is(uuid, uuid) to anon, authenticated;
