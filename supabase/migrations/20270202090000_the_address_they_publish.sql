-- Where a lead's address came from
--
-- The import writes what Google returned, and Google's terms let a
-- place_id be kept while restricting the storage of the rest — names,
-- addresses, the lot. 20270131090000 said the row was "ours"; the code
-- was quietly keeping Google's address, which is a gap between what the
-- comment claimed and what ran.
--
-- The fix is not to throw the address away. It is to say where it came
-- from, and to replace it with one we may keep as soon as we can: the
-- business's own contact page, which the enrichment job is already
-- opening to find an email address. That address is better anyway —
-- it is the one they chose to publish, and unlike a registered office
-- it is where the shop actually is, which is what a letter needs.
--
--   places   provisional. Shown, used, and expected to be replaced.
--   website  theirs, published by them, ours to keep.
--   typed    somebody wrote it down after looking.
--
-- A letter should go to an address whose source is not 'places'.

alter table public.leads
  add column if not exists address_source text,
  add column if not exists address_found_at timestamptz;

alter table public.leads
  drop constraint if exists leads_address_source_check;

alter table public.leads
  add constraint leads_address_source_check
  check (address_source is null or address_source in ('places', 'website', 'typed'));

-- Everything already imported came from Places, so say so rather than
-- leaving it unknown: a null source on an existing row would read as
-- "typed by somebody", which is the one thing it is not.
update public.leads
set address_source = 'places'
where address is not null
  and address_source is null;

comment on column public.leads.address_source is
  'places = provisional, from the import and not ours to keep; website = published on their own site; typed = entered by hand.';
