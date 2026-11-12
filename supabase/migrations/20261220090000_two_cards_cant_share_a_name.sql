-- Two cards with one name read as a mistake.
--
-- Names only had to be distinct among the cards still being offered, so
-- a business could close "Coffee card" and start another "Coffee card".
-- The dashboard then lists one under "Still being collected" and the
-- other as the card on offer, with nothing but their position to tell
-- them apart — and a customer holding the old one sees the same name on
-- a different promise.
--
-- A name is now distinct across every card a business has ever had,
-- closed and switched off included.

-- Existing duplicates first, or the index can't be built. The card still
-- on offer keeps the name; the others say when they stopped being handed
-- out, which is what somebody reading the list wants to know anyway.
with ranked as (
  select
    id,
    name,
    coalesce(closed_at, created_at) as ended,
    row_number() over (
      partition by business_id, lower(name)
      order by (closed_at is null and is_active) desc, created_at
    ) as position
  from public.loyalty_programs
)
update public.loyalty_programs as p
set name = left(p.name, 40) || ' (closed ' || to_char(r.ended, 'FMDD Mon YYYY') || ')'
from ranked as r
where r.id = p.id
  and r.position > 1;

-- Two closed on the same day would still match, so anything left over
-- is numbered.
with ranked as (
  select
    id,
    name,
    row_number() over (
      partition by business_id, lower(name)
      order by created_at
    ) as position
  from public.loyalty_programs
)
update public.loyalty_programs as p
set name = left(p.name, 56) || ' ' || r.position
from ranked as r
where r.id = p.id
  and r.position > 1;

drop index if exists public.loyalty_programs_open_name_idx;

create unique index if not exists loyalty_programs_name_per_business_idx
  on public.loyalty_programs (business_id, lower(name));

comment on index public.loyalty_programs_name_per_business_idx is
  'One name per business across every card it has ever run, so a closed card and the one on offer can never be told apart only by position.';
