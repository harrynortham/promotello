-- A closed card gets one last lap.
--
-- Closing a card stops new joiners and nothing else, so somebody holding
-- one could fill it, claim the reward and start it again for as long as
-- they liked. A card nobody can join is not a card the shop still
-- wants to be running; it is one it is seeing out.
--
-- So a closed card finishes. It keeps taking stamps while it is filling
-- — a card is a promise (20261207110000_loyalty_card_is_a_promise.sql)
-- and that does not change — then stops at full, pays out once, and is
-- done. The customer is not left empty-handed at that moment: the new
-- card is put in their wallet as the old one fills, in the same
-- transaction as the stamp that filled it, so their next stamp has
-- somewhere to go before they have thought about it.
--
-- An open card behaves exactly as it did, overflow and all. Everything
-- here is behind `closed_at is not null`.
--
-- Cards already full on a closed programme when this ships are dealt
-- with the next time they are scanned or redeemed rather than in a
-- backfill: the new card is handed over here, but the customer is told
-- about it from the app (notifications have no insert policy — see
-- 20261219090000_telling_somebody_in_the_app.sql), and a card issued by
-- a migration is one nobody is ever told about. There are none today.

alter table public.loyalty_cards
  add column if not exists finished_at timestamptz;

comment on column public.loyalty_cards.finished_at is
  'When the last reward on a closed card was claimed. A finished card takes no more stamps and pays out no more rewards; its stamps stay on it as history.';

-- ---------------------------------------------------------------------------
-- Handing over the new card
-- ---------------------------------------------------------------------------
--
-- Called from inside stamping and redeeming, with the card being
-- finished. Says which card on the business's open programme the
-- customer now holds, and whether it was made just now — the one thing
-- the app needs to know, because a card they already had is not news.
--
-- A guest is followed by email, the way join_loyalty_program_as_guest()
-- does: a guest card with that address, or an account holding one.

