-- Reviewing the change, not the offer.
--
-- An approved offer that is edited used to go back to 'pending', and
-- pending is invisible: the offer left the listings and the QR poster in
-- the window started landing people on the business page. The words a
-- person has to read are the title, the description, the headline and the
-- terms, so those now wait in a queue of their own while the published
-- offer carries on serving customers.
--
-- require_review_of_edited_offer stays as the backstop. The dashboard
-- writes a waiting edit instead of touching those four fields, so the
-- trigger should never fire — but if anything writes to an offer
-- directly, the old rule still catches it.

create table if not exists public.offer_edits (
  id uuid primary key default gen_random_uuid(),
  offer_id uuid not null references public.offers (id) on delete cascade,
  -- Carried so a policy can ask who runs this without joining offers.
  business_id uuid not null references public.businesses (id) on delete cascade,
  title text not null check (char_length(trim(both from title)) between 2 and 120),
  description text not null check (char_length(trim(both from description)) between 2 and 2000),
  discount text not null check (char_length(trim(both from discount)) between 1 and 60),
  terms text not null check (char_length(trim(both from terms)) between 2 and 2000),
  submitted_by uuid references auth.users (id) on delete set null,
  submitted_at timestamptz not null default timezone('utc', now()),
  decided_at timestamptz,
  decided_by uuid references auth.users (id) on delete set null,
  decision text check (decision in ('approved', 'rejected'))
);

-- One waiting edit per offer: sending another replaces it.
create unique index if not exists offer_edits_one_waiting
  on public.offer_edits (offer_id)
  where decided_at is null;

create index if not exists offer_edits_waiting_first
  on public.offer_edits (submitted_at)
  where decided_at is null;

alter table public.offer_edits enable row level security;

-- Readable by the business it belongs to, and by us. Never written
-- directly: both paths are the functions below.
drop policy if exists offer_edits_members_select on public.offer_edits;
create policy offer_edits_members_select on public.offer_edits
  for select
  using (public.is_business_member(business_id, 'member'));

drop policy if exists offer_edits_admin_select on public.offer_edits;
create policy offer_edits_admin_select on public.offer_edits
  for select
  using (public.is_platform_admin());

-- The business sends a change. The offer itself is untouched, so it stays
-- exactly as customers already know it.
create or replace function public.submit_offer_edit(
  requested_offer_id uuid,
  new_title text,
  new_description text,
  new_discount text,
  new_terms text
)
returns public.offer_edits
language plpgsql
security definer
set search_path = public
as $$
declare
  target public.offers;
  waiting public.offer_edits;
begin
  select * into target from public.offers where id = requested_offer_id;

  if target.id is null then
    raise exception using errcode = 'P0002', message = 'Offer not found';
  end if;

  if not public.is_business_member(target.business_id, 'admin') then
    raise exception using
      errcode = '42501',
      message = 'Only the people who run this business can change its offers';
  end if;

  -- An offer that is not live has nothing to protect: it is edited in
  -- place and reviewed as a whole.
  if target.approval_status is distinct from 'approved' then
    raise exception using
      errcode = 'P0003',
      message = 'This offer is not live, so it is edited directly rather than reviewed as a change';
  end if;

  delete from public.offer_edits
  where offer_id = requested_offer_id and decided_at is null;

  insert into public.offer_edits (
    offer_id, business_id, title, description, discount, terms, submitted_by
  )
  values (
    requested_offer_id,
    target.business_id,
    new_title,
    new_description,
    new_discount,
    new_terms,
    auth.uid()
  )
  returning * into waiting;

  return waiting;
end;
$$;

-- We read the difference and answer it. Approving copies the words over;
-- the offer's approval status never moves, so it never leaves the site.
create or replace function public.apply_offer_edit(edit_id uuid, decision text)
returns public.offer_edits
language plpgsql
security definer
set search_path = public
as $$
declare
  waiting public.offer_edits;
begin
  if not public.is_platform_admin() then
    raise exception using
      errcode = '42501',
      message = 'Platform administrator access is required';
  end if;

  if decision not in ('approved', 'rejected') then
    raise exception using errcode = '22023', message = 'Invalid decision';
  end if;

  select * into waiting from public.offer_edits where id = edit_id;

  if waiting.id is null then
    raise exception using errcode = 'P0002', message = 'Edit not found';
  end if;

  if waiting.decided_at is not null then
    raise exception using errcode = 'P0003', message = 'That edit has already been answered';
  end if;

  if decision = 'approved' then
    -- require_review_of_edited_offer exempts platform admins, so this
    -- does not send the offer back to pending.
    update public.offers
    set
      title = waiting.title,
      description = waiting.description,
      discount = waiting.discount,
      terms = waiting.terms
    where id = waiting.offer_id;
  end if;

  update public.offer_edits
  set decided_at = timezone('utc', now()),
      decided_by = auth.uid(),
      decision = apply_offer_edit.decision
  where id = edit_id
  returning * into waiting;

  return waiting;
end;
$$;

revoke all on function public.submit_offer_edit(uuid, text, text, text, text) from public, anon;
revoke all on function public.apply_offer_edit(uuid, text) from public, anon;
grant execute on function public.submit_offer_edit(uuid, text, text, text, text) to authenticated;
grant execute on function public.apply_offer_edit(uuid, text) to authenticated;
