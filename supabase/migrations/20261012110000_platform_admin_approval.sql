create table if not exists public.platform_admins (
  user_id uuid primary key
    references auth.users (id)
    on delete cascade,

  created_at timestamptz not null default timezone('utc', now())
);

alter table public.platform_admins enable row level security;

create or replace function public.is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.platform_admins
    where user_id = (select auth.uid())
  );
$$;

revoke all on function public.is_platform_admin() from public;

grant execute on function public.is_platform_admin()
to authenticated;

drop policy if exists platform_admins_select_self
on public.platform_admins;

create policy platform_admins_select_self
on public.platform_admins
for select
to authenticated
using (
  user_id = auth.uid()
);

drop policy if exists offers_platform_admin_select
on public.offers;

create policy offers_platform_admin_select
on public.offers
for select
to authenticated
using (
  public.is_platform_admin()
);

create or replace function public.prevent_unauthorized_offer_approval()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.approval_status is distinct from new.approval_status
     and not public.is_platform_admin() then
    raise exception using
      errcode = '42501',
      message = 'Only platform administrators can change offer approval status';
  end if;

  return new;
end;
$$;

drop trigger if exists offers_prevent_unauthorized_approval
on public.offers;

create trigger offers_prevent_unauthorized_approval
before update on public.offers
for each row
execute function public.prevent_unauthorized_offer_approval();

create or replace function public.review_offer(
  offer_id uuid,
  decision text
)
returns public.offers
language plpgsql
security definer
set search_path = public
as $$
declare
  reviewed_offer public.offers;
begin
  if not public.is_platform_admin() then
    raise exception using
      errcode = '42501',
      message = 'Platform administrator access is required';
  end if;

  if decision not in ('approved', 'rejected', 'suspended') then
    raise exception using
      errcode = '22023',
      message = 'Invalid offer decision';
  end if;

  update public.offers
  set
    approval_status = decision,
    updated_at = timezone('utc', now())
  where id = offer_id
  returning * into reviewed_offer;

  if reviewed_offer.id is null then
    raise exception using
      errcode = 'P0002',
      message = 'Offer not found';
  end if;

  return reviewed_offer;
end;
$$;

revoke all on function public.review_offer(uuid, text)
from public;

grant execute on function public.review_offer(uuid, text)
to authenticated;