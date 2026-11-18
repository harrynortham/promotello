-- Leads are written down, not imported
--
-- The importer is gone. It asked Google what was trading on a street,
-- and the half of it worth having — the address — was the half the
-- terms would not let us keep (20270204090000). What it actually saved
-- was a name and a website, and the address was typed afterwards
-- anyway, so typing the name as well is barely more work and leaves
-- nothing to explain to anybody.
--
-- The crawler and the Companies House check stay. They do the parts
-- that are genuinely slow by hand: reading a site for an email and an
-- address, and deciding whether a business may be emailed at all.
--
-- place_id stays, unwritten. Three leads carry one from before the
-- importer was removed, and dropping the column would throw away the
-- one thing Google's terms actually allowed us to keep. Nothing writes
-- it now.

comment on table public.leads is
  'Businesses we might write to, entered by hand. Enriched from their own website and from Companies House.';

comment on column public.leads.place_id is
  'From the importer that used to be here. Never written now; kept because existing rows have one, and it is the one piece of Places data the terms allow us to keep.';

-- A lead is 'added' now, not 'imported'. The old word stays allowed:
-- the rows already written with it describe what actually happened, and
-- rewriting history to match the current button would be a lie in an
-- audit trail.
alter table public.lead_events
  drop constraint if exists lead_events_kind_check;

alter table public.lead_events
  add constraint lead_events_kind_check check (kind in (
    'added', 'imported', 'email_found', 'companies_house_checked',
    'preview_built', 'emailed', 'followed_up', 'letter_sent',
    'replied', 'claimed', 'closed', 'note'
  ));
