-- Joining a loyalty card without an account.
--
-- Signing up at a till does not work: it needs an email, a password and a
-- confirmation link opened in an inbox, with someone waiting to pay. A guest
-- gives a name and an email, gets a card immediately, and keeps it at a link
-- of its own. Signing up later brings the stamps with them.
--
-- Guest cards are ordinary loyalty_cards rows with no user_id, so stamping,
-- rewards and the business's own counts all work unchanged.

alter table public.loyalty_cards
  alter column user_id drop not null;

alter table public.loyalty_cards
  add column if not exists guest_name text,
  add column if not exists guest_email text,
  -- How a guest opens their own card again; it is the whole secret, so it is
  -- long and random rather than the short code staff type.
  add column if not exists guest_token uuid;

comment on column public.loyalty_cards.guest_token is
  'Lets someone without an account open their card at /card/<token>.';

-- A card belongs to an account or to a named guest, never to neither.
alter table public.loyalty_cards
  drop constraint if exists loyalty_cards_owner_check;

alter table public.loyalty_cards
  add constraint loyalty_cards_owner_check check (
    user_id is not null
    or (
      guest_token is not null
      and btrim(coalesce(guest_name, '')) <> ''
      and btrim(coalesce(guest_email, '')) <> ''
    )
  );

create unique index if not exists loyalty_cards_guest_token_key
  on public.loyalty_cards (guest_token)
  where guest_token is not null;

-- One guest card per email per programme, so joining twice at the till
-- returns the card they already have rather than starting again.
create unique index if not exists loyalty_cards_program_guest_email_key
  on public.loyalty_cards (program_id, lower(guest_email))
  where guest_email is not null and user_id is null;

-- 1. Staff can stamp a guest's card.
--
-- The lookup used to join auth.users, which would hide every guest card from
-- the till. It now falls back to the name the guest gave.
create or replace function public.staff_get_loyalty_card(
  requested_code text
)
returns table (
  card_id uuid,
  card_code text,
  business_id uuid,
  business_name text,
  reward text,
  stamps_required integer,
  stamps integer,
  rewards_redeemed integer,
  last_stamped_at timestamptz,
  customer_name text,
  is_own_card boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select
    c.id,
    c.card_code,
    p.business_id,
    b.name,
    p.reward,
    p.stamps_required,
    c.stamps,
    c.rewards_redeemed,
    c.last_stamped_at,
    -- First name only: staff don't need the customer's email.
    nullif(
      split_part(
        coalesce(u.raw_user_meta_data ->> 'full_name', c.guest_name, ''),
        ' ',
        1
      ),
      ''
    ),
    c.user_id is not null and c.user_id = auth.uid()
  from public.loyalty_cards c
  join public.loyalty_programs p on p.id = c.program_id
  join public.businesses b on b.id = p.business_id
  left join auth.users u on u.id = c.user_id
  where c.card_code = upper(trim(requested_code))
    and public.is_business_member(p.business_id, 'member');
$$;

-- 2. Joining as a guest.
create or replace function public.join_loyalty_program_as_guest(
  requested_program_id uuid,
  requested_name text,
  requested_email text
)
returns public.loyalty_cards
language plpgsql
security definer
set search_path = public
as $$
declare
  clean_name text := btrim(coalesce(requested_name, ''));
  clean_email text := lower(btrim(coalesce(requested_email, '')));
  card public.loyalty_cards;
begin
  if clean_name = '' or clean_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then
    raise exception using errcode = '22023', message = 'A name and an email address are needed';
  end if;

  if not exists (
    select 1
    from public.loyalty_programs p
    join public.businesses b on b.id = p.business_id
    where p.id = requested_program_id
      and p.is_active
      and b.approval_status = 'approved'
  ) then
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

  -- Joining again with the same email returns the card they already have.
  select * into card
  from public.loyalty_cards
  where program_id = requested_program_id
    and user_id is null
    and lower(guest_email) = clean_email;

  if found then
    return card;
  end if;

  insert into public.loyalty_cards (program_id, user_id, guest_name, guest_email, guest_token)
  values (requested_program_id, null, left(clean_name, 80), clean_email, gen_random_uuid())
  returning * into card;

  return card;
end;
$$;

revoke all on function public.join_loyalty_program_as_guest(uuid, text, text) from public;
grant execute on function public.join_loyalty_program_as_guest(uuid, text, text) to anon, authenticated;

-- 3. A guest opening their own card.
create or replace function public.get_guest_loyalty_card(
  requested_token uuid
)
returns table (
  card_code text,
  guest_name text,
  business_name text,
  business_slug text,
  reward text,
  terms text,
  stamps_required integer,
  stamps integer,
  rewards_redeemed integer,
  card_colour text,
  stamp_icon text,
  logo_url text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    c.card_code,
    c.guest_name,
    b.name,
    b.slug,
    p.reward,
    p.terms,
    p.stamps_required,
    c.stamps,
    c.rewards_redeemed,
    p.card_colour,
    p.stamp_icon,
    b.logo_url
  from public.loyalty_cards c
  join public.loyalty_programs p on p.id = c.program_id
  join public.businesses b on b.id = p.business_id
  where c.guest_token = requested_token
    and c.user_id is null;
$$;

revoke all on function public.get_guest_loyalty_card(uuid) from public;
grant execute on function public.get_guest_loyalty_card(uuid) to anon, authenticated;

-- 4. Bringing guest cards into an account.
--
-- Called after signing in. Cards joined with the same email become theirs;
-- where they already have a card for that programme, the stamps are added to
-- it and the guest card goes, so nothing is lost by having joined twice.
create or replace function public.claim_guest_loyalty_cards()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  claimer uuid := auth.uid();
  claimer_email text;
  claimed integer := 0;
  guest public.loyalty_cards;
begin
  if claimer is null then
    return 0;
  end if;

  select lower(email) into claimer_email from auth.users where id = claimer;

  if claimer_email is null then
    return 0;
  end if;

  for guest in
    select *
    from public.loyalty_cards
    where user_id is null and lower(guest_email) = claimer_email
    for update
  loop
    if exists (
      select 1 from public.loyalty_cards
      where program_id = guest.program_id and user_id = claimer
    ) then
      update public.loyalty_cards
      set stamps = stamps + guest.stamps,
          rewards_redeemed = rewards_redeemed + guest.rewards_redeemed,
          last_stamped_at = greatest(coalesce(last_stamped_at, guest.last_stamped_at), guest.last_stamped_at)
      where program_id = guest.program_id and user_id = claimer;

      delete from public.loyalty_cards where id = guest.id;
    else
      update public.loyalty_cards
      set user_id = claimer,
          guest_name = null,
          guest_email = null,
          guest_token = null
      where id = guest.id;
    end if;

    claimed := claimed + 1;
  end loop;

  return claimed;
end;
$$;

revoke all on function public.claim_guest_loyalty_cards() from public, anon;
grant execute on function public.claim_guest_loyalty_cards() to authenticated;
