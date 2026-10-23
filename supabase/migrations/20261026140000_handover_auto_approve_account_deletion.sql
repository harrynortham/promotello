-- 1. Hand over a business: an owner (typically Promotello setting a shop up
--    in person) invites the real owner, who becomes owner on accepting; the
--    person who set it up then leaves the team.
-- 2. Offers from approved businesses on Pro go live without manual review.
-- 3. Self-serve account deletion: deleting a user no longer fails because
--    they created a business, offer or invitation.

-- ---------------------------------------------------------------------------
-- 1. Hand-over invitations
-- ---------------------------------------------------------------------------

alter table public.business_invitations
  add column if not exists hand_over boolean not null default false;

alter table public.business_invitations
  drop constraint if exists business_invitations_role_check;

-- Owner invitations exist only as hand-overs.
alter table public.business_invitations
  add constraint business_invitations_role_check
  check (role in ('admin', 'member') or (role = 'owner' and hand_over));

create or replace function public.create_business_handover(
  requested_business_id uuid,
  owner_email text
)
returns public.business_invitations
language plpgsql
security definer
set search_path = public
as $$
declare
  new_invitation public.business_invitations;
  normalized_email text := lower(trim(owner_email));
begin
  if not public.is_business_member(requested_business_id, 'owner') then
    raise exception using
      errcode = '42501',
      message = 'Only business owners can hand over a business';
  end if;

  if normalized_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception using
      errcode = '22023',
      message = 'Please provide a valid email address';
  end if;

  if normalized_email = (select lower(email) from auth.users where id = auth.uid()) then
    raise exception using
      errcode = '22023',
      message = 'Enter the new owner''s email address, not your own';
  end if;

  -- Only one hand-over at a time: a new one replaces any still pending.
  delete from public.business_invitations
  where business_id = requested_business_id
    and hand_over
    and accepted_at is null;

  insert into public.business_invitations (business_id, invited_by, email, role, hand_over, expires_at)
  values (
    requested_business_id,
    auth.uid(),
    normalized_email,
    'owner',
    true,
    timezone('utc', now()) + interval '14 days'
  )
  returning * into new_invitation;

  return new_invitation;
end;
$$;

revoke all on function public.create_business_handover(uuid, text) from public, anon;
grant execute on function public.create_business_handover(uuid, text) to authenticated;

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

  -- A hand-over: whoever set the business up leaves the team.
  if invitation.hand_over and invitation.invited_by is distinct from auth.uid() then
    delete from public.business_members
    where business_id = invitation.business_id
      and user_id = invitation.invited_by;
  end if;

  update public.business_invitations
  set accepted_at = timezone('utc', now())
  where id = invitation.id;

  return new_member;
end;
$$;

revoke all on function public.accept_business_invitation(text) from public;
grant execute on function public.accept_business_invitation(text) to authenticated;

-- ---------------------------------------------------------------------------
-- 2. Auto-approve offers from approved Pro businesses
-- ---------------------------------------------------------------------------

create or replace function public.offer_auto_approvable(requested_business_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.businesses
    where id = requested_business_id and approval_status = 'approved'
  )
  and public.business_has_pro(requested_business_id);
$$;

revoke all on function public.offer_auto_approvable(uuid) from public, anon, authenticated;

-- Offers are inserted as pending (the insert policy requires it); this
-- approves them straight after when the business qualifies.
create or replace function public.auto_approve_offer()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.approval_status = 'pending' and public.offer_auto_approvable(new.business_id) then
    update public.offers
    set approval_status = 'approved', updated_at = timezone('utc', now())
    where id = new.id;
  end if;

  return null;
end;
$$;

drop trigger if exists offers_auto_approve on public.offers;

create trigger offers_auto_approve
after insert on public.offers
for each row
execute function public.auto_approve_offer();

-- Approval changes stay admin-only, except pending -> approved for a
-- business that qualifies for auto-approval.
create or replace function public.prevent_unauthorized_offer_approval()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.approval_status is distinct from new.approval_status
     and not public.is_platform_admin()
     and not (
       old.approval_status = 'pending'
       and new.approval_status = 'approved'
       and public.offer_auto_approvable(new.business_id)
     ) then
    raise exception using
      errcode = '42501',
      message = 'Only platform administrators can change offer approval status';
  end if;

  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- 3. Account deletion
-- ---------------------------------------------------------------------------

-- Keep businesses, offers and invitations when the person who created them
-- deletes their account.
alter table public.businesses alter column created_by drop not null;
alter table public.businesses drop constraint if exists businesses_created_by_fkey;
alter table public.businesses
  add constraint businesses_created_by_fkey
  foreign key (created_by) references auth.users (id) on delete set null;

alter table public.offers drop constraint if exists offers_created_by_fkey;
alter table public.offers
  add constraint offers_created_by_fkey
  foreign key (created_by) references auth.users (id) on delete set null;

alter table public.business_invitations drop constraint if exists business_invitations_invited_by_fkey;
alter table public.business_invitations
  add constraint business_invitations_invited_by_fkey
  foreign key (invited_by) references auth.users (id) on delete cascade;

-- What deleting the signed-in user's account would do to their businesses.
-- Businesses they own alone with no team are deleted with the account;
-- ones with a subscription or other team members must be dealt with first.
create or replace function public.account_deletion_check()
returns table (
  business_id uuid,
  business_name text,
  outcome text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    b.id,
    b.name,
    case
      when exists (
        select 1 from public.subscriptions s
        where s.business_id = b.id
          and s.status in ('trialing', 'active', 'past_due', 'unpaid', 'paused')
      ) then 'cancel_subscription'
      when exists (
        select 1 from public.business_members other
        where other.business_id = b.id and other.user_id <> m.user_id
      ) then 'hand_over'
      else 'delete'
    end
  from public.business_members m
  join public.businesses b on b.id = m.business_id
  where m.user_id = auth.uid()
    and m.role = 'owner'
    and not exists (
      select 1 from public.business_members co
      where co.business_id = m.business_id
        and co.role = 'owner'
        and co.user_id <> m.user_id
    )
  order by b.name;
$$;

revoke all on function public.account_deletion_check() from public, anon;
grant execute on function public.account_deletion_check() to authenticated;

-- ---------------------------------------------------------------------------
-- Invitation preview for /invite/<token>: which business, which email and
-- whether it's a hand-over, so the page can guide people who aren't signed
-- in yet. The token itself is the secret.
-- ---------------------------------------------------------------------------

create or replace function public.business_invitation_preview(requested_token text)
returns table (
  business_id uuid,
  business_name text,
  email text,
  role text,
  hand_over boolean,
  status text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    b.id,
    b.name,
    i.email,
    i.role,
    i.hand_over,
    case
      when i.accepted_at is not null then 'accepted'
      when i.expires_at <= timezone('utc', now()) then 'expired'
      else 'pending'
    end
  from public.business_invitations i
  join public.businesses b on b.id = i.business_id
  where i.invitation_token = requested_token;
$$;

revoke all on function public.business_invitation_preview(text) from public;
grant execute on function public.business_invitation_preview(text) to anon, authenticated;
