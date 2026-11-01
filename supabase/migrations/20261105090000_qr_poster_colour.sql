-- The colour of a QR code's printed poster: its header band and the pill
-- above the headline. Defaults to navy, the colour every poster used
-- before, so existing codes print exactly as they did.

alter table public.qr_codes
  add column if not exists poster_colour text not null default 'navy'
    check (poster_colour in ('navy', 'coral', 'forest', 'plum', 'ocean', 'charcoal'));

comment on column public.qr_codes.poster_colour is
  'Named colour for the printed poster; see lib/loyalty-design.ts.';
