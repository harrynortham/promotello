-- The coordinates go; the postcode stays
--
-- 20270204090000 looked every postcode up through postcodes.io and kept
-- the coordinates and the ward with it. Nothing ever read them. There is
-- no map on the pipeline and a letter needs a postcode, not a point, so
-- it was a network call on every save and four columns of write-only
-- data — plus an attribution condition to carry and a Northern Ireland
-- licence to keep refusing, both for something nobody looked at.
--
-- The postcode itself stays. That is the part that goes on the envelope,
-- and it still comes from the business's own site or is typed.
--
-- Two rows have coordinates. Losing them costs nothing: a postcode can
-- be looked up again at any time, by anyone, for free — which is the
-- argument for not storing the answer in the first place.

alter table public.leads
  drop column if exists latitude,
  drop column if exists longitude,
  drop column if exists ward,
  drop column if exists located_at;
