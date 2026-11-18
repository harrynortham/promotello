-- A lead per business, and the stages it moves through
--
-- business_previews has five rows and none of them marked contacted. The
-- funnel past the claim works; nothing has gone into the top of it,
-- because finding businesses and writing to them is still an afternoon
-- of Street View and a spreadsheet (docs/OUTREACH.md).
--
-- A preview is the page we built for a business worth writing to, and
-- stays exactly that. A lead is the row before it: somebody we found on
-- a street, who may or may not turn out to be worth a preview, and who
-- we may or may not be allowed to email at all.
--
-- The one rule in here that is not a convenience:
--
--   can_email defaults to false.
--
-- Under PECR a sole trader or ordinary partnership has the same
-- protection as a private individual — unsolicited marketing email needs
-- their consent — while a limited company or LLP does not. Plenty of
-- independent cafés are sole traders. Today that is a Companies House
-- search and a column in a spreadsheet; at a hundred leads it has to be
-- a gate rather than a discipline, so it starts false and only a
-- Companies House match turns it on.
--
-- What is deliberately NOT here is Google's. Place IDs may be kept
-- indefinitely; names, addresses, ratings and photos have no caching
-- exception. So place_id is stored and the rest of the row is ours:
-- typed by whoever imported it, or taken from Companies House (Open
-- Government Licence) or the business's own website.

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),

  -- Ours, not Google's. Shown at import from Places and kept only
  -- because somebody chose to keep it.
  name text not null,
  address text,
  postcode text,

  -- Where it is, by id, because an area name belongs to a city and two
  -- cities can share one (docs/MULTI-CITY.md).
  city_id uuid references public.cities (id) on delete set null,
  area_id uuid references public.areas (id) on delete set null,

  -- The category we would file them under, when we know.
  category_id uuid references public.categories (id) on delete set null,

  -- The one thing from Google that may be kept, and what makes a second
  -- import of the same street recognise who is already on the list.
  place_id text unique,

  website text,
  instagram_handle text,
  phone text,

  -- Found on their own site, and where it was found: "this was on your
  -- contact page" is what makes writing to them defensible.
  email text,
  email_source text,
  email_found_at timestamptz,

  -- The legal gate. company_number is the evidence; can_email is the
  -- decision, and nothing may queue an email without it.
  company_number text,
  company_name text,
  can_email boolean not null default false,
  companies_house_checked_at timestamptz,

  stage text not null default 'new',

  -- The preview built for this lead, once it graduates to one.
  preview_business_id uuid references public.businesses (id) on delete set null,

  notes text,

  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),

  constraint leads_stage_check check (stage in (
    'new', 'enriched', 'emailable', 'preview',
    'emailed', 'followed_up', 'letter',
    'claimed', 'not_interested', 'dead'
  ))
);

-- Append-only: what happened and when. The stage is where a lead is; the
-- events are how it got there, so dragging a stage backwards does not
-- lose the day we wrote to them.
create table if not exists public.lead_events (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads (id) on delete cascade,
  kind text not null,
  detail text,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),

  constraint lead_events_kind_check check (kind in (
    'imported', 'email_found', 'companies_house_checked',
    'preview_built', 'emailed', 'followed_up', 'letter_sent',
    'replied', 'claimed', 'closed', 'note'
  ))
);

-- The board is worked in stage order, newest first within a stage.
create index if not exists leads_stage_idx on public.leads (stage, created_at desc);
create index if not exists leads_area_idx on public.leads (area_id);
create index if not exists leads_can_email_idx on public.leads (can_email);
create index if not exists lead_events_lead_idx on public.lead_events (lead_id, created_at desc);

alter table public.leads enable row level security;
alter table public.lead_events enable row level security;

-- Ours, not theirs. A lead is a business that has not asked to be on
-- Promotello, so nothing on the business side can see this at all.
drop policy if exists leads_admin_all on public.leads;
create policy leads_admin_all on public.leads
  for all to authenticated
  using (public.is_platform_admin())
  with check (public.is_platform_admin());

drop policy if exists lead_events_admin_all on public.lead_events;
create policy lead_events_admin_all on public.lead_events
  for all to authenticated
  using (public.is_platform_admin())
  with check (public.is_platform_admin());

-- updated_at, the same way every other table here does it.
create or replace function public.touch_lead()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists leads_touch on public.leads;
create trigger leads_touch
before update on public.leads
for each row
execute function public.touch_lead();

-- The gate, in the database rather than in a page. can_email may only be
-- true where there is a company number to point at, so no form, script or
-- future job can set it on its own.
create or replace function public.enforce_lead_email_gate()
returns trigger
language plpgsql
as $$
begin
  if new.can_email and coalesce(btrim(new.company_number), '') = '' then
    raise exception using
      errcode = 'check_violation',
      message = 'A lead can only be emailable with a company number: under PECR a sole trader needs consent.';
  end if;

  return new;
end;
$$;

drop trigger if exists leads_email_gate on public.leads;
create trigger leads_email_gate
before insert or update on public.leads
for each row
execute function public.enforce_lead_email_gate();
