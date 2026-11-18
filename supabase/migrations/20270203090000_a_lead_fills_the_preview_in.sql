-- The lead's address in the shape the preview asks for
--
-- The preview form wants four things: a street line, a city by name, an
-- area by name, and a postcode it checks against that city's districts.
-- A lead had one free-text blob and a postcode, so "Build the preview"
-- opened an empty form and everything was typed again from the page
-- beside it — which is both the slowest part of the job and where a
-- wrong address comes from.
--
-- The city and the area were already here as city_id and area_id, set by
-- the import. Only the street line was missing, so that is what this
-- adds, and the blob stays as what was found, so a bad split can always
-- be read against the original.
--
-- The backfill splits on commas from the right: postcode, then the city
-- and area that the import already knows, and whatever is left is the
-- street. It is deliberately dumb. It only has to be close enough for
-- somebody to glance at, and address_source already says whether anybody
-- has.

alter table public.leads
  add column if not exists address_line_1 text;

comment on column public.leads.address_line_1 is
  'The street line, in the shape the preview form takes. The city and area come from city_id and area_id; the postcode from postcode.';

-- Everything before the last two comma-separated parts, which are the
-- town and the postcode in almost every address a contact page carries.
update public.leads
set address_line_1 = nullif(btrim(
      regexp_replace(address, ',\s*[^,]+,\s*[^,]*\d[^,]*$', '')
    ), '')
where address is not null
  and address_line_1 is null;
