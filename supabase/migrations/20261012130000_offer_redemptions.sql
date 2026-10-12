create table if not exists public.offer_redemptions (
  id uuid primary key default gen_random_uuid(),

  offer_id uuid not null
    references public.offers (id)
    on delete cascade,

  user_id uuid not null
    references auth.users (id)
    on delete cascade,

  redemption_code text not null unique
    default upper(
      substr(
        replace(gen_random_uuid()::text, '-', ''),
        1,
        10
      )
    ),

  redeemed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),

  unique (offer_id, user_id)
);

create index if not exists offer_redemptions_offer_id_idx
  on public.offer_redemptions (offer_id);

create index if not exists offer_redemptions_user_id_idx
  on public.offer_redemptions (user_id);

alter table public.offer_redemptions enable row level security;

create policy offer_redemptions_select_own
on public.offer_redemptions
for select
to authenticated
using (
  user_id = auth.uid()
);

create policy offer_redemptions_select_business
on public.offer_redemptions
for select
to authenticated
using (
  exists (
    select 1
    from public.offers
    where offers.id = offer_redemptions.offer_id
      and public.is_business_member(offers.business_id, 'member')
  )
);

create or replace function public.redeem_offer(
  requested_offer_id uuid
)
returns public.offer_redemptions
language plpgsql
security definer
set search_path = public
as $$
declare
  new_redemption public.offer_redemptions;
begin
  if auth.uid() is null then
    raise exception using
      errcode = '42501',
      message = 'Authentication is required';
  end if;

  if not exists (
    select 1
    from public.offers
    join public.businesses
      on businesses.id = offers.business_id
    where offers.id = requested_offer_id
      and offers.approval_status = 'approved'
      and offers.expires_at >= current_date
      and businesses.approval_status = 'approved'
  ) then
    raise exception using
      errcode = 'P0002',
      message = 'This offer is not available';
  end if;

  insert into public.offer_redemptions (
    offer_id,
    user_id
  )
  values (
    requested_offer_id,
    auth.uid()
  )
  returning * into new_redemption;

  return new_redemption;

exception
  when unique_violation then
    raise exception using
      errcode = '23505',
      message = 'You have already redeemed this offer';
end;
$$;

revoke all on function public.redeem_offer(uuid)
from public;

grant execute on function public.redeem_offer(uuid)
to authenticated;