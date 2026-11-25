-- What their page could carry.
--
-- A preview has always held two sample lines -- an offer and a loyalty
-- reward, written by whoever built the lead -- and until now the only
-- place they appeared was the old preview page. The link we put in a
-- DM goes to /@theirhandle, which shows a business its name, its words
-- and a map, and leaves the actual pitch to a sentence.
--
-- So the examples go on it: this is the offer you could be running and
-- the card people could be collecting. It is a mock-up of their own
-- page, which is a better argument than any description of one.
--
-- Only with the token. Anybody can open /@theirhandle -- it is
-- unlisted, not secret -- and an example offer on a page for a real
-- café is something somebody can walk in and ask for. The token is
-- what says this reader is the business, and nobody else sees a
-- pastry that was never on.
--
-- preview_token_is() stays. Nothing calls it after this, but it is a
-- function the deployed code is using right now, and dropping it in
-- the same migration that replaces it would break one-tap claiming in
-- the window between shipping this and the code going out.

create or replace function public.preview_examples(
  requested_business_id uuid,
  candidate uuid
)
returns table (sample_offer text, sample_reward text, sample_stamps integer)
language sql
security definer
set search_path = public
stable
as $$
  select p.sample_offer, p.sample_reward, p.sample_stamps
  from public.business_previews p
  where p.business_id = requested_business_id
    and p.token = candidate
    and p.claimed_at is null
    -- The same 90 days claim_business_preview() enforces: a link that
    -- would be refused on the next screen shows nothing on this one.
    and p.created_at > timezone('utc', now()) - interval '90 days';
$$;

comment on function public.preview_examples(uuid, uuid) is
  'The sample offer and card for an unclaimed preview, to whoever holds its token. Returns nothing otherwise.';

revoke all on function public.preview_examples(uuid, uuid) from public;
grant execute on function public.preview_examples(uuid, uuid) to anon, authenticated;
