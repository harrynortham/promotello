-- Brings the migration history in line with changes made directly in the
-- Supabase dashboard. Every statement is idempotent, so this is a no-op
-- against the live project and rebuilds the same schema on a fresh one.

-- ---------------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------------

create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;

-- ---------------------------------------------------------------------------
-- New columns on existing tables
-- ---------------------------------------------------------------------------

alter table public.businesses
  add column if not exists logo_url text;

alter table public.offers
  add column if not exists max_redemptions integer;

alter table public.offers
  add column if not exists redemption_count integer not null default 0;

alter table public.offers
  add column if not exists image_url text;

alter table public.offers
  drop constraint if exists offers_max_redemptions_valid;

alter table public.offers
  add constraint offers_max_redemptions_valid
  check (max_redemptions is null or max_redemptions > 0);

alter table public.offers
  drop constraint if exists offers_redemption_count_valid;

alter table public.offers
  add constraint offers_redemption_count_valid
  check (redemption_count >= 0);

alter table public.offer_redemptions
  add column if not exists used_at timestamptz;

-- ---------------------------------------------------------------------------
-- Public read access for approved businesses and their locations
-- ---------------------------------------------------------------------------

drop policy if exists businesses_select_approved_public on public.businesses;

create policy businesses_select_approved_public
on public.businesses
for select
to anon, authenticated
using (
  approval_status = 'approved'
);

drop policy if exists business_locations_public_select on public.business_locations;

create policy business_locations_public_select
on public.business_locations
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.businesses b
    where b.id = business_locations.business_id
      and b.approval_status = 'approved'
  )
);

-- ---------------------------------------------------------------------------
-- business_hours
-- ---------------------------------------------------------------------------

create table if not exists public.business_hours (
  id uuid primary key default gen_random_uuid(),

  business_id uuid not null
    references public.businesses (id)
    on delete cascade,

  day_of_week smallint not null
    check (day_of_week >= 0 and day_of_week <= 6),

  is_closed boolean not null default false,
  opens_at time,
  closes_at time,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint business_hours_day_unique
    unique (business_id, day_of_week),

  constraint business_hours_times_valid
    check (
      is_closed = true
      or (
        opens_at is not null
        and closes_at is not null
        and opens_at < closes_at
      )
    )
);

create index if not exists business_hours_business_id_idx
  on public.business_hours (business_id);

alter table public.business_hours enable row level security;

drop policy if exists business_hours_public_select on public.business_hours;

create policy business_hours_public_select
on public.business_hours
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.businesses b
    where b.id = business_hours.business_id
      and b.approval_status = 'approved'
  )
);

drop policy if exists business_hours_admin_insert on public.business_hours;

create policy business_hours_admin_insert
on public.business_hours
for insert
to authenticated
with check (
  exists (
    select 1
    from public.business_members bm
    where bm.business_id = business_hours.business_id
      and bm.user_id = auth.uid()
      and bm.role in ('owner', 'admin')
  )
);

drop policy if exists business_hours_admin_update on public.business_hours;

create policy business_hours_admin_update
on public.business_hours
for update
to authenticated
using (
  exists (
    select 1
    from public.business_members bm
    where bm.business_id = business_hours.business_id
      and bm.user_id = auth.uid()
      and bm.role in ('owner', 'admin')
  )
)
with check (
  exists (
    select 1
    from public.business_members bm
    where bm.business_id = business_hours.business_id
      and bm.user_id = auth.uid()
      and bm.role in ('owner', 'admin')
  )
);

drop policy if exists business_hours_admin_delete on public.business_hours;

create policy business_hours_admin_delete
on public.business_hours
for delete
to authenticated
using (
  exists (
    select 1
    from public.business_members bm
    where bm.business_id = business_hours.business_id
      and bm.user_id = auth.uid()
      and bm.role in ('owner', 'admin')
  )
);

-- ---------------------------------------------------------------------------
-- business_notification_settings
-- ---------------------------------------------------------------------------

