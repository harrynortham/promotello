-- Digital loyalty stamp cards. A business runs one programme ("Collect 8
-- stamps, get a free coffee"); customers join it and get a card with a
-- personal code. Staff scan or enter that code to add stamps and redeem
-- rewards, so customers can't stamp their own cards.

create table if not exists public.loyalty_programs (
  id uuid primary key default gen_random_uuid(),

  business_id uuid not null
    references public.businesses (id)
    on delete cascade,

  stamps_required integer not null default 8
    check (stamps_required between 3 and 20),

  reward text not null
    check (char_length(trim(reward)) between 2 and 80),

  terms text
    check (terms is null or char_length(terms) <= 500),

  is_active boolean not null default true,

  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

-- One active programme per business.
create unique index if not exists loyalty_programs_one_active_idx
  on public.loyalty_programs (business_id)
  where is_active;

drop trigger if exists loyalty_programs_set_updated_at on public.loyalty_programs;

create trigger loyalty_programs_set_updated_at
before update on public.loyalty_programs
for each row
execute function public.set_updated_at();

create table if not exists public.loyalty_cards (
  id uuid primary key default gen_random_uuid(),

  program_id uuid not null
    references public.loyalty_programs (id)
    on delete cascade,

  user_id uuid not null
    references auth.users (id)
    on delete cascade,

  -- Shown to staff as a QR code and as text they can type in.
  card_code text not null unique
    default upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10)),

  stamps integer not null default 0 check (stamps >= 0),
  rewards_redeemed integer not null default 0 check (rewards_redeemed >= 0),
  last_stamped_at timestamptz,

  created_at timestamptz not null default timezone('utc', now()),

  unique (program_id, user_id)
);

create index if not exists loyalty_cards_user_id_idx
  on public.loyalty_cards (user_id);

