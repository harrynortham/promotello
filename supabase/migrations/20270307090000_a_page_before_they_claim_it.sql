-- Pages first.
--
-- Selling has been an email about a page nobody else can see. A preview
-- is private by design: the business stays `pending`, so RLS hides it
-- from every listing, and the only way in is the token we post them. It
-- works, and it leaves the directory empty until businesses start
-- saying yes — which is backwards, because the directory is the thing
-- that makes saying yes worth it.
--
-- So a lead's page goes up before we contact them, and the sale becomes
-- "claim your free page". A whole street can be live in a day.
--
-- `listed_at` is the whole mechanism, and it does not touch approval.
-- A listed business is still `pending`, which matters more than it
-- looks:
--
--   offers_public_select_approved  requires an approved business
--   loyalty_programs_public_select requires an approved business
--
-- Neither policy is touched here, so an unclaimed page cannot serve an
-- offer or a loyalty card to a visitor even if a page asked it to. "No
-- offers or cards before they claim it" is a property of the database,
-- not a rule someone has to remember in a component.
--
-- What a visitor gets is what we knew before we ever spoke to them:
-- the name, the category, where it is and a map. What the owner gets is
-- a page with their name on it and a button to take it over.

alter table public.businesses
  add column if not exists listed_at timestamptz;

comment on column public.businesses.listed_at is
  'A page we built and published before the business claimed it. Public, still pending, and never able to show an offer or a loyalty card.';

create index if not exists businesses_listed_idx
  on public.businesses (listed_at)
  where listed_at is not null;

-- ---------------------------------------------------------------------------
-- What the public can read
-- ---------------------------------------------------------------------------
--
-- Three policies, the same clause in each. Approval is still the only
-- way an offer, a card or a review decision happens; this adds one more
-- way to be *readable*, and it is deliberately narrow:
--
--   pending      yes, and only pending. A rejected or suspended business
--                is never public, so a review decision still takes a
--                page down even if listed_at was set before it.
--   closed_at    null. Closing is the owner's own decision and outranks
--                anything we published for them.
--   demo_at      null, unchanged: ours stays ours.
--
-- Clearing listed_at is how a page comes down, which is what we do when
-- a business asks.

drop policy if exists businesses_select_approved_public on public.businesses;

create policy businesses_select_approved_public
on public.businesses for select
to anon, authenticated
using (
  demo_at is null
  and (
    approval_status = 'approved'
    or (
      approval_status = 'pending'
      and listed_at is not null
      and closed_at is null
    )
  )
);

-- The address and the map. Without this the page is a name and a
-- category, which is not a listing anybody would claim.
drop policy if exists business_locations_public_select on public.business_locations;

create policy business_locations_public_select
on public.business_locations for select
to anon, authenticated
using (
  exists (
    select 1
    from public.businesses b
    where b.id = business_locations.business_id
      and b.demo_at is null
      and (
        b.approval_status = 'approved'
        or (b.approval_status = 'pending' and b.listed_at is not null and b.closed_at is null)
      )
  )
);

-- Hours, for the leads we have them for. A page with none just doesn't
-- show the panel.
drop policy if exists business_hours_public_select on public.business_hours;

create policy business_hours_public_select
on public.business_hours for select
to anon, authenticated
using (
  exists (
    select 1
    from public.businesses b
    where b.id = business_hours.business_id
      and b.demo_at is null
      and (
        b.approval_status = 'approved'
        or (b.approval_status = 'pending' and b.listed_at is not null and b.closed_at is null)
      )
  )
);

-- ---------------------------------------------------------------------------
-- Putting a page up, and taking it down
-- ---------------------------------------------------------------------------
--
-- The bar is the same one claim_business_preview() uses to decide
-- whether a claimed page is fit to be public: words about the business,
-- and somewhere it is. A page that fails it would be a name on an empty
-- screen, and fifty of those is how a new site teaches Google to
-- ignore it. The error names what is missing, because the admin filling
-- the lead in is the person who can fix it.

create or replace function public.list_lead_page(requested_business_id uuid)
returns timestamptz
language plpgsql
security definer
set search_path = public
as $$
declare
  business public.businesses;
  has_location boolean;
begin
  if not public.is_platform_admin() then
    raise exception using errcode = '42501', message = 'Admin access is required';
  end if;

  select * into business from public.businesses where id = requested_business_id for update;

  if business.id is null then
    raise exception using errcode = 'P0002', message = 'No such business';
  end if;

  if business.approval_status <> 'pending' then
    raise exception using errcode = '22023',
      message = 'Only a business still waiting to be claimed can be published this way.';
  end if;

  if business.closed_at is not null then
    raise exception using errcode = '22023', message = 'This business is closed.';
  end if;

  if coalesce(btrim(business.description), '') = '' then
    raise exception using errcode = '22023',
      message = 'Write a description first: a page with nothing on it is not worth publishing.';
  end if;

  select exists (
    select 1 from public.business_locations l where l.business_id = business.id
  ) into has_location;

  if not has_location then
    raise exception using errcode = '22023',
      message = 'Add an address first: the map is most of what an unclaimed page is for.';
  end if;

  update public.businesses
  set listed_at = coalesce(listed_at, timezone('utc', now()))
  where id = business.id
  returning listed_at into business.listed_at;

  return business.listed_at;
end;
$$;

comment on function public.list_lead_page(uuid) is
  'Publishes a lead''s page before it is claimed: public and still pending, so no offer or card can show on it.';

revoke all on function public.list_lead_page(uuid) from public, anon;
grant execute on function public.list_lead_page(uuid) to authenticated;

-- Down again. For a business that asks, and for a page we got wrong.
-- Only ever an unclaimed one: once it is approved, listed_at is history
-- and taking a page down is a suspension, which has its own route and
-- tells the owner why.
create or replace function public.unlist_lead_page(requested_business_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  current_status text;
begin
  if not public.is_platform_admin() then
    raise exception using errcode = '42501', message = 'Admin access is required';
  end if;

  select approval_status into current_status
  from public.businesses
  where id = requested_business_id;

  if current_status is null then
    raise exception using errcode = 'P0002', message = 'No such business';
  end if;

  if current_status <> 'pending' then
    raise exception using errcode = '22023',
      message = 'This page has been claimed and approved. Suspend it instead, so its owner is told why.';
  end if;

  update public.businesses
  set listed_at = null
  where id = requested_business_id;
end;
$$;

comment on function public.unlist_lead_page(uuid) is
  'Takes an unclaimed page back down. For a business that asks, and for one we got wrong.';

revoke all on function public.unlist_lead_page(uuid) from public, anon;
grant execute on function public.unlist_lead_page(uuid) to authenticated;
