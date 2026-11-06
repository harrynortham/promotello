-- The line under the headline on an offer poster. It was the offer's
-- title, which is usually the discount said twice; the description is
-- what a passer-by actually needs to read.
--
-- Written by the business when the poster is made, starting from the
-- offer's own description. Null means use the offer's description as it
-- stands, which is what every poster made before this does.

alter table public.qr_codes
  add column if not exists poster_description text;

alter table public.qr_codes
  drop constraint if exists qr_codes_poster_description_check;

-- 140 characters: the longest description live today is 105, and the
-- poster gives this line three lines of space before it crowds the code.
alter table public.qr_codes
  add constraint qr_codes_poster_description_check
  check (
    poster_description is null
    or (char_length(trim(both from poster_description)) between 1 and 140)
  );