create table if not exists public.business_notification_settings (
  business_id uuid primary key
    references public.businesses (id)
    on delete cascade,

  daily_summary_enabled boolean not null default false,
  offer_fully_claimed_enabled boolean not null default true,
  low_inventory_enabled boolean not null default true,

  low_inventory_threshold integer not null default 10
    check (low_inventory_threshold > 0),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.business_notification_settings enable row level security;

drop policy if exists business_notification_settings_admin_select on public.business_notification_settings;

create policy business_notification_settings_admin_select
on public.business_notification_settings
for select
to authenticated
using (
  exists (
    select 1
    from public.business_members bm
    where bm.business_id = business_notification_settings.business_id
      and bm.user_id = auth.uid()
      and bm.role in ('owner', 'admin')
  )
);

drop policy if exists business_notification_settings_admin_insert on public.business_notification_settings;

create policy business_notification_settings_admin_insert
on public.business_notification_settings
for insert
to authenticated
with check (
  exists (
    select 1
    from public.business_members bm
    where bm.business_id = business_notification_settings.business_id
      and bm.user_id = auth.uid()
      and bm.role in ('owner', 'admin')
  )
);

drop policy if exists business_notification_settings_admin_update on public.business_notification_settings;

create policy business_notification_settings_admin_update
on public.business_notification_settings
for update
to authenticated
using (
  exists (
    select 1
    from public.business_members bm
    where bm.business_id = business_notification_settings.business_id
      and bm.user_id = auth.uid()
      and bm.role in ('owner', 'admin')
  )
)
with check (
  exists (
    select 1
    from public.business_members bm
    where bm.business_id = business_notification_settings.business_id
      and bm.user_id = auth.uid()
      and bm.role in ('owner', 'admin')
  )
);

-- ---------------------------------------------------------------------------
-- business_notification_deliveries (written by edge functions only)
-- ---------------------------------------------------------------------------

create table if not exists public.business_notification_deliveries (
  id uuid primary key default gen_random_uuid(),

  business_id uuid not null
    references public.businesses (id)
    on delete cascade,

  notification_type text not null,
  delivery_date date not null,
  recipient_email text not null,
  sent_at timestamptz not null default now(),

  constraint business_notification_delivery_unique
    unique (business_id, notification_type, delivery_date, recipient_email)
);

create index if not exists business_notification_deliveries_business_idx
  on public.business_notification_deliveries (business_id);

create index if not exists business_notification_deliveries_date_idx
  on public.business_notification_deliveries (delivery_date);

alter table public.business_notification_deliveries enable row level security;

-- ---------------------------------------------------------------------------
-- account_notification_settings
-- ---------------------------------------------------------------------------

create table if not exists public.account_notification_settings (
  user_id uuid primary key
    references auth.users (id)
    on delete cascade,

  local_deals_enabled boolean not null default false,
  product_updates_enabled boolean not null default false,
  feedback_requests_enabled boolean not null default false
);

alter table public.account_notification_settings enable row level security;

drop policy if exists "Users read their notification preferences" on public.account_notification_settings;

create policy "Users read their notification preferences"
on public.account_notification_settings
for select
to authenticated
using (
  user_id = (select auth.uid())
);

drop policy if exists "Users create their notification preferences" on public.account_notification_settings;

create policy "Users create their notification preferences"
on public.account_notification_settings
for insert
to authenticated
with check (
  user_id = (select auth.uid())
);

drop policy if exists "Users update their notification preferences" on public.account_notification_settings;

create policy "Users update their notification preferences"
on public.account_notification_settings
for update
to authenticated
using (
  user_id = (select auth.uid())
)
with check (
  user_id = (select auth.uid())
);

-- ---------------------------------------------------------------------------
-- contact_form_rate_limits (service role only)
-- ---------------------------------------------------------------------------

create table if not exists public.contact_form_rate_limits (
  email_hash text primary key,
  window_started_at timestamptz not null default now(),
  attempts integer not null default 1
    check (attempts > 0)
);

alter table public.contact_form_rate_limits enable row level security;

create or replace function public.consume_contact_form_limit(
  requested_email_hash text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
    accepted_attempts integer;
begin
    if requested_email_hash is null
       or requested_email_hash !~ '^[a-f0-9]{64}$' then
        raise exception 'Invalid rate limit key';
    end if;

    insert into public.contact_form_rate_limits as limits (
        email_hash,
        window_started_at,
        attempts
    )
    values (
        requested_email_hash,
        now(),
        1
    )
    on conflict (email_hash) do update
    set
        window_started_at = case
            when limits.window_started_at <= now() - interval '30 minutes'
                then now()
            else limits.window_started_at
        end,
        attempts = case
            when limits.window_started_at <= now() - interval '30 minutes'
                then 1
            else limits.attempts + 1
        end
    where
        limits.window_started_at <= now() - interval '30 minutes'
        or limits.attempts < 3
    returning attempts into accepted_attempts;

    return accepted_attempts is not null;
end;
$$;

revoke all on function public.consume_contact_form_limit(text)
from public, anon, authenticated;

grant execute on function public.consume_contact_form_limit(text)
to service_role;

-- ---------------------------------------------------------------------------
-- Redemption limits: redeem_offer now locks the offer, enforces
-- max_redemptions and increments redemption_count.
-- ---------------------------------------------------------------------------

create or replace function public.redeem_offer(
  requested_offer_id uuid
)
returns public.offer_redemptions
language plpgsql
security definer
set search_path = public
as $$
declare
  selected_offer public.offers;
  new_redemption public.offer_redemptions;
begin
  if auth.uid() is null then
    raise exception using
      errcode = '42501',
      message = 'Authentication is required';
  end if;

  /*
    Lock the offer row while checking and updating its limit.
    This prevents two customers from exceeding the limit at the same time.
  */
  select o.*
  into selected_offer
  from public.offers o
  join public.businesses b
    on b.id = o.business_id
  where o.id = requested_offer_id
    and o.approval_status = 'approved'
    and o.expires_at >= current_date
    and b.approval_status = 'approved'
  for update;

  if selected_offer.id is null then
    raise exception using
      errcode = 'P0002',
      message = 'This offer is not available';
  end if;

  if selected_offer.max_redemptions is not null
     and selected_offer.redemption_count >= selected_offer.max_redemptions then
    raise exception using
      errcode = 'P0003',
      message = 'This offer has been fully claimed';
  end if;

  insert into public.offer_redemptions (
    offer_id,
    user_id,
    redeemed_at
  )
  values (
    requested_offer_id,
    auth.uid(),
    now()
  )
  returning * into new_redemption;

  update public.offers
  set redemption_count = redemption_count + 1
  where id = requested_offer_id;

  return new_redemption;

exception
  when unique_violation then
    raise exception using
      errcode = '23505',
      message = 'You have already redeemed this offer';
end;
$$;

create or replace function public.mark_redemption_used(
  requested_redemption_id uuid
)
returns public.offer_redemptions
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_redemption public.offer_redemptions;
begin
  if auth.uid() is null then
    raise exception using
      errcode = '42501',
      message = 'Authentication is required';
  end if;

  update public.offer_redemptions as redemption
  set used_at = coalesce(redemption.used_at, now())
  from public.offers as offer
  where redemption.id = requested_redemption_id
    and redemption.offer_id = offer.id
    and exists (
      select 1
      from public.business_members as member
      where member.business_id = offer.business_id
        and member.user_id = auth.uid()
        and member.role in ('owner', 'admin', 'member')
    )
  returning redemption.*
  into updated_redemption;

  if updated_redemption.id is null then
    raise exception using
      errcode = '42501',
      message = 'Redemption not found or access denied';
  end if;

  return updated_redemption;
end;
$$;

revoke all on function public.mark_redemption_used(uuid)
from public;

grant execute on function public.mark_redemption_used(uuid)
to authenticated;

-- ---------------------------------------------------------------------------
-- Team management
-- ---------------------------------------------------------------------------

create or replace function public.get_business_team_members(
  requested_business_id uuid
)
returns table (
  user_id uuid,
  email text,
  role text,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_business_member(requested_business_id, 'admin') then
    raise exception using
      errcode = '42501',
      message = 'Business administrator access is required';
  end if;

  return query
  select
    bm.user_id,
    au.email::text,
    bm.role,
    bm.created_at
  from public.business_members bm
  join auth.users au
    on au.id = bm.user_id
  where bm.business_id = requested_business_id
  order by bm.created_at asc;
end;
$$;

revoke all on function public.get_business_team_members(uuid)
from public;

grant execute on function public.get_business_team_members(uuid)
to authenticated;

-- Adds a rate limit of 10 invitations per inviter per business per hour.
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
  normalized_email text;
  recent_invitation_count integer;
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

  normalized_email = lower(trim(invited_email));

  if normalized_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception using
      errcode = '22023',
      message = 'Please provide a valid email address';
  end if;

  if invited_role not in ('admin', 'member') then
    raise exception using
      errcode = '22023',
      message = 'Invalid team member role';
  end if;

  if exists (
    select 1
    from public.business_members bm
    join auth.users au
      on au.id = bm.user_id
    where bm.business_id = requested_business_id
      and lower(au.email) = normalized_email
  ) then
    raise exception using
      errcode = '23505',
      message = 'This person is already a team member';
  end if;

  if exists (
    select 1
    from public.business_invitations bi
    where bi.business_id = requested_business_id
      and lower(bi.email) = normalized_email
      and bi.accepted_at is null
      and bi.expires_at > timezone('utc', now())
  ) then
    raise exception using
      errcode = '23505',
      message = 'An active invitation already exists for this email';
  end if;

  select count(*)
  into recent_invitation_count
  from public.business_invitations
  where business_id = requested_business_id
    and invited_by = auth.uid()
    and created_at > timezone('utc', now()) - interval '1 hour';

  if recent_invitation_count >= 10 then
    raise exception using
      errcode = 'P0001',
      message = 'Invitation limit reached. Try again later';
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
    normalized_email,
    invited_role
  )
  returning * into new_invitation;

  return new_invitation;
end;
$$;

-- ---------------------------------------------------------------------------
-- Automatic audit logging
-- ---------------------------------------------------------------------------

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
    elsif old.redeemed_at is null
      and new.redeemed_at is not null then
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

drop trigger if exists businesses_audit_changes on public.businesses;

create trigger businesses_audit_changes
after insert or update on public.businesses
for each row
execute function public.audit_entity_changes();

drop trigger if exists offers_audit_changes on public.offers;

create trigger offers_audit_changes
after insert or update on public.offers
for each row
execute function public.audit_entity_changes();

drop trigger if exists business_invitations_audit_changes on public.business_invitations;

create trigger business_invitations_audit_changes
after insert or update on public.business_invitations
for each row
execute function public.audit_entity_changes();

drop trigger if exists offer_redemptions_audit_changes on public.offer_redemptions;

create trigger offer_redemptions_audit_changes
after insert or update on public.offer_redemptions
for each row
execute function public.audit_entity_changes();

-- ---------------------------------------------------------------------------
-- Storage buckets and policies
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values
  ('business-logos', 'business-logos', true),
  ('offer-images', 'offer-images', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'profile-images',
  'profile-images',
  true,
  2097152,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

drop policy if exists business_logos_public_read on storage.objects;

create policy business_logos_public_read
on storage.objects
for select
to anon, authenticated
using (
  bucket_id = 'business-logos'
);

drop policy if exists business_logos_authenticated_upload on storage.objects;

create policy business_logos_authenticated_upload
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'business-logos'
);

drop policy if exists business_logos_authenticated_update on storage.objects;

create policy business_logos_authenticated_update
on storage.objects
for update
to authenticated
using (
  bucket_id = 'business-logos'
)
with check (
  bucket_id = 'business-logos'
);

drop policy if exists offer_images_public_read on storage.objects;

create policy offer_images_public_read
on storage.objects
for select
to anon, authenticated
using (
  bucket_id = 'offer-images'
);

drop policy if exists offer_images_business_admin_upload on storage.objects;

create policy offer_images_business_admin_upload
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'offer-images'
  and exists (
    select 1
    from public.business_members bm
    where bm.business_id = ((storage.foldername(objects.name))[1])::uuid
      and bm.user_id = auth.uid()
      and bm.role in ('owner', 'admin')
  )
);

drop policy if exists offer_images_business_admin_update on storage.objects;

create policy offer_images_business_admin_update
on storage.objects
for update
to authenticated
using (
  bucket_id = 'offer-images'
  and exists (
    select 1
    from public.business_members bm
    where bm.business_id = ((storage.foldername(objects.name))[1])::uuid
      and bm.user_id = auth.uid()
      and bm.role in ('owner', 'admin')
  )
)
with check (
  bucket_id = 'offer-images'
  and exists (
    select 1
    from public.business_members bm
    where bm.business_id = ((storage.foldername(objects.name))[1])::uuid
      and bm.user_id = auth.uid()
      and bm.role in ('owner', 'admin')
  )
);

drop policy if exists "Users upload their own profile images" on storage.objects;

create policy "Users upload their own profile images"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'profile-images'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists "Users delete their own profile images" on storage.objects;

create policy "Users delete their own profile images"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'profile-images'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

-- ---------------------------------------------------------------------------
-- Scheduled jobs
-- Requires Vault secrets `project_url` and `publishable_key`, which are set
-- per project in the dashboard and deliberately not stored here.
-- ---------------------------------------------------------------------------

select cron.schedule(
  'send-business-daily-summary',
  '0 8 * * *',
  $cron$
    select net.http_post(
      url := (
        select decrypted_secret
        from vault.decrypted_secrets
        where name = 'project_url'
      ) || '/functions/v1/send-business-daily-summary',

      headers := jsonb_build_object(
        'Content-Type',
        'application/json',
        'apikey',
        (
          select decrypted_secret
          from vault.decrypted_secrets
          where name = 'publishable_key'
        )
      ),

      body := '{}'::jsonb
    );
  $cron$
);
