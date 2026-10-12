create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),

  actor_user_id uuid
    references auth.users (id)
    on delete set null,

  business_id uuid
    references public.businesses (id)
    on delete cascade,

  action text not null
    check (
      action in (
        'business_created',
        'business_approved',
        'business_rejected',
        'business_suspended',
        'offer_created',
        'offer_approved',
        'offer_rejected',
        'offer_suspended',
        'invitation_created',
        'invitation_accepted',
        'invitation_revoked',
        'member_role_changed',
        'member_removed',
        'redemption_created',
        'redemption_used'
      )
    ),

  entity_type text not null
    check (
      entity_type in (
        'business',
        'offer',
        'invitation',
        'member',
        'redemption'
      )
    ),

  entity_id uuid not null,

  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists audit_logs_business_id_idx
  on public.audit_logs (business_id);

create index if not exists audit_logs_actor_user_id_idx
  on public.audit_logs (actor_user_id);

create index if not exists audit_logs_created_at_idx
  on public.audit_logs (created_at desc);

create index if not exists audit_logs_action_idx
  on public.audit_logs (action);

alter table public.audit_logs enable row level security;

create policy audit_logs_platform_admin_select
on public.audit_logs
for select
to authenticated
using (
  public.is_platform_admin()
);

create policy audit_logs_business_admin_select
on public.audit_logs
for select
to authenticated
using (
  business_id is not null
  and public.is_business_member(business_id, 'admin')
);

create or replace function public.write_audit_log(
  requested_action text,
  requested_entity_type text,
  requested_entity_id uuid,
  requested_business_id uuid default null,
  requested_metadata jsonb default '{}'::jsonb
)
returns public.audit_logs
language plpgsql
security definer
set search_path = public
as $$
declare
  new_log public.audit_logs;
begin
  insert into public.audit_logs (
    actor_user_id,
    business_id,
    action,
    entity_type,
    entity_id,
    metadata
  )
  values (
    auth.uid(),
    requested_business_id,
    requested_action,
    requested_entity_type,
    requested_entity_id,
    coalesce(requested_metadata, '{}'::jsonb)
  )
  returning * into new_log;

  return new_log;
end;
$$;

revoke all on function public.write_audit_log(
  text,
  text,
  uuid,
  uuid,
  jsonb
)
from public;

grant execute on function public.write_audit_log(
  text,
  text,
  uuid,
  uuid,
  jsonb
)
to authenticated;