-- The line an envelope needs between the street and the town
--
-- leads had a street, a town and a postcode, and an area. The area is
-- Promotello's own grouping — what a customer browses — and the list of
-- them is two different kinds of thing at once: Horfield, Bishopston and
-- Redland are places the Post Office knows, while Gloucester Road, North
-- Street, Stokes Croft and City Centre are ways of saying where
-- something is that no envelope will take.
--
-- A shop on Gloucester Road is postally in Horfield or in Bishopston
-- depending which end of it they are, and both are wrong as a browsing
-- category — "Gloucester Road" is exactly what somebody looking for a
-- coffee means. So the area stays what it is, and this is the other
-- thing:
--
--   140 Gloucester Road      address_line_1
--   Horfield                 address_line_2   <- this
--   Bristol                  the city
--   BS7 8NZ                  postcode
--
-- Named address_line_2 because that is what it is called everywhere it
-- is going: business_locations has the column, the business edit form
-- has the field, and create_business_with_owner takes it as
-- location_address_line_2 — which building a preview has been passing as
-- null for want of anywhere to get it from.

alter table public.leads
  add column if not exists address_line_2 text;

comment on column public.leads.address_line_2 is
  'The locality between the street and the town, for post. Horfield, say. Not the area, which is where they are listed rather than where a letter goes.';
