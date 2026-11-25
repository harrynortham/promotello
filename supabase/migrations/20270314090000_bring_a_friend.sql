-- Bring a friend.
--
-- Track A asks whether we can prove we sent somebody. Everything that
-- answers it today is passive: a poster was scanned, a page was viewed,
-- a voucher was claimed. This is the first thing that makes the
-- sending happen — a regular brings somebody who has never been in,
-- and both sides of that are ours to see.
--
-- The shape, and why:
--
-- 1. A customer has one code per business. It goes in a link they
--    share. Codes rather than user ids, because a share link is pasted
--    into WhatsApp and read by strangers.
--
-- 2. The friend is recorded when they arrive and are signed in. Only
--    somebody new to that business counts, and never the referrer
--    themselves. Nothing is promised to anybody at this point.
--
-- 3. The reward issues when the friend actually comes in: a voucher
--    marked used at the counter, or a stamp on the card. Not when they
--    claim, which costs nothing and can be done from a sofa.
--
-- Point 3 is the whole design. It makes the reward unfarmable without
-- physically turning up, and it means every reward issued is a visit
-- the business can be shown. A referral that never becomes a visit
-- simply sits there, which is the right answer: nobody was brought.
--
-- Issued in a batch by the same job as the other automations rather
-- than in a trigger, so a failed email retries exactly as theirs do and
-- a reward is never lost to a send that did not go.

-- ---------------------------------------------------------------------------
-- The automation
-- ---------------------------------------------------------------------------

alter table public.business_automations drop constraint if exists business_automations_kind_check;

alter table public.business_automations
  add constraint business_automations_kind_check
  check (kind = any (array['welcome', 'birthday', 'winback', 'brought_a_friend']));

alter table public.reward_vouchers drop constraint if exists reward_vouchers_kind_check;

alter table public.reward_vouchers
  add constraint reward_vouchers_kind_check
  check (kind = any (array['welcome', 'birthday', 'winback', 'brought_a_friend']));

-- ---------------------------------------------------------------------------
-- A customer's code for one business
-- ---------------------------------------------------------------------------

