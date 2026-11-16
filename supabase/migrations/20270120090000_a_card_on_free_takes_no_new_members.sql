-- A stamp card on Free keeps its holders and takes nobody new.
--
-- Until now the Free plan stopped a business *starting* a card
-- (enforce_loyalty_plan, a trigger on loyalty_programs) and did nothing
-- about joining one. So a business whose trial lapsed kept a fully
-- working card: existing holders kept collecting, and new customers
-- went on joining from its page as though nothing had happened. The
-- half of Pro that does the selling carried on being given away.
--
-- The line is drawn where it costs a customer nothing:
--
--   * Somebody already holding a card is untouched. They keep their
--     stamps, staff keep adding to them, and a card that fills is still
--     handed over to the open programme — that handover inserts into
--     loyalty_cards directly (20261226090000), not through either
--     function here, so it is deliberately out of reach of this check.
--   * Somebody new is turned away, in words that are about the card
--     rather than about the business's billing.
--
-- The promise this keeps is the one in 20261207110000: a stamp
-- collected is never taken away. Nothing here touches a card that
-- already exists.

create or replace function public.join_loyalty_program(requested_program_id uuid)
returns loyalty_cards
language plpgsql
security definer
set search_path = public
as $$
declare
  card public.loyalty_cards;
  owner uuid;
begin
  if auth.uid() is null then
    raise exception using errcode = '42501', message = 'Please sign in to join';
  end if;

  select p.business_id
  into owner
  from public.loyalty_programs p
  join public.businesses b on b.id = p.business_id
  where p.id = requested_program_id
    and p.is_active
    and p.closed_at is null
    and b.approval_status = 'approved';

  if owner is null then
    raise exception using errcode = 'P0002', message = 'This loyalty card is not available';
  end if;

  select *
  into card
  from public.loyalty_cards
  where program_id = requested_program_id
    and user_id = auth.uid();

  -- Already theirs: hand it back whatever the business is paying. Their
  -- stamps are not the business's billing arrangement.
  if found then
    return card;
  end if;

  if not public.business_has_pro(owner) then
    raise exception using errcode = 'P0010',
      message = 'This loyalty card is not taking new members at the moment';
  end if;

  insert into public.loyalty_cards (program_id, user_id)
  values (requested_program_id, auth.uid())
  on conflict (program_id, user_id) do nothing;

  select *
  into card
  from public.loyalty_cards
  where program_id = requested_program_id
    and user_id = auth.uid();

  return card;
end;
$$;

create or replace function public.join_loyalty_program_as_guest(
  requested_program_id uuid,
  requested_name text,
  requested_email text
)
returns loyalty_cards
language plpgsql
security definer
set search_path = public
as $$
declare
  clean_name text := btrim(coalesce(requested_name, ''));
  clean_email text := lower(btrim(coalesce(requested_email, '')));
  card public.loyalty_cards;
  owner uuid;
begin
  if clean_name = '' or clean_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then
    raise exception using errcode = '22023', message = 'A name and an email address are needed';
  end if;

  select p.business_id
  into owner
  from public.loyalty_programs p
  join public.businesses b on b.id = p.business_id
  where p.id = requested_program_id
    and p.is_active
    and p.closed_at is null
    and b.approval_status = 'approved';

  if owner is null then
    raise exception using errcode = 'P0002', message = 'This loyalty card is not available';
  end if;

  -- Someone who already has an account for this email should sign in: their
  -- stamps belong on that card, not on a second one.
  if exists (
    select 1
    from public.loyalty_cards existing
    join auth.users u on u.id = existing.user_id
    where existing.program_id = requested_program_id
      and lower(u.email) = clean_email
  ) then
    raise exception using errcode = '42501', message = 'Please sign in to use your card';
  end if;

  -- Joining again with the same email returns the card they already have,
  -- which is theirs on any plan.
  select * into card
  from public.loyalty_cards
  where program_id = requested_program_id
    and user_id is null
    and lower(guest_email) = clean_email;

  if found then
    return card;
  end if;

  if not public.business_has_pro(owner) then
    raise exception using errcode = 'P0010',
      message = 'This loyalty card is not taking new members at the moment';
  end if;

  insert into public.loyalty_cards (program_id, user_id, guest_name, guest_email, guest_token)
  values (requested_program_id, null, left(clean_name, 80), clean_email, gen_random_uuid())
  returning * into card;

  return card;
end;
$$;
