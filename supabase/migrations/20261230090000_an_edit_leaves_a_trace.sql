-- An edit to an approved business page leaves a trace.
--
-- Every business is read by a person before it appears in the
-- directory. After that it could be rewritten at will: the name, the
-- description and both images saved straight onto the row, with
-- nothing recorded anywhere. audit_logs knows a business was created,
-- approved, rejected or suspended, and nothing about the week it spent
-- quietly becoming a different business.
--
-- The decision (README, stage 3) was to record rather than gate. A
-- business fixing its own typo should not wait for us, and blocking an
-- edit is friction at exactly the moment somebody is working on their
-- page. So the edit goes live immediately, as it does today, and it
-- also writes down what changed — so it can be read afterwards instead
-- of never.
--
-- Four fields, because they are what the reviewer actually judged:
-- what the business is called, what it says it does, and the two
-- pictures. Hours, address, links and category save silently, as now.
--
-- If this ever needs to become a gate, the shape is already right:
-- hold the row instead of applying it, the way an offer edit waits
-- (docs/OFFER-EDIT-REVIEW.md).

create table if not exists public.business_edits (
  id uuid primary key default gen_random_uuid(),

  business_id uuid not null
    references public.businesses (id)
    on delete cascade,

  -- One row per field changed in one save, which is the diff.
  field text not null check (field in ('name', 'description', 'logo_url', 'cover_image_url')),
  was text,
  became text,

  edited_by uuid references auth.users (id) on delete set null,
  edited_at timestamptz not null default timezone('utc', now()),

  -- When somebody on our side read it. Null is the queue.
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users (id) on delete set null
);

comment on table public.business_edits is
  'What changed on an approved business page, after it was approved. Written by a trigger; the edit itself is already live.';

create index if not exists business_edits_unread_idx
  on public.business_edits (edited_at desc)
  where reviewed_at is null;

create index if not exists business_edits_business_idx
  on public.business_edits (business_id, edited_at desc);

alter table public.business_edits enable row level security;

-- Us, and the business's own admins: it is their page, and being able
-- to see what changed is worth as much to them as to us. Nobody writes
-- a row by hand — the trigger does it.
drop policy if exists business_edits_select on public.business_edits;

create policy business_edits_select
on public.business_edits for select
to authenticated
using (
  public.is_platform_admin()
  or public.is_business_member(business_id, 'admin')
);

create or replace function public.record_business_edit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Before approval the whole page is still being read by a person,
  -- so nothing here is news.
  if new.approval_status <> 'approved' then
    return new;
  end if;

  if new.name is distinct from old.name then
    insert into public.business_edits (business_id, field, was, became, edited_by)
    values (new.id, 'name', old.name, new.name, auth.uid());
  end if;

  if new.description is distinct from old.description then
    insert into public.business_edits (business_id, field, was, became, edited_by)
    values (new.id, 'description', old.description, new.description, auth.uid());
  end if;

  if new.logo_url is distinct from old.logo_url then
    insert into public.business_edits (business_id, field, was, became, edited_by)
    values (new.id, 'logo_url', old.logo_url, new.logo_url, auth.uid());
  end if;

  if new.cover_image_url is distinct from old.cover_image_url then
    insert into public.business_edits (business_id, field, was, became, edited_by)
    values (new.id, 'cover_image_url', old.cover_image_url, new.cover_image_url, auth.uid());
  end if;

  return new;
end;
$$;

drop trigger if exists businesses_record_edits on public.businesses;

create trigger businesses_record_edits
after update of name, description, logo_url, cover_image_url on public.businesses
for each row
execute function public.record_business_edit();

-- Read, and dealt with. Marking a business seen clears everything
-- waiting on it, because that is how it is read: a page at a time.
create or replace function public.mark_business_edits_seen(requested_business_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  seen integer;
begin
  if not public.is_platform_admin() then
    raise exception using errcode = '42501', message = 'Admin access is required';
  end if;

  update public.business_edits
  set reviewed_at = timezone('utc', now()),
      reviewed_by = auth.uid()
  where business_id = requested_business_id
    and reviewed_at is null;

  get diagnostics seen = row_count;

  return seen;
end;
$$;

revoke all on function public.mark_business_edits_seen(uuid) from public, anon;
grant execute on function public.mark_business_edits_seen(uuid) to authenticated;
