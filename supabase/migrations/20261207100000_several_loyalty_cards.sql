-- Room for several loyalty cards per business.
--
-- A unique index allowed a single active programme per business. That
-- index goes, and cards get a name to be told apart by, so the table can
-- hold more than one.
--
-- The dashboard still offers exactly one. Turning that on is a decision
-- rather than a build: joining already takes a programme id, a
-- customer's card belongs to a programme, stamping works from the card,
-- and the business page lists every live card it finds.

-- The name first: the index below is on it.
alter table public.loyalty_programs
  add column if not exists name text not null default 'Loyalty card';

update public.loyalty_programs
set name = 'Loyalty card'
where btrim(coalesce(name, '')) = '';

alter table public.loyalty_programs
  drop constraint if exists loyalty_programs_name_check;

alter table public.loyalty_programs
  add constraint loyalty_programs_name_check
  check (char_length(btrim(name)) between 2 and 60);

-- Safe to drop after the naming above: the index being dropped is what
-- guarantees no business has two live cards to share a default name.
drop index if exists public.loyalty_programs_one_active_idx;

-- Still one row per business and name, so "Coffee card" can't exist
-- twice and a customer choosing between cards sees distinct names.
create unique index if not exists loyalty_programs_name_per_business_idx
  on public.loyalty_programs (business_id, lower(name))
  where is_active;

-- A ceiling rather than a plan limit: nobody runs forty stamp cards, and
-- a runaway loop should not be able to fill a business page with them.
create or replace function public.enforce_loyalty_card_ceiling()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  active_cards integer;
begin
  if not new.is_active then
    return new;
  end if;

  if tg_op = 'UPDATE' and old.is_active then
    return new;
  end if;

  select count(*)
  into active_cards
  from public.loyalty_programs
  where business_id = new.business_id
    and is_active
    and id <> new.id;

  if active_cards >= 10 then
    raise exception using
      errcode = 'P0004',
      message = 'Ten loyalty cards is the most a business can run at once.';
  end if;

  return new;
end;
$$;

drop trigger if exists loyalty_programs_card_ceiling on public.loyalty_programs;

create trigger loyalty_programs_card_ceiling
before insert or update on public.loyalty_programs
for each row
execute function public.enforce_loyalty_card_ceiling();
