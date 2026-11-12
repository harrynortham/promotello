-- A loyalty card in the business's own colours.
--
-- The same move as a poster (20261218100000): six named palettes cover
-- most people and none of them is a brand, so 'custom' means look at
-- the two columns below instead. Both have to be there, because half a
-- palette is a stamp nobody chose on a band nobody chose.
--
-- The names stay. They are how most cards are made, and a name survives
-- the palette being restyled.

alter table public.loyalty_programs
  add column if not exists card_header text
    check (card_header is null or card_header ~* '^#[0-9a-f]{6}$'),
  add column if not exists card_accent text
    check (card_accent is null or card_accent ~* '^#[0-9a-f]{6}$');

comment on column public.loyalty_programs.card_header is
  'The business''s own band colour, when card_colour is ''custom''.';
comment on column public.loyalty_programs.card_accent is
  'The colour of the stamps, when card_colour is ''custom''.';

alter table public.loyalty_programs drop constraint if exists loyalty_programs_card_colour_check;

alter table public.loyalty_programs
  add constraint loyalty_programs_card_colour_check
  check (card_colour in ('navy', 'coral', 'forest', 'plum', 'ocean', 'charcoal', 'custom'));

alter table public.loyalty_programs drop constraint if exists loyalty_programs_card_custom_check;

alter table public.loyalty_programs
  add constraint loyalty_programs_card_custom_check
  check (
    card_colour <> 'custom'
    or (card_header is not null and card_accent is not null)
  );

-- Changing the deal carries the look across, so a business that has
-- picked its own colours keeps them on the card that replaces this one.
-- The two colours are optional arguments, and the seven-argument version
-- is dropped rather than left beside this one: two functions of the same
-- name both matching a seven-argument call is ambiguous, and PostgREST
-- would refuse the call rather than choose.
drop function if exists public.replace_loyalty_card(uuid, text, integer, text, text, text, text);

create function public.replace_loyalty_card(
  requested_business_id uuid,
  new_name text,
  new_stamps_required integer,
  new_reward text,
  new_terms text,
  new_card_colour text,
  new_stamp_icon text,
  new_card_header text default null,
  new_card_accent text default null
)
returns public.loyalty_programs
language plpgsql
security definer
set search_path = public
as $$
declare
  card public.loyalty_programs;
begin
  if not public.is_business_member(requested_business_id, 'admin') then
    raise exception using
      errcode = '42501',
      message = 'Only the people who run this business can change its loyalty card';
  end if;

  update public.loyalty_programs
  set closed_at = timezone('utc', now())
  where business_id = requested_business_id
    and is_active
    and closed_at is null;

  insert into public.loyalty_programs (
    business_id, name, stamps_required, reward, terms,
    card_colour, stamp_icon, card_header, card_accent, is_active
  )
  values (
    requested_business_id,
    new_name,
    new_stamps_required,
    new_reward,
    nullif(btrim(coalesce(new_terms, '')), ''),
    new_card_colour,
    new_stamp_icon,
    new_card_header,
    new_card_accent,
    true
  )
  returning * into card;

  return card;
end;
$$;

revoke all on function public.replace_loyalty_card(uuid, text, integer, text, text, text, text, text, text) from public, anon;
grant execute on function public.replace_loyalty_card(uuid, text, integer, text, text, text, text, text, text) to authenticated;
