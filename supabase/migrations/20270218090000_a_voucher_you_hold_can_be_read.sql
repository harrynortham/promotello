-- A voucher you already hold can still be read
--
-- offers_public_select_approved requires plan_paused_at is null, which
-- is right for the directory: a business on Free should not have three
-- offers showing. It is wrong for somebody who claimed one before it
-- was paused.
--
-- What they saw: their voucher went blank. "Business details
-- unavailable", "Offer details unavailable", the code struck through,
-- and "We can't confirm current availability. Contact the business or
-- support before visiting." It reads as something broken rather than as
-- a plan their coffee shop changed.
--
-- And it was pessimistic as well as ugly. The till still honours it —
-- /redeem/<code> shows the offer in full and marks it used — so the
-- customer was being told to ring ahead about a voucher that works.

-- Asked through a function, not inline.
--
-- The obvious policy — "exists (select 1 from offer_redemptions ...)" —
-- recurses: reading offers consults offer_redemptions, whose own policy
-- consults offers, and Postgres stops with 42P17. SECURITY DEFINER
-- reads the redemption without re-entering RLS, which is the same
-- reason is_business_member exists.
--
-- It takes no user: auth.uid() is read inside, so the answer is always
-- about the caller. Somebody passing another person's offer id learns
-- only whether *they* hold a voucher for it.
create or replace function public.holds_redemption_for(offer uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
    select exists (
        select 1
        from public.offer_redemptions r
        where r.offer_id = offer
          and r.user_id = (select auth.uid())
    );
$$;

-- Narrow on purpose. Not "paused offers are public"; "the one you
-- claimed, to you, because you already had it".
create policy offers_select_own_redemption
on public.offers
for select
to authenticated
using (holds_redemption_for(id));
