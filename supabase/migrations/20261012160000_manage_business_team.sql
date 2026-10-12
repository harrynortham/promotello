create or replace function public.update_business_member_role(
  requested_business_id uuid,
  requested_user_id uuid,
  new_role text
)
returns public.business_members
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_member public.business_members;
begin
  if not public.is_business_member(requested_business_id, 'owner') then
    raise exception using
      errcode = '42501',
      message = 'Only business owners can change team roles';
  end if;

  if new_role not in ('admin', 'member') then
    raise exception using
      errcode = '22023',
      message = 'Invalid team member role';
  end if;

  update public.business_members
  set
    role = new_role,
    updated_at = timezone('utc', now())
  where business_id = requested_business_id
    and user_id = requested_user_id
    and role <> 'owner'
  returning * into updated_member;

  if updated_member.user_id is null then
    raise exception using
      errcode = 'P0002',
      message = 'Team member not found or cannot be changed';
  end if;

  return updated_member;
end;
$$;

revoke all on function public.update_business_member_role(uuid, uuid, text)
from public;

grant execute on function public.update_business_member_role(uuid, uuid, text)
to authenticated;


create or replace function public.remove_business_member(
  requested_business_id uuid,
  requested_user_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_business_member(requested_business_id, 'owner') then
    raise exception using
      errcode = '42501',
      message = 'Only business owners can remove team members';
  end if;

  if requested_user_id = auth.uid() then
    raise exception using
      errcode = '22023',
      message = 'The business owner cannot remove themselves';
  end if;

  delete from public.business_members
  where business_id = requested_business_id
    and user_id = requested_user_id
    and role <> 'owner';

  if not found then
    raise exception using
      errcode = 'P0002',
      message = 'Team member not found or cannot be removed';
  end if;
end;
$$;

revoke all on function public.remove_business_member(uuid, uuid)
from public;

grant execute on function public.remove_business_member(uuid, uuid)
to authenticated;


create or replace function public.revoke_business_invitation(
  requested_business_id uuid,
  requested_invitation_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_business_member(requested_business_id, 'owner') then
    raise exception using
      errcode = '42501',
      message = 'Only business owners can revoke invitations';
  end if;

  delete from public.business_invitations
  where id = requested_invitation_id
    and business_id = requested_business_id
    and accepted_at is null;

  if not found then
    raise exception using
      errcode = 'P0002',
      message = 'Pending invitation not found';
  end if;
end;
$$;

revoke all on function public.revoke_business_invitation(uuid, uuid)
from public;

grant execute on function public.revoke_business_invitation(uuid, uuid)
to authenticated;