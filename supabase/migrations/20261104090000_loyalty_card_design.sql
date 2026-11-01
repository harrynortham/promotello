-- How a business's loyalty card looks to its customers: the colour of the
-- card header and stamps, and which icon a collected stamp shows. Both have
-- defaults matching the card as it looked before, so existing programmes
-- are unchanged.

alter table public.loyalty_programs
  add column if not exists card_colour text not null default 'navy'
    check (card_colour in ('navy', 'coral', 'forest', 'plum', 'ocean', 'charcoal'));

alter table public.loyalty_programs
  add column if not exists stamp_icon text not null default 'check'
    check (stamp_icon in ('check', 'star', 'heart', 'coffee', 'gift'));

comment on column public.loyalty_programs.card_colour is
  'Named colour for the card header and filled stamps; see lib/loyalty-design.ts.';

comment on column public.loyalty_programs.stamp_icon is
  'Named icon shown on a collected stamp; see lib/loyalty-design.ts.';
