-- Follow them before you write to them
--
-- A cold email from a name nobody has seen is the hardest thing to get
-- opened. Following a shop on Instagram, and saying something true
-- under a photo of their bread, puts the name somewhere before the
-- email arrives — so when it does, it is from somebody they have
-- half-noticed rather than nobody at all.
--
-- It sits after the preview and before the first email, because that is
-- the order it has to happen in to be worth anything: the page exists,
-- then they see the name about, then they hear from us.
--
-- 'social' rather than 'followed', which would read a syllable away
-- from 'followed_up' on a board where both appear.

alter table public.leads
  drop constraint if exists leads_stage_check;

alter table public.leads
  add constraint leads_stage_check check (stage in (
    'new', 'enriched', 'emailable', 'preview', 'social',
    'emailed', 'followed_up', 'letter',
    'claimed', 'not_interested', 'dead'
  ));

-- And the event, so the board can say when it happened rather than only
-- that it did.
alter table public.lead_events
  drop constraint if exists lead_events_kind_check;

alter table public.lead_events
  add constraint lead_events_kind_check check (kind in (
    'added', 'imported', 'email_found', 'companies_house_checked',
    'preview_built', 'followed_social', 'emailed', 'followed_up',
    'letter_sent', 'replied', 'claimed', 'closed', 'note'
  ));