create table if not exists public.loyalty_events (
  id bigint generated always as identity primary key,

  card_id uuid not null
    references public.loyalty_cards (id)
    on delete cascade,

  kind text not null check (kind in ('stamp', 'reward')),

  created_by uuid
    references auth.users (id)
    on delete set null,

  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists loyalty_events_card_created_idx
  on public.loyalty_events (card_id, created_at desc);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.loyalty_programs enable row level security;
alter table public.loyalty_cards enable row level security;
alter table public.loyalty_events enable row level security;

-- Programmes: anyone can see active programmes of approved businesses;
-- members see their own (active or not); admins manage them.
drop policy if exists loyalty_programs_public_select on public.loyalty_programs;

create policy loyalty_programs_public_select
on public.loyalty_programs
for select
to anon, authenticated
using (
  is_active
  and exists (
    select 1
    from public.businesses b
    where b.id = loyalty_programs.business_id
      and b.approval_status = 'approved'
  )
);

drop policy if exists loyalty_programs_select_members on public.loyalty_programs;

create policy loyalty_programs_select_members
on public.loyalty_programs
for select
to authenticated
using (
  public.is_business_member(business_id, 'member')
);

drop policy if exists loyalty_programs_insert_admins on public.loyalty_programs;

create policy loyalty_programs_insert_admins
on public.loyalty_programs
for insert
to authenticated
with check (
  public.is_business_member(business_id, 'admin')
);

drop policy if exists loyalty_programs_update_admins on public.loyalty_programs;

create policy loyalty_programs_update_admins
on public.loyalty_programs
for update
to authenticated
using (
  public.is_business_member(business_id, 'admin')
)
with check (
  public.is_business_member(business_id, 'admin')
);

-- Cards: the customer sees their own; business members see cards for their
-- programme. Cards and events are only written by the functions below.
drop policy if exists loyalty_cards_select_own on public.loyalty_cards;

create policy loyalty_cards_select_own
on public.loyalty_cards
for select
to authenticated
using (
  user_id = (select auth.uid())
);

drop policy if exists loyalty_cards_select_members on public.loyalty_cards;

create policy loyalty_cards_select_members
on public.loyalty_cards
for select
to authenticated
using (
  exists (
    select 1
    from public.loyalty_programs p
    where p.id = loyalty_cards.program_id
      and public.is_business_member(p.business_id, 'member')
  )
);

drop policy if exists loyalty_events_select_own on public.loyalty_events;

create policy loyalty_events_select_own
on public.loyalty_events
for select
to authenticated
using (
  exists (
    select 1
    from public.loyalty_cards c
    where c.id = loyalty_events.card_id
      and c.user_id = (select auth.uid())
  )
);

drop policy if exists loyalty_events_select_members on public.loyalty_events;

create policy loyalty_events_select_members
on public.loyalty_events
for select
to authenticated
using (
  exists (
    select 1
    from public.loyalty_cards c
    join public.loyalty_programs p on p.id = c.program_id
    where c.id = loyalty_events.card_id
      and public.is_business_member(p.business_id, 'member')
  )
);

-- ---------------------------------------------------------------------------
-- Loyalty cards are a Pro feature: switching a programme on needs Pro.
-- A programme already running keeps going after a downgrade, so customers
-- never lose stamps they've collected.
-- ---------------------------------------------------------------------------

create or replace function public.enforce_loyalty_plan()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.is_active
     and (tg_op = 'INSERT' or not old.is_active)
     and not public.business_has_pro(new.business_id) then
    raise exception using
      errcode = 'P0004',
      message = 'Loyalty cards are part of Pro. Upgrade to start a stamp card.';
  end if;

  return new;
end;
$$;

drop trigger if exists loyalty_programs_enforce_plan on public.loyalty_programs;

create trigger loyalty_programs_enforce_plan
before insert or update on public.loyalty_programs
for each row
execute function public.enforce_loyalty_plan();

-- ---------------------------------------------------------------------------
-- Customer: join a programme (returns the existing card if already joined).
-- ---------------------------------------------------------------------------

create or replace function public.join_loyalty_program(
  requested_program_id uuid
)
returns public.loyalty_cards
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

-- ---------------------------------------------------------------------------
-- Staff: look up, stamp and redeem a card by its code. Each checks the
-- caller belongs to the business that runs the programme.
-- ---------------------------------------------------------------------------

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
    nullif(split_part(coalesce(u.raw_user_meta_data ->> 'full_name', ''), ' ', 1), ''),
    c.user_id = auth.uid()
  from public.loyalty_cards c
  join public.loyalty_programs p on p.id = c.program_id
  join public.businesses b on b.id = p.business_id
  join auth.users u on u.id = c.user_id
  where c.card_code = upper(trim(requested_code))
    and public.is_business_member(p.business_id, 'member');
$$;

create or replace function public.add_loyalty_stamp(
  requested_code text
)
returns public.loyalty_cards
language plpgsql
security definer
set search_path = public
as $$
declare
  card public.loyalty_cards;
  program public.loyalty_programs;
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

  -- Stops one visit being stamped twice by a double scan.
  if card.last_stamped_at is not null
     and card.last_stamped_at > now() - interval '10 minutes' then
    raise exception using errcode = 'P0005', message = 'This card was stamped in the last 10 minutes';
  end if;

  update public.loyalty_cards
  set stamps = stamps + 1,
      last_stamped_at = now()
  where id = card.id
  returning * into card;

  insert into public.loyalty_events (card_id, kind, created_by)
  values (card.id, 'stamp', auth.uid());

  return card;
end;
$$;

create or replace function public.redeem_loyalty_reward(
  requested_code text
)
returns public.loyalty_cards
language plpgsql
security definer
set search_path = public
as $$
declare
  card public.loyalty_cards;
  program public.loyalty_programs;
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

  if card.stamps < program.stamps_required then
    raise exception using errcode = 'P0001', message = 'Not enough stamps for a reward yet';
  end if;

  update public.loyalty_cards
  set stamps = stamps - program.stamps_required,
      rewards_redeemed = rewards_redeemed + 1
  where id = card.id
  returning * into card;

  insert into public.loyalty_events (card_id, kind, created_by)
  values (card.id, 'reward', auth.uid());

  return card;
end;
$$;

revoke all on function public.join_loyalty_program(uuid) from public, anon;
revoke all on function public.staff_get_loyalty_card(text) from public, anon;
revoke all on function public.add_loyalty_stamp(text) from public, anon;
revoke all on function public.redeem_loyalty_reward(text) from public, anon;

grant execute on function public.join_loyalty_program(uuid) to authenticated;
grant execute on function public.staff_get_loyalty_card(text) to authenticated;
grant execute on function public.add_loyalty_stamp(text) to authenticated;
grant execute on function public.redeem_loyalty_reward(text) to authenticated;
