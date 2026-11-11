-- How a poster is arranged, as well as what colour it is.
--
-- A poster had one arrangement — a colour band with the name in it, the
-- words in the middle, the code under them — and the only choice was
-- which colour the band was. The same sheet has to work stuck inside a
-- window, propped on a table and pinned by a till, and those want
-- different things: one is read from the pavement, one is already in
-- somebody's hand.
--
-- 'classic' is what every existing poster is, so they all print exactly
-- as they did.
--
-- Paper is not here on purpose. A4, A5 and two-to-a-sheet are decided
-- when the poster is printed, not when the code is made, and any of
-- them can be printed any of those ways.

alter table public.qr_codes
  add column if not exists poster_layout text not null default 'classic'
    check (poster_layout in ('classic', 'code_first', 'bold', 'minimal'));

comment on column public.qr_codes.poster_layout is
  'How the printed poster is arranged; see components/qr-poster.tsx.';
