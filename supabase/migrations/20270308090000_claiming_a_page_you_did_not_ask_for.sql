-- "Is this your business?"
--
-- A published page needs a way in for the person it belongs to, and the
-- way in we have is a secret: the token we email or post. That works
-- when we start the conversation. Pages first means they might start
-- it — they searched their own name, found a page we wrote, and want
-- it.
--
-- A button that handed the page to whoever clicked it would hand a
-- business to anybody who typed its name. So the button does not claim
-- anything. It files a request, and an admin releases the page by
-- sending the claim link to the address on the request. The link is
-- still the proof; this is how someone asks for one.
--
-- The request itself is written by a definer function rather than an
-- insert policy, the way notifications are: anon can ask, and cannot
-- read back, update, or discover a single thing about who else has.

create table if not exists public.page_claim_requests (
  id uuid primary key default gen_random_uuid(),

  business_id uuid not null
    references public.businesses (id)
    on delete cascade,

  contact_name text not null check (char_length(btrim(contact_name)) between 2 and 80),
  contact_email text not null check (
    char_length(contact_email) <= 160
    and contact_email ~ '^[^@\s]+@[^@\s.]+\.[^@\s]+$'
  ),
  -- "I own it", "I'm the manager". Their words, so a decision can be
  -- made without a phone call.
  connection text not null check (char_length(btrim(connection)) between 2 and 200),

  status text not null default 'open'
    check (status in ('open', 'released', 'declined')),

  created_at timestamptz not null default timezone('utc', now()),
  handled_at timestamptz,
  handled_by uuid references auth.users (id) on delete set null,
  -- Why it was declined, for us. Never sent anywhere.
  note text check (note is null or char_length(note) <= 500)
);

create index if not exists page_claim_requests_open_idx
  on public.page_claim_requests (created_at desc)
  where status = 'open';

create index if not exists page_claim_requests_business_idx
  on public.page_claim_requests (business_id, created_at desc);

-- One open request per person per business. They can ask again after a
-- decision, which is the difference between a second thought and a
-- flood.
create unique index if not exists page_claim_requests_one_open_per_email_idx
  on public.page_claim_requests (business_id, lower(contact_email))
  where status = 'open';

alter table public.page_claim_requests enable row level security;

-- Admins, and nobody else. There is no insert policy on purpose: the
-- only way a row appears is request_page_claim() below.
drop policy if exists page_claim_requests_admin_all on public.page_claim_requests;

create policy page_claim_requests_admin_all on public.page_claim_requests
  for all to authenticated
  using (public.is_platform_admin())
  with check (public.is_platform_admin());

-- ---------------------------------------------------------------------------
-- Asking
-- ---------------------------------------------------------------------------
--
-- Signed in or not: an owner who has found their own page has no
-- account yet, and making them sign up before they can tell us it is
-- theirs is a door with a lock on the outside.
--
-- Deliberately unhelpful about failure. "This page has already been
-- claimed" is fine to say — it is on the page anyway — but a caller
-- learns nothing about who asked, or how many have.

create or replace function public.request_page_claim(
  requested_business_id uuid,
  contact_name text,
  contact_email text,
  connection text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  listed_business public.businesses;
  open_requests integer;
begin
  select * into listed_business
  from public.businesses
  where id = requested_business_id
    and listed_at is not null
    and approval_status = 'pending'
    and closed_at is null
    and demo_at is null;

  -- Exactly what an unlisted or already-approved page gives: nothing.
  if listed_business.id is null then
    raise exception using errcode = 'P0002',
      message = 'This page is not waiting to be claimed.';
  end if;

  if exists (
    select 1 from public.business_previews p
    where p.business_id = listed_business.id and p.claimed_at is not null
  ) then
    raise exception using errcode = '22023',
      message = 'This business has already been claimed.';
  end if;

  select count(*) into open_requests
  from public.page_claim_requests
  where business_id = listed_business.id and status = 'open';

  -- Three people can reasonably believe a page is theirs. A fourth is
  -- somebody enjoying themselves.
  if open_requests >= 3 then
    raise exception using errcode = '22023',
      message = 'We are already looking at a request for this page. Email hello@promotello.com and we will sort it out.';
  end if;

  insert into public.page_claim_requests (business_id, contact_name, contact_email, connection)
  values (
    listed_business.id,
    btrim(contact_name),
    lower(btrim(contact_email)),
    btrim(connection)
  )
  on conflict do nothing;
end;
$$;

comment on function public.request_page_claim(uuid, text, text, text) is
  'Asks for the claim link to an unclaimed page. Files a request for an admin; claims nothing.';

revoke all on function public.request_page_claim(uuid, text, text, text) from public;
grant execute on function public.request_page_claim(uuid, text, text, text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Releasing
-- ---------------------------------------------------------------------------
--
-- Hands back everything the email needs and mints a fresh token, so the
-- 90-day clock on the preview starts from the day we send it rather
-- than the day we built the page. A page-first lead can have been up for
-- months before anybody asks.
--
-- The view counts are left alone: they are how we know whether the page
-- is being looked at, and this is not a new page.

create or replace function public.release_page_claim(requested_request_id uuid)
returns table (
  business_id uuid,
  business_name text,
  business_slug text,
  token uuid,
  contact_name text,
  contact_email text
)
language plpgsql
security definer
set search_path = public
as $$
#variable_conflict use_column
declare
  claim public.page_claim_requests;
begin
  if not public.is_platform_admin() then
    raise exception using errcode = '42501', message = 'Admin access is required';
  end if;

  select * into claim
  from public.page_claim_requests
  where id = requested_request_id
  for update;

  if claim.id is null then
    raise exception using errcode = 'P0002', message = 'No such request';
  end if;

  if claim.status <> 'open' then
    raise exception using errcode = '22023', message = 'This request has already been dealt with.';
  end if;

  update public.page_claim_requests
  set status = 'released',
      handled_at = timezone('utc', now()),
      handled_by = auth.uid()
  where id = claim.id;

  update public.business_previews
  set token = gen_random_uuid(),
      created_at = timezone('utc', now())
  where business_id = claim.business_id;

  return query
  select
    b.id,
    b.name,
    b.slug,
    p.token,
    claim.contact_name,
    claim.contact_email
  from public.businesses b
  join public.business_previews p on p.business_id = b.id
  where b.id = claim.business_id;
end;
$$;

comment on function public.release_page_claim(uuid) is
  'Marks a claim request released and mints a fresh preview token, so the link we send starts its own 90 days.';

revoke all on function public.release_page_claim(uuid) from public, anon;
grant execute on function public.release_page_claim(uuid) to authenticated;

create or replace function public.decline_page_claim(requested_request_id uuid, reason text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_platform_admin() then
    raise exception using errcode = '42501', message = 'Admin access is required';
  end if;

  update public.page_claim_requests
  set status = 'declined',
      handled_at = timezone('utc', now()),
      handled_by = auth.uid(),
      note = nullif(btrim(reason), '')
  where id = requested_request_id
    and status = 'open';

  if not found then
    raise exception using errcode = 'P0002', message = 'No open request with that id';
  end if;
end;
$$;

comment on function public.decline_page_claim(uuid, text) is
  'Closes a claim request we are not acting on. Tells the person nothing: an email we write does that.';

revoke all on function public.decline_page_claim(uuid, text) from public, anon;
grant execute on function public.decline_page_claim(uuid, text) to authenticated;
