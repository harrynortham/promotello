-- A loyalty card is a promise, so it doesn't change under the customer.
--
-- A paper card in a wallet says "9 stamps for a free coffee" until it is
-- full. A shop that wants different terms hands out a different card; it
-- doesn't rub out the one someone is halfway through.
--
-- So: one card open for joining at a time, its terms frozen the moment
-- anyone holds it, and a business that wants to change the deal starts a
-- new card. The old one keeps taking stamps until its holders are done.

alter table public.loyalty_programs
  add column if not exists closed_at timestamptz;

comment on column public.loyalty_programs.closed_at is
  'When the card stopped taking new joiners. Holders keep collecting and redeeming; it is simply no longer offered.';

-- One card open for joining per business. Closed cards are unlimited:
-- every change of terms leaves one behind.
drop index if exists public.loyalty_programs_name_per_business_idx;

create unique index if not exists loyalty_programs_one_open_idx
  on public.loyalty_programs (business_id)
  where is_active and closed_at is null;

-- Names only need to be distinct among the cards still being offered.
create unique index if not exists loyalty_programs_open_name_idx
  on public.loyalty_programs (business_id, lower(name))
  where is_active and closed_at is null;

-- The terms are the promise: once somebody holds the card, they stop
-- moving. The name and the look are not the promise and stay editable.
create or replace function public.freeze_issued_loyalty_card()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (new.stamps_required is distinct from old.stamps_required
      or new.reward is distinct from old.reward
      or new.terms is distinct from old.terms)
     and exists (select 1 from public.loyalty_cards c where c.program_id = old.id)
     and not public.is_platform_admin() then
    raise exception using
      errcode = 'P0006',
      message = 'Customers are collecting this card, so its stamps and reward stay as they are. Start a new card to change the deal.';
  end if;

  return new;
end;
$$;

drop trigger if exists loyalty_programs_freeze_issued on public.loyalty_programs;

create trigger loyalty_programs_freeze_issued
before update on public.loyalty_programs
for each row
execute function public.freeze_issued_loyalty_card();

-- Changing the deal: the card being offered is closed and a new one
-- takes its place, in one go, so a business is never without a card and
-- never has two open at once.
create or replace function public.replace_loyalty_card(
  requested_business_id uuid,
  new_name text,
  new_stamps_required integer,
  new_reward text,
  new_terms text,
  new_card_colour text,
  new_stamp_icon text
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
    business_id, name, stamps_required, reward, terms, card_colour, stamp_icon, is_active
  )
  values (
    requested_business_id,
    new_name,
    new_stamps_required,
    new_reward,
    nullif(btrim(coalesce(new_terms, '')), ''),
    new_card_colour,
    new_stamp_icon,
    true
  )
  returning * into card;

  return card;
end;
$$;

revoke all on function public.replace_loyalty_card(uuid, text, integer, text, text, text, text) from public, anon;
grant execute on function public.replace_loyalty_card(uuid, text, integer, text, text, text, text) to authenticated;

-- Joining is only ever the card on offer.
create or replace function public.join_loyalty_program(requested_program_id uuid)
returns loyalty_cards
language plpgsql
security definer
set search_path = public
as $$
declare
  card public.loyalty_cards;
begin
  if auth.uid() is null then
    raise exception using errcode = '42501', message = 'Please sign in to join';
  end if;

  if not exists (
    select 1
    from public.loyalty_programs p
    join public.businesses b on b.id = p.business_id
    where p.id = requested_program_id
      and p.is_active
      and p.closed_at is null
      and b.approval_status = 'approved'
  ) then
    raise exception using errcode = 'P0002', message = 'This loyalty card is not available';
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
      and p.closed_at is null
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
