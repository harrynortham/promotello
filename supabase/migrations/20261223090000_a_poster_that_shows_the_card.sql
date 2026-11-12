-- Two layouts for a poster that opens a loyalty card.
--
-- "Get a free coffee" on a window tells a passer-by nothing about how
-- they get it: today, or nine visits from now. These two draw the card
-- itself — the band with the shop's name and a row of empty stamps — so
-- the answer is a picture rather than a sentence.
--
-- They are only offered where a code opens a card, and a poster saved
-- with one and later pointed elsewhere falls back to classic when it is
-- drawn.

alter table public.qr_codes drop constraint if exists qr_codes_poster_layout_check;

alter table public.qr_codes
  add constraint qr_codes_poster_layout_check
  check (poster_layout in ('classic', 'code_first', 'bold', 'minimal', 'stamp_card', 'stamp_strip'));
