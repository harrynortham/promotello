-- DM'd, and waiting
--
-- Sending one was recorded as an event (20270215090000) but the lead
-- stayed at "Following them", so the board had no tile for it and there
-- was nothing to move a lead to by hand. A DM sent and not answered is
-- a place a lead sits for a fortnight, the same way an email is, and
-- the board is a row of places.
--
-- Between 'social' and 'emailed', which is the order it happens in:
-- follow them, say something true under a photo, then reach out — and a
-- DM is a reaching out, not a watching.
--
-- Every other value is copied from 20270213090000 rather than
-- remembered. 'letter' and 'dead' are not 'letter_sent' and 'closed',
-- which is the mistake this comment exists to stop.

alter table public.leads
  drop constraint if exists leads_stage_check;

alter table public.leads
  add constraint leads_stage_check check (stage in (
    'new', 'enriched', 'emailable', 'preview', 'social', 'dm',
    'emailed', 'followed_up', 'letter',
    'claimed', 'not_interested', 'dead'
  ));
