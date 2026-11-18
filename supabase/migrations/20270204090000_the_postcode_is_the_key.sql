-- Google discovers, the postcode locates
--
-- 20270202090000 marked the import's address "provisional" and expected
-- enrichment to replace it. Marking is a label, not a mechanism: nothing
-- ever cleared one, so a lead that was never enriched kept Google's
-- address for good. That is storage whatever the next column says, and
-- the terms let us keep a place_id and not the rest.
--
-- So the import stops writing an address at all. What is kept comes from
-- somewhere it may be kept:
--
--   place_id            Google. Exempt, and all we take from them.
--   address_line_1      their own site, or typed.
--   postcode            their own site, or typed.
--   latitude/longitude  postcodes.io, looked up from the postcode.
--   ward                postcodes.io, the same lookup.
--
-- Looked up from the postcode, never the other way round. Reverse
-- geocoding a shop's coordinates returns the nearest postcode centroid:
-- from Joe's Bakery's own coordinates the three nearest are BS7 8PH,
-- BS7 8QN and BS7 8TJ, and the real one, BS7 8NZ, is not among them.
-- Fine for a map, useless on an envelope.
--
-- postcodes.io is Ordnance Survey OpenData and ONS data, free and
-- storable with attribution, which lib/postcodes.ts carries. Northern
-- Ireland is not included: BT postcodes need a licence from Land and
-- Property Services, so they are refused rather than quietly kept.

alter table public.leads
  add column if not exists latitude double precision
    check (latitude is null or latitude between -90 and 90),
  add column if not exists longitude double precision
    check (longitude is null or longitude between -180 and 180),
  add column if not exists ward text,
  add column if not exists located_at timestamptz;

comment on column public.leads.latitude is
  'From postcodes.io, looked up from the postcode. Never from Places.';

-- The addresses already taken from Places. There is no route that turns
-- one into ours, so they go rather than sit there looking decided.
-- Anything found on a business''s own site or typed by hand stays.
update public.leads
set address = null,
    address_line_1 = null,
    address_source = null,
    address_found_at = null
where address_source = 'places';

-- And the source can no longer say 'places', so nothing can put one
-- back without this migration being read first.
alter table public.leads
  drop constraint if exists leads_address_source_check;

alter table public.leads
  add constraint leads_address_source_check
  check (address_source is null or address_source in ('website', 'typed'));
