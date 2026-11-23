-- Two ways a loyalty card stops, and which column says which.
--
-- A card has two separate off switches and they do different things:
--
--   closed_at    The business replaced it. Nobody new may join, and
--                everybody already holding one carries on stamping to
--                the end — the same courtesy a paper card gets when the
--                design changes
--                (20261226090000_a_closed_card_gets_one_last_lap.sql).
--
--   is_active    The card was turned off. Not a succession, and not a
--                promise anyone is still collecting against.
--
-- So a business can hold several rows with is_active true, one open and
-- the rest closed behind it, and that is correct rather than duplicate
-- data. Reading is_active on its own and taking it for "you can join
-- this" is the mistake the shape invites, and it is a quiet one: the
-- query returns rows, they just are not the card on offer.
--
-- The code already gets this right — join-loyalty.ts, the business page,
-- the staff guide, what-is-paused.ts and plan-standing.ts all ask for
-- is_active together with closed_at is null. Nothing changes here. The
-- comments are so the next person to open the table in a SQL client,
-- rather than in the code, is told the same thing the code knows.

comment on column public.loyalty_programs.is_active is
    'The card is switched on. Not the same as open to new members: a card may be active and closed_at set, which means it is still being stamped by the people holding it but takes nobody new. To find the card on offer, ask for is_active and closed_at is null together.';

comment on column public.loyalty_programs.closed_at is
    'When the business replaced this card. Set means no new members; everyone already collecting keeps stamping it to the end, and a stamp or redemption hands them the open card (20261226090000_a_closed_card_gets_one_last_lap.sql). Null means this is the card on offer.';
