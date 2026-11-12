-- A loyalty card says when it last changed.
--
-- Every other table that is written more than once carries updated_at
-- and the shared trigger that keeps it honest
-- (20261012090000_business_foundation.sql). loyalty_cards never did:
-- last_stamped_at covers a stamp and nothing else, so a redemption, a
-- card being finished, or a guest's card being claimed into an account
-- left no trace of when it happened.
--
-- It matters for what comes next. A Wallet pass is a copy of the card
-- living in somebody's phone, and both Apple and Google update one by
-- asking which cards have changed since the last time they asked. There
-- is nothing to answer that with today. There is now, for every way a
-- card can change: all six of them are updates inside SECURITY DEFINER
-- functions, so one trigger covers the lot.

alter table public.loyalty_cards
  add column if not exists updated_at timestamptz not null default timezone('utc', now());

comment on column public.loyalty_cards.updated_at is
  'Any change to the card: a stamp, a reward, being finished, or a guest card claimed into an account. Kept by the set_updated_at trigger.';

-- The column's default has just stamped every existing row with now(),
-- which is a lie about every card that has been sitting still for
-- weeks. The last thing that happened to it is the honest answer.
update public.loyalty_cards
set updated_at = greatest(
  created_at,
  coalesce(last_stamped_at, created_at),
  coalesce(finished_at, created_at)
);

drop trigger if exists loyalty_cards_set_updated_at on public.loyalty_cards;

create trigger loyalty_cards_set_updated_at
before update on public.loyalty_cards
for each row
execute function public.set_updated_at();

-- "What has changed since?" is the only question this column is asked.
create index if not exists loyalty_cards_updated_at_idx
  on public.loyalty_cards (updated_at);
