-- A scanned code never dies.
--
-- A poster stays in a window long after the offer printed on it ends, so a
-- scan has to land somewhere useful whatever happened to the thing it points
-- at, and the visitor has to be told why the page they got isn't the one the
-- poster promised. A retired code keeps answering and keeps counting too,
-- which is how a business finds out that a poster it forgot about is still
-- out there being scanned.
--
-- Only an unapproved business still resolves to nothing. That isn't a dead
-- end by accident: its page isn't public yet, so there is nowhere to send
-- anyone.

-- The update and insert policies were written before loyalty_program_id
-- existed and never validated it, so an admin could point one of their codes
-- at another business's card. Both checks now cover each target.
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
  and (
    loyalty_program_id is null
    or exists (
      select 1
      from public.loyalty_programs p
      where p.id = qr_codes.loyalty_program_id
        and p.business_id = qr_codes.business_id
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
  and (
    loyalty_program_id is null
    or exists (
      select 1
      from public.loyalty_programs p
      where p.id = qr_codes.loyalty_program_id
        and p.business_id = qr_codes.business_id
    )
  )
);

create or replace function public.record_qr_scan(requested_code text, requested_device text default 'other')
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  qr public.qr_codes;
  business_path text;
  offer_slug text;
  loyalty_id uuid;
begin
  -- An archived code is no longer listed, but it is still printed on
  -- whatever it was printed on, so it still resolves and still counts.
  select q.*
  into qr
  from public.qr_codes q
  join public.businesses b
    on b.id = q.business_id
  where q.code = lower(requested_code)
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

  business_path := '/businesses/' || qr.business_id;

  if qr.archived_at is not null then
    return business_path || '?ended=poster';
  end if;

  if qr.offer_id is not null then
    select o.slug
    into offer_slug
    from public.offers o
    where o.id = qr.offer_id
      and o.approval_status = 'approved'
      and o.expires_at >= current_date
      and o.plan_paused_at is null;

    if offer_slug is not null then
      return '/offers/' || offer_slug;
    end if;

    -- Ended, paused, pulled from review or deleted outright: the offer_id
    -- is set to null by the delete, so every one of them arrives here.
    return business_path || '?ended=offer';
  end if;

  if qr.loyalty_program_id is not null then
    select p.id
    into loyalty_id
    from public.loyalty_programs p
    where p.id = qr.loyalty_program_id
      and p.is_active
      and p.closed_at is null;

    if loyalty_id is not null then
      return business_path || '#loyalty-' || loyalty_id;
    end if;

    return business_path || '?ended=card';
  end if;

  return business_path;
end;
$$;

comment on function public.record_qr_scan(text, text) is
  'Records a scan and returns where to send the visitor. Falls back to the business page with ?ended= when the code''s target is gone, so a printed code never leads nowhere.';

-- Deleting an offer sets qr_codes.offer_id to null, which leaves a code
-- that was printed for an offer looking exactly like one printed for the
-- business page. The title is kept so the business can still be told what
-- the poster in their window used to say.
alter table public.qr_codes
  add column if not exists former_target text;

create or replace function public.remember_qr_target()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.qr_codes
  set former_target = old.title
  where offer_id = old.id;

  return old;
end;
$$;

-- Before, so the rows are still pointing at the offer when they are read.
drop trigger if exists offers_remember_qr_target on public.offers;

create trigger offers_remember_qr_target
before delete on public.offers
for each row
execute function public.remember_qr_target();
