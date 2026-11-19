-- A DM is a thing we did, so it goes in the record
--
-- The message was copied out of the lead page and pasted into
-- Instagram, and nothing anywhere knew it had happened. The lead sat at
-- 'social' looking untouched, and a fortnight later the board would say
-- a letter was due — to a business that had already heard from us and
-- not replied, which is a different situation needing a different
-- letter, or none.
--
-- No new stage. A DM happens at 'social', where following them happens;
-- it is the touch that is missing, not the step. Recording it starts
-- the fortnight that makes a letter the next thing.
--
-- Every other value here is copied from 20270213090000 rather than
-- remembered: writing one of these from memory is how 'letter' and
-- 'dead' nearly became 'letter_sent' and 'closed'.

alter table public.lead_events
  drop constraint if exists lead_events_kind_check;

alter table public.lead_events
  add constraint lead_events_kind_check check (kind in (
    'added', 'imported', 'email_found', 'companies_house_checked',
    'preview_built', 'followed_social', 'dm_sent', 'emailed', 'followed_up',
    'letter_sent', 'replied', 'claimed', 'closed', 'note'
  ));
