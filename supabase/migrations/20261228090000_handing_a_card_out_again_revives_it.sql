-- Handing a card out again brings its holders back with it.
--
-- A closed card finishes once its reward is claimed
-- (20261226090000_a_closed_card_gets_one_last_lap.sql), and finishing
-- was treated as permanent: finished_at on the card, and nothing clears
-- it. That is right while the card stays closed, and wrong the moment a
-- business presses "Start handing this out again".
--
-- The holder was then stranded. Their card takes no stamps because it
-- is finished, and they cannot join the card again because they are
-- already holding one — one card per person per programme. A card on
-- the business's page that one of its customers can never collect on.
--
-- So finishing lasts exactly as long as the closure that caused it.
-- Offering the card again revives every card on it, from wherever its
-- stamps stand, and closing it later lets them finish again — properly,
-- off the stamps they collected in the meantime, rather than instantly
-- off a mark left behind by the first closure.

create or replace function public.revive_cards_offered_again()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.closed_at is not null and new.closed_at is null then
    update public.loyalty_cards
    set finished_at = null
    where program_id = new.id
      and finished_at is not null;
  end if;

  return new;
end;
$$;

drop trigger if exists loyalty_programs_revive_cards on public.loyalty_programs;

create trigger loyalty_programs_revive_cards
after update of closed_at on public.loyalty_programs
for each row
execute function public.revive_cards_offered_again();

-- The cards this has already happened to: finished while the card was
-- closed, and still carrying it now the card is being handed out again.
update public.loyalty_cards c
set finished_at = null
from public.loyalty_programs p
where p.id = c.program_id
  and c.finished_at is not null
  and p.closed_at is null;
