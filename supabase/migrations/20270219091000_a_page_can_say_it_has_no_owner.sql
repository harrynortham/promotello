-- Whether a business page is still waiting to be claimed.
--
-- The public page wants to say so — "this is yours, come and take it"
-- is the whole of the sales pitch, and the cover is where somebody who
-- runs the place will look first.
--
-- It cannot read business_previews to find out. That table is admin
-- only, and deliberately: a row holds the claim token, and the token is
-- the credential. Anybody who could read one could take over a business
-- they have nothing to do with.
--
-- So this answers the question and nothing else. A boolean, from inside,
-- with no way to ask it for the token — the same shape as
-- business_has_pro and holds_redemption_for.
create or replace function public.business_is_unclaimed(requested_business_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
    select exists (
        select 1
        from public.business_previews p
        where p.business_id = requested_business_id
          and p.claimed_at is null
    );
$$;

comment on function public.business_is_unclaimed(uuid) is
    'True while a preview-built business has not been claimed. Deliberately narrow: business_previews holds the claim token and stays admin-only.';

grant execute on function public.business_is_unclaimed(uuid) to anon, authenticated;
