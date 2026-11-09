-- Closing a business.
--
-- Someone running several businesses needs to take one off Promotello without
-- deleting their account, and without destroying work that isn't theirs. A
-- customer's stamps and unredeemed vouchers are the customer's records, and a
-- poster in a window is already printed.
--
-- So closing is one flag, not a cascade. Nothing is deleted, the listings
-- stop showing it, nobody new can join or claim, and reopening puts it back
-- exactly as it was. Erasure is a separate, slower thing an admin does
-- afterwards.
--
-- Deliberately not approval_status = 'suspended': suspension is something the
-- platform does to a business, closing is something a business does itself,
-- and the audit log should never confuse the two.

alter table public.businesses
  add column if not exists closed_at timestamptz,
  add column if not exists closed_by uuid
    references auth.users (id)
    on delete set null;

create index if not exists businesses_closed_idx
  on public.businesses (closed_at)
  where closed_at is not null;

-- ---------------------------------------------------------------------------
-- Why the policies are left alone
--
-- The obvious move is to add "and closed_at is null" to the public select
-- policy, which would unlist the business everywhere in one line. It also
-- breaks the promise this feature is built on: a customer's wallet joins
-- businesses to name the shop on their loyalty card, and their vouchers join
-- offers which join businesses. Hiding the row empties the records we just
-- said were theirs to keep.
--
-- So the row stays readable and the listings exclude it explicitly, in
-- lib/listings.ts and app/sitemap.ts. The guarantees that must not be missed
-- -- nobody new joins, nobody new claims -- are triggers below rather than
-- filters, because a filter only works where someone remembered it.
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- Nobody new joins or claims at a closed business
--
-- Guarding the tables rather than re-stating the condition inside
-- join_loyalty_program, join_loyalty_program_as_guest and redeem_offer: those
-- are SECURITY DEFINER and so walk past RLS entirely, and a trigger covers
-- whatever path is added next.
-- ---------------------------------------------------------------------------

create or replace function public.refuse_closed_business_loyalty()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if exists (
    select 1
    from public.loyalty_programs p
    join public.businesses b on b.id = p.business_id
    where p.id = new.program_id
      and b.closed_at is not null
  ) then
    raise exception using
      errcode = 'P0007',
      message = 'This business is no longer on Promotello';
  end if;

  return new;
end;
$$;

drop trigger if exists loyalty_cards_refuse_closed_business on public.loyalty_cards;

create trigger loyalty_cards_refuse_closed_business
before insert on public.loyalty_cards
for each row
execute function public.refuse_closed_business_loyalty();

create or replace function public.refuse_closed_business_redemption()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if exists (
    select 1
    from public.offers o
    join public.businesses b on b.id = o.business_id
    where o.id = new.offer_id
      and b.closed_at is not null
  ) then
    raise exception using
      errcode = 'P0007',
      message = 'This business is no longer on Promotello';
  end if;

  return new;
end;
$$;

drop trigger if exists offer_redemptions_refuse_closed_business on public.offer_redemptions;

create trigger offer_redemptions_refuse_closed_business
before insert on public.offer_redemptions
for each row
execute function public.refuse_closed_business_redemption();

-- ---------------------------------------------------------------------------
-- Only an owner closes, and only through the function
-- ---------------------------------------------------------------------------

create or replace function public.prevent_unauthorized_business_close()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.closed_at is distinct from new.closed_at
     and auth.uid() is not null
     and not public.is_business_member(new.id, 'owner')
     and not public.is_platform_admin() then
    raise exception using
      errcode = '42501',
      message = 'Only an owner can close or reopen a business';
  end if;

  return new;
end;
$$;

drop trigger if exists businesses_prevent_unauthorized_close on public.businesses;

create trigger businesses_prevent_unauthorized_close
before update on public.businesses
for each row
execute function public.prevent_unauthorized_business_close();

create or replace function public.close_business(requested_business_id uuid)
returns public.businesses
language plpgsql
security definer
set search_path = public
as $$
declare
  business public.businesses;
begin
  if not public.is_business_member(requested_business_id, 'owner') then
    raise exception using
      errcode = '42501',
      message = 'Only an owner can close a business';
  end if;

  update public.businesses
  set closed_at = timezone('utc', now()),
      closed_by = auth.uid()
  where id = requested_business_id
    and closed_at is null
  returning * into business;

  if business.id is null then
    raise exception using
      errcode = 'P0008',
      message = 'That business is already closed';
  end if;

  return business;
end;
$$;

create or replace function public.reopen_business(requested_business_id uuid)
returns public.businesses
language plpgsql
security definer
set search_path = public
as $$
declare
  business public.businesses;
begin
  if not public.is_business_member(requested_business_id, 'owner') then
    raise exception using
      errcode = '42501',
      message = 'Only an owner can reopen a business';
  end if;

  update public.businesses
  set closed_at = null,
      closed_by = null
  where id = requested_business_id
    and closed_at is not null
  returning * into business;

  if business.id is null then
    raise exception using
      errcode = 'P0008',
      message = 'That business is not closed';
  end if;

  return business;
end;
$$;

revoke all on function public.close_business(uuid) from public, anon;
revoke all on function public.reopen_business(uuid) from public, anon;
grant execute on function public.close_business(uuid) to authenticated;
grant execute on function public.reopen_business(uuid) to authenticated;

comment on column public.businesses.closed_at is
  'Set by close_business() when an owner takes the business off Promotello. Nothing is deleted: listings hide it, nobody new can join or claim, and reopen_business() puts it back.';
