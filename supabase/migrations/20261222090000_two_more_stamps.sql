-- Two more stamps to collect.
--
-- A tick, a star, a heart, a coffee and a gift between them cover a café
-- and not much else. Scissors are for the barbers and salons on every
-- high street we are selling to, and a bag is for the shops and
-- takeaways beside them — a stamp that looks like what you sell is
-- worth more than a tick.

alter table public.loyalty_programs drop constraint if exists loyalty_programs_stamp_icon_check;

alter table public.loyalty_programs
  add constraint loyalty_programs_stamp_icon_check
  check (stamp_icon in ('check', 'star', 'heart', 'coffee', 'gift', 'scissors', 'bag'));