create table if not exists public.friend_invites (
  code text primary key check (code ~ '^[a-z0-9]{8}$'),
  business_id uuid not null references public.businesses (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  unique (business_id, user_id)
);

alter table public.friend_invites enable row level security;

-- Their own, so the share panel can show the link again rather than
-- minting a second one. Nobody reads anybody else's.
drop policy if exists friend_invites_own_select on public.friend_invites;

create policy friend_invites_own_select on public.friend_invites
  for select to authenticated
  using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Who brought whom
-- ---------------------------------------------------------------------------

create table if not exists public.friend_referrals (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  referrer_user_id uuid not null references auth.users (id) on delete cascade,
  friend_user_id uuid not null references auth.users (id) on delete cascade,

  created_at timestamptz not null default timezone('utc', now()),
  -- When the friend actually came in. Set by the issuing function, and
  -- the thing the whole feature is counted on.
  visited_at timestamptz,
  rewarded_at timestamptz,

  -- Somebody is brought to a business once. A second regular cannot
  -- claim the same friend, and the same regular cannot claim them twice.
  unique (business_id, friend_user_id),

  constraint friend_referrals_not_yourself check (referrer_user_id <> friend_user_id)
);

create index if not exists friend_referrals_business_idx
  on public.friend_referrals (business_id, created_at desc);

create index if not exists friend_referrals_unrewarded_idx
  on public.friend_referrals (business_id)
  where rewarded_at is null;

alter table public.friend_referrals enable row level security;

-- The business sees who it was sent, and a customer sees their own.
-- Nothing is written from a browser: both sides go through the
-- functions below.
drop policy if exists friend_referrals_business_select on public.friend_referrals;

create policy friend_referrals_business_select on public.friend_referrals
  for select to authenticated
  using (
    public.is_business_member(business_id, 'member')
    or referrer_user_id = auth.uid()
  );

-- ---------------------------------------------------------------------------
-- Getting a code
-- ---------------------------------------------------------------------------

create or replace function public.my_friend_code(requested_business_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  existing text;
  minted text;
begin
  if auth.uid() is null then
    raise exception using errcode = '42501', message = 'Sign in first.';
  end if;

  -- Only where the business is running it. A link that rewards nobody
  -- is worse than no link.
  if not exists (
    select 1 from public.business_automations a
    where a.business_id = requested_business_id
      and a.kind = 'brought_a_friend'
      and a.enabled
  ) then
    return null;
  end if;

  select code into existing
  from public.friend_invites
  where business_id = requested_business_id and user_id = auth.uid();

  if existing is not null then
    return existing;
  end if;

  -- Eight characters from the same alphabet the QR codes use. A
  -- collision just tries again; at 36^8 it will not.
  loop
    minted := lower(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));

    begin
      insert into public.friend_invites (code, business_id, user_id)
      values (minted, requested_business_id, auth.uid());

      return minted;
    exception when unique_violation then
      -- Theirs already, from a parallel request: take it.
      select code into existing
      from public.friend_invites
      where business_id = requested_business_id and user_id = auth.uid();

      if existing is not null then
        return existing;
      end if;
    end;
  end loop;
end;
$$;

revoke all on function public.my_friend_code(uuid) from public, anon;
grant execute on function public.my_friend_code(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Arriving on somebody's link
-- ---------------------------------------------------------------------------
--
-- Nothing is promised here and nothing is issued. This only writes down
-- that these two people are connected, so that if the friend comes in
-- there is something to pay out against.

create or replace function public.record_friend_referral(referral_code text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  invite public.friend_invites;
  friend uuid := auth.uid();
begin
  if friend is null then
    return false;
  end if;

  select * into invite from public.friend_invites where code = lower(btrim(referral_code));

  if invite.code is null or invite.user_id = friend then
    return false;
  end if;

  if not exists (
    select 1 from public.business_automations a
    where a.business_id = invite.business_id and a.kind = 'brought_a_friend' and a.enabled
  ) then
    return false;
  end if;

  -- New to this business, which is what is being paid for. A regular
  -- somewhere else on Promotello is still a new customer here.
  if exists (
    select 1
    from public.offer_redemptions r
    join public.offers o on o.id = r.offer_id
    where o.business_id = invite.business_id and r.user_id = friend
  ) or exists (
    select 1
    from public.loyalty_cards c
    join public.loyalty_programs p on p.id = c.program_id
    where p.business_id = invite.business_id and c.user_id = friend
  ) or exists (
    select 1 from public.business_followers f
    where f.business_id = invite.business_id and f.user_id = friend
  ) then
    return false;
  end if;

  insert into public.friend_referrals (business_id, referrer_user_id, friend_user_id)
  values (invite.business_id, invite.user_id, friend)
  on conflict (business_id, friend_user_id) do nothing;

  return found;
end;
$$;

revoke all on function public.record_friend_referral(text) from public, anon;
grant execute on function public.record_friend_referral(text) to authenticated;

-- ---------------------------------------------------------------------------
-- Paying out, once they have actually been in
-- ---------------------------------------------------------------------------
--
-- A visit is a voucher marked used or a stamp on a card, which is the
-- definition the rest of the product counts on (platform_metrics). It
-- has to happen after the referral was recorded: a friend who had
-- already been in is not somebody who was brought.
--
-- Returns the same shape as issue_automation_vouchers so the job that
-- emails those can email these without learning anything new.

create or replace function public.issue_friend_vouchers()
returns table (
  voucher_id uuid,
  kind text,
  reward text,
  code text,
  expires_at timestamptz,
  business_id uuid,
  business_name text,
  email text,
  first_name text,
  unsubscribe_token uuid
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  with arrived as (
    select
      r.id,
      r.business_id,
      r.referrer_user_id,
      least(
        (
          select min(red.used_at)
          from public.offer_redemptions red
          join public.offers o on o.id = red.offer_id
          where o.business_id = r.business_id
            and red.user_id = r.friend_user_id
            and red.used_at > r.created_at
        ),
        (
          select min(e.created_at)
          from public.loyalty_events e
          join public.loyalty_cards c on c.id = e.card_id
          join public.loyalty_programs p on p.id = c.program_id
          where p.business_id = r.business_id
            and c.user_id = r.friend_user_id
            and e.kind = 'stamp'
            and e.created_at > r.created_at
        )
      ) as came_in
    from public.friend_referrals r
    where r.rewarded_at is null
  ),
  ready as (
    select a.*
    from arrived a
    join public.business_automations auto
      on auto.business_id = a.business_id and auto.kind = 'brought_a_friend' and auto.enabled
    where a.came_in is not null
      -- Only while the business is paying for it.
      and public.business_has_pro(a.business_id)
  ),
  paid as (
    update public.friend_referrals r
    set visited_at = ready.came_in, rewarded_at = timezone('utc', now())
    from ready
    where r.id = ready.id
    returning r.id, r.business_id, r.referrer_user_id
  ),
  issued as (
    insert into public.reward_vouchers (business_id, user_id, kind, reward, expires_at, terms, image_url)
    select
      p.business_id,
      p.referrer_user_id,
      'brought_a_friend',
      auto.reward,
      now() + make_interval(days => auto.valid_days),
      auto.terms,
      auto.image_url
    from paid p
    join public.business_automations auto
      on auto.business_id = p.business_id and auto.kind = 'brought_a_friend'
    returning *
  )
  select
    i.id,
    i.kind,
    i.reward,
    i.code,
    i.expires_at,
    i.business_id,
    b.name,
    u.email::text,
    nullif(split_part(coalesce(u.raw_user_meta_data ->> 'full_name', ''), ' ', 1), ''),
    f.unsubscribe_token
  from issued i
  join public.businesses b on b.id = i.business_id
  join auth.users u on u.id = i.user_id
  left join public.business_followers f
    on f.business_id = i.business_id and f.user_id = i.user_id;
end;
$$;

revoke all on function public.issue_friend_vouchers() from public, anon, authenticated;
grant execute on function public.issue_friend_vouchers() to service_role;

-- ---------------------------------------------------------------------------
-- What the business is shown
-- ---------------------------------------------------------------------------

create or replace function public.friends_brought(requested_business_id uuid)
returns jsonb
language sql
security definer
set search_path = public
stable
as $$
  select jsonb_build_object(
    'shared', count(*),
    'came_in', count(*) filter (where visited_at is not null),
    'came_in_30_days', count(*) filter (
      where visited_at is not null and visited_at >= now() - interval '30 days'
    )
  )
  from public.friend_referrals
  where business_id = requested_business_id
    and public.is_business_member(requested_business_id, 'member');
$$;

revoke all on function public.friends_brought(uuid) from public, anon;
grant execute on function public.friends_brought(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Opening somebody else's link
-- ---------------------------------------------------------------------------
--
-- A code belongs to the customer who shares it, and friend_invites is
-- readable only by its owner. The page the friend lands on is not
-- theirs, so this hands over the little it needs: which shop, and
-- whether the shop is still running this. Never who sent them — that
-- is the referrer's business and not the friend's.

create or replace function public.friend_invite_shop(referral_code text)
returns table (business_id uuid, business_name text, business_slug text, logo_url text)
language sql
security definer
set search_path = public
stable
as $$
  select b.id, b.name, b.slug, b.logo_url
  from public.friend_invites i
  join public.businesses b on b.id = i.business_id
  join public.business_automations a
    on a.business_id = i.business_id and a.kind = 'brought_a_friend' and a.enabled
  where i.code = lower(btrim(referral_code))
    and b.approval_status = 'approved'
    and b.closed_at is null;
$$;

revoke all on function public.friend_invite_shop(text) from public;
grant execute on function public.friend_invite_shop(text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Which plan may switch which automation on
-- ---------------------------------------------------------------------------
--
-- The write policy has always said: an admin may change these, and may
-- only set enabled on a business with Growth. That was right while every
-- automation was Growth's. Bring a friend is Pro's — it fires because a
-- customer did something rather than running on its own, and what it
-- buys is a new customer through the door.
--
-- So the rule becomes per kind. Found by pressing the button: the page
-- offered a Pro business the switch and the database refused the save,
-- which is the correct order for those two to disagree in.

drop policy if exists business_automations_write_admins on public.business_automations;

create policy business_automations_write_admins on public.business_automations
  for all to authenticated
  using (public.is_business_member(business_id, 'admin'))
  with check (
    public.is_business_member(business_id, 'admin')
    and (
      not enabled
      or (kind = 'brought_a_friend' and public.business_has_pro(business_id))
      or public.business_has_growth(business_id)
    )
  );

-- ---------------------------------------------------------------------------
-- What a customer is allowed to know
-- ---------------------------------------------------------------------------
--
-- business_automations is readable by the business's own team and
-- nobody else, which is right: it holds what every automation offers
-- and when. But the one line a customer needs -- is this shop running
-- bring a friend, and what do I get -- is on the public page, so it
-- needs its own door.
--
-- Hands over the reward and nothing else, and only while the business
-- is on the plan that pays out. Found by loading the page signed out
-- and seeing no panel.

create or replace function public.friend_reward(requested_business_id uuid)
returns text
language sql
security definer
set search_path = public
stable
as $$
  select a.reward
  from public.business_automations a
  join public.businesses b on b.id = a.business_id
  where a.business_id = requested_business_id
    and a.kind = 'brought_a_friend'
    and a.enabled
    and b.approval_status = 'approved'
    and b.closed_at is null
    and public.business_has_pro(a.business_id);
$$;

revoke all on function public.friend_reward(uuid) from public;
grant execute on function public.friend_reward(uuid) to anon, authenticated;
