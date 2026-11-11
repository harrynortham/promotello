-- A poster in the business's own colours.
--
-- Six named palettes cover most people and none of them is a brand. A
-- business with a logo already has two colours it uses everywhere, and a
-- poster in anything else looks like it came from somewhere else.
--
-- The names stay, because they are how most posters are made and a name
-- survives a palette being restyled. 'custom' means look at the two
-- columns below instead, and both have to be there: half a palette is
-- white text on a colour nobody chose.
--
-- Hex only, lower or upper case. Anything the picker can produce is six
-- digits, and anything else is somebody writing into the API by hand.

alter table public.qr_codes
  add column if not exists poster_header text
    check (poster_header is null or poster_header ~* '^#[0-9a-f]{6}$'),
  add column if not exists poster_accent text
    check (poster_accent is null or poster_accent ~* '^#[0-9a-f]{6}$');

comment on column public.qr_codes.poster_header is
  'The business''s own band colour, when poster_colour is ''custom''.';
comment on column public.qr_codes.poster_accent is
  'The colour of the pill above the headline, when poster_colour is ''custom''.';

alter table public.qr_codes drop constraint if exists qr_codes_poster_colour_check;

alter table public.qr_codes
  add constraint qr_codes_poster_colour_check
  check (poster_colour in ('navy', 'coral', 'forest', 'plum', 'ocean', 'charcoal', 'custom'));

alter table public.qr_codes drop constraint if exists qr_codes_poster_custom_check;

alter table public.qr_codes
  add constraint qr_codes_poster_custom_check
  check (
    poster_colour <> 'custom'
    or (poster_header is not null and poster_accent is not null)
  );
