-- 1. write_audit_log is SECURITY DEFINER and writes any action it is given.
--    The app never calls it (audit_entity_changes writes logs via triggers),
--    so remove client access to stop forged audit entries.
revoke all on function public.write_audit_log(text, text, uuid, uuid, jsonb)
from public, anon, authenticated;

grant execute on function public.write_audit_log(text, text, uuid, uuid, jsonb)
to service_role;

-- 2. Business logos: only owners and admins of the business named by the
--    first folder segment (`<business_id>/logo-*.ext`) may upload or replace.
--    Compared as text so a non-UUID folder can't raise a cast error.
drop policy if exists business_logos_authenticated_upload on storage.objects;
drop policy if exists business_logos_authenticated_update on storage.objects;

drop policy if exists business_logos_business_admin_upload on storage.objects;

create policy business_logos_business_admin_upload
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'business-logos'
  and exists (
    select 1
    from public.business_members bm
    where bm.business_id::text = (storage.foldername(objects.name))[1]
      and bm.user_id = (select auth.uid())
      and bm.role in ('owner', 'admin')
  )
);

drop policy if exists business_logos_business_admin_update on storage.objects;

create policy business_logos_business_admin_update
on storage.objects
for update
to authenticated
using (
  bucket_id = 'business-logos'
  and exists (
    select 1
    from public.business_members bm
    where bm.business_id::text = (storage.foldername(objects.name))[1]
      and bm.user_id = (select auth.uid())
      and bm.role in ('owner', 'admin')
  )
)
with check (
  bucket_id = 'business-logos'
  and exists (
    select 1
    from public.business_members bm
    where bm.business_id::text = (storage.foldername(objects.name))[1]
      and bm.user_id = (select auth.uid())
      and bm.role in ('owner', 'admin')
  )
);

-- 3. redeem_offer now sets redeemed_at when the offer is claimed, and
--    mark_redemption_used sets used_at when it is used in store. Log
--    'redemption_used' on the used_at transition so it actually fires.
create or replace function public.audit_entity_changes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  audit_action text;
  audit_entity_type text;
  audit_business_id uuid;
  audit_metadata jsonb;
begin
  if tg_table_name = 'businesses' then
    audit_entity_type := 'business';
    audit_business_id := new.id;

    if tg_op = 'INSERT' then
      audit_action := 'business_created';
      audit_metadata := jsonb_build_object(
        'name', new.name,
        'category', new.category
      );
    elsif old.approval_status is distinct from new.approval_status then
      audit_action := case new.approval_status
        when 'approved' then 'business_approved'
        when 'rejected' then 'business_rejected'
        when 'suspended' then 'business_suspended'
        else 'business_created'
      end;

      audit_metadata := jsonb_build_object(
        'previous_status', old.approval_status,
        'new_status', new.approval_status
      );
    else
      return new;
    end if;

  elsif tg_table_name = 'offers' then
    audit_entity_type := 'offer';
    audit_business_id := new.business_id;

    if tg_op = 'INSERT' then
      audit_action := 'offer_created';
      audit_metadata := jsonb_build_object(
        'title', new.title,
        'category', new.category
      );
    elsif old.approval_status is distinct from new.approval_status then
      audit_action := case new.approval_status
        when 'approved' then 'offer_approved'
        when 'rejected' then 'offer_rejected'
        when 'suspended' then 'offer_suspended'
        else 'offer_created'
      end;

      audit_metadata := jsonb_build_object(
        'previous_status', old.approval_status,
        'new_status', new.approval_status
      );
    else
      return new;
    end if;

  elsif tg_table_name = 'business_invitations' then
    audit_entity_type := 'invitation';
    audit_business_id := new.business_id;

    if tg_op = 'INSERT' then
      audit_action := 'invitation_created';
      audit_metadata := jsonb_build_object(
        'email', new.email,
        'role', new.role
      );
    elsif old.accepted_at is null
      and new.accepted_at is not null then
      audit_action := 'invitation_accepted';
      audit_metadata := jsonb_build_object(
        'email', new.email,
        'role', new.role
      );
    else
      return new;
    end if;

  elsif tg_table_name = 'offer_redemptions' then
    audit_entity_type := 'redemption';

    select business_id
    into audit_business_id
    from public.offers
    where id = new.offer_id;

    if tg_op = 'INSERT' then
      audit_action := 'redemption_created';
      audit_metadata := jsonb_build_object(
        'offer_id', new.offer_id,
        'redemption_code', new.redemption_code
      );
    elsif old.used_at is null
      and new.used_at is not null then
      audit_action := 'redemption_used';
      audit_metadata := jsonb_build_object(
        'offer_id', new.offer_id,
        'redemption_code', new.redemption_code
      );
    else
      return new;
    end if;

  else
    return new;
  end if;

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
    audit_business_id,
    audit_action,
    audit_entity_type,
    new.id,
    audit_metadata
  );

  return new;
end;
$$;
