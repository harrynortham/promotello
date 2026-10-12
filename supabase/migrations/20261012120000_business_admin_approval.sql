drop policy if exists businesses_platform_admin_select
on public.businesses;

create policy businesses_platform_admin_select
on public.businesses
for select
to authenticated
using (
  public.is_platform_admin()
);

create or replace function public.prevent_unauthorized_business_approval()
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
      message = 'Only platform administrators can change business approval status';
  end if;

  return new;
end;
$$;

drop trigger if exists businesses_prevent_unauthorized_approval
on public.businesses;

create trigger businesses_prevent_unauthorized_approval
before update on public.businesses
for each row
execute function public.prevent_unauthorized_business_approval();

create or replace function public.review_business(
  business_id uuid,
  decision text
)
returns public.businesses
language plpgsql
security definer
set search_path = public
as $$
declare
  reviewed_business public.businesses;
begin
  if not public.is_platform_admin() then
    raise exception using
      errcode = '42501',
      message = 'Platform administrator access is required';
  end if;

  if decision not in ('approved', 'rejected', 'suspended') then
    raise exception using
      errcode = '22023',
      message = 'Invalid business decision';
  end if;

  update public.businesses
  set
    approval_status = decision,
    updated_at = timezone('utc', now())
  where id = business_id
  returning * into reviewed_business;

  if reviewed_business.id is null then
    raise exception using
      errcode = 'P0002',
      message = 'Business not found';
  end if;

  return reviewed_business;
end;
$$;

revoke all on function public.review_business(uuid, text)
from public;

grant execute on function public.review_business(uuid, text)
to authenticated;