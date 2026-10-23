-- QR posters with scan tracking. A business creates one code per placement
-- (front window, till, table tent...) pointing at its profile or one of its
-- offers. /q/<code> records a scan and redirects.

create table if not exists public.qr_codes (
  id uuid primary key default gen_random_uuid(),

  business_id uuid not null
    references public.businesses (id)
    on delete cascade,

  -- Optional: send scans to one offer instead of the business profile.
  offer_id uuid
    references public.offers (id)
    on delete set null,

  code text not null unique
    default lower(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8))
    check (code ~ '^[a-z0-9]{6,16}$'),

  label text not null
    check (char_length(trim(label)) between 2 and 60),

  created_by uuid
    references auth.users (id)
    on delete set null,

  created_at timestamptz not null default timezone('utc', now()),
  archived_at timestamptz
);

create index if not exists qr_codes_business_id_idx
  on public.qr_codes (business_id);

create table if not exists public.qr_scans (
  id bigint generated always as identity primary key,

  qr_code_id uuid not null
    references public.qr_codes (id)
    on delete cascade,

  scanned_at timestamptz not null default timezone('utc', now()),

  -- Only the device type is kept: no IP address or full user agent.
  device text not null default 'other'
    check (device in ('mobile', 'tablet', 'desktop', 'other'))
);

create index if not exists qr_scans_code_scanned_at_idx
  on public.qr_scans (qr_code_id, scanned_at desc);

-- ---------------------------------------------------------------------------
-- RLS: members see their business's codes and scans; admins manage codes.
-- Scans are only written by record_qr_scan().
-- ---------------------------------------------------------------------------

alter table public.qr_codes enable row level security;
alter table public.qr_scans enable row level security;

drop policy if exists qr_codes_select_members on public.qr_codes;

create policy qr_codes_select_members
on public.qr_codes
for select
to authenticated
using (
  public.is_business_member(business_id, 'member')
);

drop policy if exists qr_codes_insert_admins on public.qr_codes;

create policy qr_codes_insert_admins
on public.qr_codes
for insert
to authenticated
with check (
  public.is_business_member(business_id, 'admin')
  and created_by = (select auth.uid())
  and (
    offer_id is null
    or exists (
      select 1
      from public.offers o
      where o.id = qr_codes.offer_id
        and o.business_id = qr_codes.business_id
    )
  )
);

drop policy if exists qr_codes_update_admins on public.qr_codes;

create policy qr_codes_update_admins
on public.qr_codes
for update
to authenticated
using (
  public.is_business_member(business_id, 'admin')
)
with check (
  public.is_business_member(business_id, 'admin')
  and (
    offer_id is null
    or exists (
      select 1
      from public.offers o
      where o.id = qr_codes.offer_id
        and o.business_id = qr_codes.business_id
    )
  )
);

drop policy if exists qr_codes_delete_admins on public.qr_codes;

create policy qr_codes_delete_admins
on public.qr_codes
for delete
to authenticated
using (
  public.is_business_member(business_id, 'admin')
);

drop policy if exists qr_scans_select_members on public.qr_scans;

create policy qr_scans_select_members
on public.qr_scans
for select
to authenticated
using (
  exists (
    select 1
    from public.qr_codes qr
    where qr.id = qr_scans.qr_code_id
      and public.is_business_member(qr.business_id, 'member')
  )
);

-- ---------------------------------------------------------------------------
-- Free plan: 1 active QR code. Pro: unlimited.
-- ---------------------------------------------------------------------------

create or replace function public.enforce_qr_plan_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  other_active integer;
begin
  if new.archived_at is not null then
    return new;
  end if;

  if tg_op = 'UPDATE' and old.archived_at is null then
    return new;
  end if;

  if public.business_has_pro(new.business_id) then
    return new;
  end if;

  perform 1 from public.businesses where id = new.business_id for update;

  select count(*)
  into other_active
  from public.qr_codes
  where business_id = new.business_id
    and id <> new.id
    and archived_at is null;

  if other_active >= 1 then
    raise exception using
      errcode = 'P0004',
      message = 'The Free plan includes 1 QR code. Upgrade to Pro for a code in every spot.';
  end if;

  return new;
end;
$$;

drop trigger if exists qr_codes_enforce_plan_limit on public.qr_codes;

create trigger qr_codes_enforce_plan_limit
before insert or update on public.qr_codes
for each row
execute function public.enforce_qr_plan_limit();

-- ---------------------------------------------------------------------------
-- Scan endpoint: records the scan and returns where to send the visitor.
-- Callable by anyone (scans come from signed-out phones).
-- ---------------------------------------------------------------------------

create or replace function public.record_qr_scan(
  requested_code text,
  requested_device text default 'other'
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  qr public.qr_codes;
  offer_slug text;
begin
  select q.*
  into qr
  from public.qr_codes q
  join public.businesses b
    on b.id = q.business_id
  where q.code = lower(requested_code)
    and q.archived_at is null
    and b.approval_status = 'approved';

  if qr.id is null then
    return null;
  end if;

  insert into public.qr_scans (qr_code_id, device)
  values (
    qr.id,
    case
      when requested_device in ('mobile', 'tablet', 'desktop') then requested_device
      else 'other'
    end
  );

  -- Send scans for an offer that has ended or been paused to the business.
  if qr.offer_id is not null then
    select o.slug
    into offer_slug
    from public.offers o
    where o.id = qr.offer_id
      and o.approval_status = 'approved'
      and o.expires_at >= current_date
      and o.plan_paused_at is null;
  end if;

  if offer_slug is not null then
    return '/offers/' || offer_slug;
  end if;

  return '/businesses/' || qr.business_id;
end;
$$;

revoke all on function public.record_qr_scan(text, text) from public;
grant execute on function public.record_qr_scan(text, text) to anon, authenticated;