create or replace function public.issue_replacement_card(
  old_card public.loyalty_cards,
  out card_id uuid,
  out is_new boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  open_card public.loyalty_programs;
  held public.loyalty_cards;
  made public.loyalty_cards;
begin
  card_id := null;
  is_new := false;

  select open_p.*
  into open_card
  from public.loyalty_programs old_p
  join public.loyalty_programs open_p
    on open_p.business_id = old_p.business_id
   and open_p.is_active
   and open_p.closed_at is null
  join public.businesses b on b.id = open_p.business_id
  where old_p.id = old_card.program_id
    and b.approval_status = 'approved';

  -- Nothing to move on to. The old card still finishes; this is asked
  -- again when the reward is claimed, in case a new card has been
  -- started by then.
  if not found then
    return;
  end if;

  if old_card.user_id is not null then
    select *
    into held
    from public.loyalty_cards
    where program_id = open_card.id
      and user_id = old_card.user_id;
  else
    select c.*
    into held
    from public.loyalty_cards c
    left join auth.users u on u.id = c.user_id
    where c.program_id = open_card.id
      and lower(coalesce(c.guest_email, u.email)) = lower(old_card.guest_email);
  end if;

  if found then
    card_id := held.id;
    return;
  end if;

  insert into public.loyalty_cards (
    program_id,
    user_id,
    guest_name,
    guest_email,
    guest_token,
    -- The visit that filled the old card is spent. Without this, the
    -- same scan a minute later would put a stamp on the new one.
    last_stamped_at
  )
  values (
    open_card.id,
    old_card.user_id,
    case when old_card.user_id is null then old_card.guest_name end,
    case when old_card.user_id is null then old_card.guest_email end,
    case when old_card.user_id is null then gen_random_uuid() end,
    now()
  )
  returning * into made;

  card_id := made.id;
  is_new := true;
end;
$$;

revoke all on function public.issue_replacement_card(public.loyalty_cards) from public, anon, authenticated;

comment on function public.issue_replacement_card(public.loyalty_cards) is
  'Internal. The customer''s card on the business''s open programme, made if they did not have one. Called while a closed card is being finished.';

-- ---------------------------------------------------------------------------
-- Stamping
-- ---------------------------------------------------------------------------
--
-- Two new refusals, both only on a closed card, and the handover. The
-- return is no longer the card row: the app needs to know what the
-- stamp did as well as what the card now says.

drop function if exists public.add_loyalty_stamp(text);

create function public.add_loyalty_stamp(
  requested_code text,
  out stamps integer,
  out stamps_required integer,
  out card_full boolean,
  out card_finished boolean,
  out issued_card_id uuid,
  out issued_is_new boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  card public.loyalty_cards;
  program public.loyalty_programs;
  handover record;
begin
  select c.*
  into card
  from public.loyalty_cards c
  where c.card_code = upper(trim(requested_code))
  for update;

  if card.id is null then
    raise exception using errcode = 'P0002', message = 'Loyalty card not found';
  end if;

  select * into program from public.loyalty_programs where id = card.program_id;

  if not public.is_business_member(program.business_id, 'member') then
    raise exception using errcode = '42501', message = 'This card belongs to another business';
  end if;

  if card.user_id = auth.uid() then
    raise exception using errcode = '42501', message = 'You can''t stamp your own card';
  end if;

  if not program.is_active then
    raise exception using errcode = 'P0001', message = 'This loyalty card has been switched off';
  end if;

  -- Done for good: the reward on it has been claimed.
  if card.finished_at is not null then
    raise exception using errcode = 'P0007', message = 'This card is finished';
  end if;

  -- A closed card stops at full. An open one carries on into the next
  -- round, as it always has.
  if program.closed_at is not null and card.stamps >= program.stamps_required then
    raise exception using errcode = 'P0008', message = 'This card is full';
  end if;

  -- Stops one visit being stamped twice by a double scan.
  if card.last_stamped_at is not null
     and card.last_stamped_at > now() - interval '10 minutes' then
    raise exception using errcode = 'P0005', message = 'This card was stamped in the last 10 minutes';
  end if;

  update public.loyalty_cards
  set stamps = loyalty_cards.stamps + 1,
      last_stamped_at = now()
  where id = card.id
  returning * into card;

  insert into public.loyalty_events (card_id, kind, created_by)
  values (card.id, 'stamp', auth.uid());

  stamps := card.stamps;
  stamps_required := program.stamps_required;
  card_full := card.stamps >= program.stamps_required;
  card_finished := false;
  issued_card_id := null;
  issued_is_new := false;

  -- That was the last stamp this card will take, so the next one needs
  -- somewhere to go.
  if program.closed_at is not null and card_full then
    select * into handover from public.issue_replacement_card(card);
    issued_card_id := handover.card_id;
    issued_is_new := handover.is_new;
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Redeeming
-- ---------------------------------------------------------------------------
--
-- A closed card is finished once what is left on it cannot earn another
-- reward. A card carrying several full rounds — stamped past full while
-- its programme was still open — pays out one round per redemption and
-- keeps every one of them; whatever is left under a full round when the
-- last is claimed is dropped with the card.

drop function if exists public.redeem_loyalty_reward(text);

create function public.redeem_loyalty_reward(
  requested_code text,
  out stamps integer,
  out stamps_required integer,
  out card_full boolean,
  out card_finished boolean,
  out issued_card_id uuid,
  out issued_is_new boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  card public.loyalty_cards;
  program public.loyalty_programs;
  handover record;
begin
  select c.*
  into card
  from public.loyalty_cards c
  where c.card_code = upper(trim(requested_code))
  for update;

  if card.id is null then
    raise exception using errcode = 'P0002', message = 'Loyalty card not found';
  end if;

  select * into program from public.loyalty_programs where id = card.program_id;

  if not public.is_business_member(program.business_id, 'member') then
    raise exception using errcode = '42501', message = 'This card belongs to another business';
  end if;

  if card.user_id = auth.uid() then
    raise exception using errcode = '42501', message = 'You can''t redeem your own card';
  end if;

  if card.finished_at is not null then
    raise exception using errcode = 'P0007', message = 'This card is finished';
  end if;

  if card.stamps < program.stamps_required then
    raise exception using errcode = 'P0001', message = 'Not enough stamps for a reward yet';
  end if;

  update public.loyalty_cards
  set stamps = loyalty_cards.stamps - program.stamps_required,
      rewards_redeemed = loyalty_cards.rewards_redeemed + 1,
      -- Nothing left to earn on a card nobody can join.
      finished_at = case
        when program.closed_at is not null
         and loyalty_cards.stamps - program.stamps_required < program.stamps_required
        then timezone('utc', now())
      end
  where id = card.id
  returning * into card;

  insert into public.loyalty_events (card_id, kind, created_by)
  values (card.id, 'reward', auth.uid());

  stamps := card.stamps;
  stamps_required := program.stamps_required;
  card_full := card.stamps >= program.stamps_required;
  card_finished := card.finished_at is not null;
  issued_card_id := null;
  issued_is_new := false;

  -- Asked again here: the card may have filled when the business had
  -- nothing else to offer, and started a new one since.
  if program.closed_at is not null then
    select * into handover from public.issue_replacement_card(card);
    issued_card_id := handover.card_id;
    issued_is_new := handover.is_new;
  end if;
end;
$$;

revoke all on function public.add_loyalty_stamp(text) from public, anon;
revoke all on function public.redeem_loyalty_reward(text) from public, anon;
grant execute on function public.add_loyalty_stamp(text) to authenticated;
grant execute on function public.redeem_loyalty_reward(text) to authenticated;

-- ---------------------------------------------------------------------------
-- What staff see
-- ---------------------------------------------------------------------------
--
-- One scan has to serve both cards now: the old one, which may have a
-- reward waiting on it, and the new one, which is where the stamps go.
-- Staff shouldn't have to ask the customer for a different code.

drop function if exists public.staff_get_loyalty_card(text);

create function public.staff_get_loyalty_card(requested_code text)
returns table (
  card_id uuid,
  card_code text,
  program_id uuid,
  business_id uuid,
  business_name text,
  business_logo_url text,
  reward text,
  stamps_required integer,
  stamps integer,
  rewards_redeemed integer,
  last_stamped_at timestamptz,
  terms text,
  card_colour text,
  card_header text,
  card_accent text,
  stamp_icon text,
  customer_name text,
  is_own_card boolean,
  program_closed boolean,
  card_finished boolean,
  -- The same customer's card on the card now being handed out, where
  -- they hold one.
  open_card_code text,
  open_card_name text,
  open_card_stamps integer,
  open_card_stamps_required integer,
  -- The new card is given out as though it had just been stamped, so
  -- the visit that filled the old one cannot also stamp it. Staff are
  -- told that rather than refused at the button, and the ten minutes
  -- stay where the rule is.
  open_card_stamped_recently boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select
    c.id,
    c.card_code,
    p.id,
    p.business_id,
    b.name,
    b.logo_url,
    p.reward,
    p.stamps_required,
    c.stamps,
    c.rewards_redeemed,
    c.last_stamped_at,
    p.terms,
    p.card_colour,
    p.card_header,
    p.card_accent,
    p.stamp_icon,
    -- First name only: staff don't need the customer's email.
    nullif(
      split_part(
        coalesce(u.raw_user_meta_data ->> 'full_name', c.guest_name, ''),
        ' ',
        1
      ),
      ''
    ),
    c.user_id is not null and c.user_id = auth.uid(),
    p.closed_at is not null,
    c.finished_at is not null,
    theirs.card_code,
    theirs.name,
    theirs.stamps,
    theirs.stamps_required,
    theirs.stamped_recently
  from public.loyalty_cards c
  join public.loyalty_programs p on p.id = c.program_id
  join public.businesses b on b.id = p.business_id
  left join auth.users u on u.id = c.user_id
  left join lateral (
    select
      other.card_code,
      open_p.name,
      other.stamps,
      open_p.stamps_required,
      other.last_stamped_at is not null
        and other.last_stamped_at > now() - interval '10 minutes' as stamped_recently
    from public.loyalty_programs open_p
    join public.loyalty_cards other on other.program_id = open_p.id
    left join auth.users other_u on other_u.id = other.user_id
    where open_p.business_id = p.business_id
      and open_p.id <> p.id
      and open_p.is_active
      and open_p.closed_at is null
      and (
        (c.user_id is not null and other.user_id = c.user_id)
        or (
          c.user_id is null
          and lower(coalesce(other.guest_email, other_u.email)) = lower(c.guest_email)
        )
      )
    limit 1
  ) theirs on true
  where c.card_code = upper(trim(requested_code))
    and public.is_business_member(p.business_id, 'member');
$$;

revoke all on function public.staff_get_loyalty_card(text) from public, anon;
grant execute on function public.staff_get_loyalty_card(text) to authenticated;

-- ---------------------------------------------------------------------------
-- What a guest sees
-- ---------------------------------------------------------------------------
--
-- The same three facts, and the link to their new card: a guest has no
-- account and no list, so the address they already have is the only way
-- they can be shown it.
--
-- It also hands back the business's own two colours, which it has never
-- done — a guest's card has been drawing itself in the default palette
-- since custom colours arrived (20261221090000_a_card_in_their_own_colours.sql).

drop function if exists public.get_guest_loyalty_card(uuid);

create function public.get_guest_loyalty_card(requested_token uuid)
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
  card_header text,
  card_accent text,
  stamp_icon text,
  logo_url text,
  program_closed boolean,
  card_finished boolean,
  new_card_token uuid
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
    p.card_header,
    p.card_accent,
    p.stamp_icon,
    b.logo_url,
    p.closed_at is not null,
    c.finished_at is not null,
    theirs.guest_token
  from public.loyalty_cards c
  join public.loyalty_programs p on p.id = c.program_id
  join public.businesses b on b.id = p.business_id
  left join lateral (
    select other.guest_token
    from public.loyalty_programs open_p
    join public.loyalty_cards other on other.program_id = open_p.id
    where open_p.business_id = p.business_id
      and open_p.id <> p.id
      and open_p.is_active
      and open_p.closed_at is null
      and other.user_id is null
      and other.guest_token is not null
      and lower(other.guest_email) = lower(c.guest_email)
    limit 1
  ) theirs on true
  where c.guest_token = requested_token
    and c.user_id is null;
$$;

revoke all on function public.get_guest_loyalty_card(uuid) from public;
grant execute on function public.get_guest_loyalty_card(uuid) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Signing up with a finished card in hand
-- ---------------------------------------------------------------------------
--
-- Claiming merges a guest card into an account's card for the same
-- programme by adding the stamps across. A finished card's stamps have
-- been spent, so only the rewards it paid out carry over; and a card
-- that was finished stays finished when it moves across on its own.

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
      set stamps = stamps + case when guest.finished_at is null then guest.stamps else 0 end,
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
