-- A plan ending gets an email of its own.
--
-- Cancelling happens in the Stripe portal, and until now the product
-- said nothing at all about it: the subscription quietly stopped, and
-- weeks later offers were dark, followers had stopped hearing from
-- them, and nobody had ever been told which of those was us. The day a
-- plan ends is also the day a business is most likely to come back, and
-- it was passing in silence.
--
-- The email is written in lib/plan-ending.ts and sent from the Stripe
-- webhook, which fires on every subscription event there is — a
-- renewal, a card update, a price change. So it needs somewhere to
-- record that this business has already been told, and
-- business_lifecycle_sends is that place: its primary key is (business,
-- kind), so the insert either takes it or says somebody got there
-- first. All this migration does is let 'plan_ending' be one of the
-- kinds.
--
-- The row is deleted again when they come back (lib/plan-ending.ts,
-- forgetTheEnding), so a business that leaves twice is told twice.

alter table public.business_lifecycle_sends
  drop constraint if exists business_lifecycle_sends_kind_check;

alter table public.business_lifecycle_sends
  add constraint business_lifecycle_sends_kind_check
  check (kind in (
    'welcome',
    'setup_nudge_1',
    'setup_nudge_2',
    'trial_ending',
    'loyalty_pitch',
    'founding_places',
    'results',
    'check_in',
    'plan_ending'
  ));
