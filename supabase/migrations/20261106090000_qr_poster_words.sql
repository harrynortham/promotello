-- The two lines a business can write on its printed poster: the small pill
-- above the headline, and the headline itself. Null means the poster works
-- them out from the offer it points at, as it did before.

alter table public.qr_codes
  add column if not exists poster_eyebrow text
    check (poster_eyebrow is null or char_length(trim(poster_eyebrow)) between 1 and 40);

alter table public.qr_codes
  add column if not exists poster_headline text
    check (poster_headline is null or char_length(trim(poster_headline)) between 1 and 90);

comment on column public.qr_codes.poster_eyebrow is
  'Replaces "Scan for offers" on the printed poster; null uses the default.';

comment on column public.qr_codes.poster_headline is
  'Replaces the poster headline; null uses the offer discount or business name.';
