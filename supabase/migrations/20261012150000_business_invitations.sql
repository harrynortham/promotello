create table if not exists public.business_invitations (
  id uuid primary key default gen_random_uuid(),

  business_id uuid not null
    references public.businesses (id)
    on delete cascade,

  invited_by uuid not null
    references auth.users (id)
    on delete restrict,

  email text not null
    check (char_length(trim(email)) between 5 and 320),

  role text not null
    check (role in ('admin', 'member')),

  invitation_token text not null unique
    default replace(gen_random_uuid()::text, '-', ''),

  expires_at timestamptz not null
    default timezone('utc', now()) + interval '7 days',

  accepted_at timestamptz,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists business_invitations_business_id_idx
  on public.business_invitations (business_id);

create index if not exists business_invitations_token_idx
  on public.business_invitations (invitation_token);

alter table public.business_invitations enable row level security;

create policy business_invitations_select_admins
on public.business_invitations
for select
to authenticated
using (
  public.is_business_member(business_id, 'admin')
);

create or replace function public.create_business_invitation(
  requested_business_id uuid,
  invited_email text,
  invited_role text
)
returns public.business_invitations
language plpgsql
security definer
set search_path = public
as $$
declare
  new_invitation public.business_invitations;
begin
  if auth.uid() is null then
    raise exception using
      errcode = '42501',
      message = 'Authentication is required';
  end if;

  if not public.is_business_member(requested_business_id, 'owner') then
    raise exception using
      errcode = '42501',
      message = 'Only business owners can invite team members';
  end if;

  if invited_role not in ('admin', 'member') then
    raise exception using
      errcode = '22023',
      message = 'Invalid team member role';
  end if;

  insert into public.business_invitations (
    business_id,
    invited_by,
    email,
    role
  )
  values (
    requested_business_id,
    auth.uid(),
    lower(trim(invited_email)),
    invited_role
  )
  returning * into new_invitation;

  return new_invitation;
end;
$$;

revoke all on function public.create_business_invitation(uuid, text, text)
from public;

grant execute on function public.create_business_invitation(uuid, text, text)
to authenticated;

create or replace function public.accept_business_invitation(
  requested_token text
)
returns public.business_members
language plpgsql
security definer
set search_path = public
as $$
declare
  invitation public.business_invitations;
  new_member public.business_members;
  current_email text;
begin
  if auth.uid() is null then
    raise exception using
      errcode = '42501',
      message = 'Authentication is required';
  end if;

  select email
  into current_email
  from auth.users
  where id = auth.uid();

  select *
  into invitation
  from public.business_invitations
  where invitation_token = requested_token
    and accepted_at is null
    and expires_at > timezone('utc', now());

  if invitation.id is null then
    raise exception using
      errcode = 'P0002',
      message = 'This invitation is invalid or expired';
  end if;

  if lower(current_email) <> lower(invitation.email) then
    raise exception using
      errcode = '42501',
      message = 'This invitation belongs to a different email address';
  end if;

  insert into public.business_members (
    business_id,
    user_id,
    role
  )
  values (
    invitation.business_id,
    auth.uid(),
    invitation.role
  )
  on conflict (business_id, user_id)
  do update set
    role = excluded.role,
    updated_at = timezone('utc', now())
  returning * into new_member;

  update public.business_invitations
  set accepted_at = timezone('utc', now())
  where id = invitation.id;

  return new_member;
end;
$$;

revoke all on function public.accept_business_invitation(text)
from public;

grant execute on function public.accept_business_invitation(text)
to authenticated;