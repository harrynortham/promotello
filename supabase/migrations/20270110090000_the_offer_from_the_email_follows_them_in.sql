-- The offer from the email follows them in.
--
-- A preview email shows a business a specific offer on a poster and a
-- specific reward on a stamp card — sample_offer, sample_reward and
-- sample_stamps, written by whoever built the preview. Grep those three
-- columns and they appear in the admin form, on the preview page, and in
-- the migrations. Nowhere else. They were never turned into anything.
--
-- So a business reads "2 for 1 on coffee, 9 stamps for a free flat
-- white", thinks yes, that's us, presses Claim — and lands on an empty
-- dashboard with a seven-step checklist asking it to invent an offer.
-- The persuasion and the product are disconnected at the moment of
-- highest intent (docs/LAUNCH-FUNNEL.md).
--
-- This is the way back to those three values. It is a function rather
-- than an RLS policy because the preview row also holds the address we
-- wrote to, the status of the conversation and our own notes about them
-- — none of which is the business's to read. Three columns, to its own
-- members, and only once they have claimed it.

create or replace function public.business_starter_suggestions(requested_business_id uuid)
returns table (sample_offer text, sample_reward text, sample_stamps integer)
language sql
security definer
stable
set search_path = public
as $$
  select p.sample_offer, p.sample_reward, p.sample_stamps
  from public.business_previews p
  where p.business_id = requested_business_id
    and p.claimed_at is not null
    and public.is_business_member(requested_business_id, 'member')
  limit 1;
$$;

comment on function public.business_starter_suggestions(uuid) is
  'The offer and reward we put in this business''s preview email, for its own members to pick up. Three columns only: the rest of the preview row is ours.';

revoke all on function public.business_starter_suggestions(uuid) from public, anon;
grant execute on function public.business_starter_suggestions(uuid) to authenticated;
