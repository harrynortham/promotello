-- Candidates: businesses Google says exist, before anybody decides they
-- are leads.
--
-- Building the list by hand was taking ten minutes a lead, and nothing
-- can be sold until there are leads to sell to. Google Maps knows every
-- business on Gloucester Road.
--
-- The shape of this table is decided by what Google permits, which is
-- stricter than a time limit. From the Places policies: place_id is
-- "exempt from the caching restrictions. You can therefore store place
-- ID values indefinitely", coordinates may be kept thirty days, and
-- everything else is restricted — the policy names "copy and save
-- business names, addresses" as a prohibited use. Its own advice is the
-- design: "Store exempt identifiers such as the place ID to fetch fresh
-- details when a user interacts with a place."
--
-- So Google is the index, not the source. It says who exists; the
-- business's own website says what we keep (lib/lead-enrichment.ts
-- already does that, and already explains why the address has to come
-- from there).
create table if not exists public.lead_candidates (
    id uuid primary key default gen_random_uuid(),
    -- The one thing here we may keep for good, and the reason the table
    -- can tell a second sweep from a new business.
    place_id text not null unique,

    area_id uuid references public.areas (id) on delete set null,
    category_id uuid references public.categories (id) on delete set null,

    -- Theirs, published by them, and what the crawler is pointed at.
    website text,

    -- The only Google-derived strings in the database. They exist so a
    -- human can read the list before importing, and the daily cron
    -- deletes them after thirty days. The prefix is load-bearing: it is
    -- how anybody reading this later knows these are borrowed.
    cached_name text,
    cached_address text,
    cached_at timestamptz not null default timezone('utc', now()),

    -- new: waiting to be looked at. imported: it became a lead.
    -- skipped: looked at and not wanted, kept so a later sweep does not
    -- offer it again.
    status text not null default 'new' check (status in ('new', 'imported', 'skipped')),
    lead_id uuid references public.leads (id) on delete set null,

    created_at timestamptz not null default timezone('utc', now()),
    created_by uuid references auth.users (id) on delete set null
);

create index if not exists lead_candidates_area_status_idx
    on public.lead_candidates (area_id, status);

create index if not exists lead_candidates_cached_at_idx
    on public.lead_candidates (cached_at)
    where cached_name is not null;

alter table public.lead_candidates enable row level security;

grant select, insert, update, delete on public.lead_candidates to authenticated;

-- Platform admins and nobody else. This is a sales workbench: there is
-- no business-facing read of it and no public one.
drop policy if exists lead_candidates_platform_admin on public.lead_candidates;

create policy lead_candidates_platform_admin
on public.lead_candidates
for all
to authenticated
using (public.is_platform_admin())
with check (public.is_platform_admin());

-- ---------------------------------------------------------------------------
-- Thirty days, then the borrowed strings go.
-- ---------------------------------------------------------------------------

-- The row stays: place_id may be kept indefinitely and is what stops a
-- later sweep offering the same business again. Only the name and the
-- address go, which are the parts that were never ours.
--
-- Only candidates. A lead never holds a Google address at all:
-- 20270204090000 deleted the ones that existed and took 'places' out
-- of leads_address_source_check, so the database itself refuses to put
-- one back. The importer leaves Google's address here, where it has an
-- expiry, and a lead's address comes from the crawler or from
-- somebody typing it.
--
-- Called by the daily cron beside delete_expired_business_previews.
create or replace function public.clear_expired_candidate_cache()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
    cleared integer;
begin
    update public.lead_candidates
    set cached_name = null,
        cached_address = null
    where cached_name is not null
      and cached_at < timezone('utc', now()) - interval '30 days';

    get diagnostics cleared = row_count;

    return cleared;
end;
$$;

revoke all on function public.clear_expired_candidate_cache() from public, anon, authenticated;

comment on function public.clear_expired_candidate_cache() is
    'Drops Google-derived name and address from candidates after 30 days. The place_id stays: it may be kept indefinitely and is what prevents a duplicate on the next sweep.';
