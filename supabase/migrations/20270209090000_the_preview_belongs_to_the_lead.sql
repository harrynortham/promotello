-- A preview is something a lead has
--
-- Previews and leads were built at different times and grew into the
-- same record twice. A lead holds the name, who to write to, the email,
-- the Instagram handle, the category, the address and the postcode; a
-- preview held its own contact_name, contact_email, instagram_handle,
-- status, notes and contacted_at, every one of which the lead already
-- answers.
--
-- The cost was never the columns. It was that building a preview left
-- the lead, opened a page of its own, and asked again for what was on
-- the page you pressed the button from — and that the preview's status
-- and notes started disagreeing with the lead's stage and notes the
-- moment either was touched.
--
-- So the duplicates go, and what is left is what only a preview knows:
-- the sample offer, the card, and who has looked at it.
--
--   stage      lives on the lead
--   notes      lives on the lead
--   contacted  lives in outreach_messages, which records each send
--
-- One preview exists in production — claimed, and belonging to a live
-- business — so nothing in flight is disturbed.

-- A description is needed for a claimed page to publish itself
-- (20270124090000 checks it), and it is a fact about the business
-- rather than about the preview, so it belongs with everything else we
-- write down about them.
alter table public.leads
  add column if not exists description text;

comment on column public.leads.description is
  'A line about the business. Fills the preview, and a claimed page cannot publish without one.';

alter table public.business_previews
  drop column if exists contact_name,
  drop column if exists contact_email,
  drop column if exists instagram_handle,
  drop column if exists status,
  drop column if exists notes,
  drop column if exists contacted_at;

comment on table public.business_previews is
  'The page built for a business, and who has looked at it. Everything about reaching them is on the lead.';

-- The greeting on the public preview page
--
-- "Hi Sam, here's Little Loaf on Promotello." is the first line a
-- business reads, and open_business_preview served it from
-- business_previews.contact_name. Postgres does not check a plpgsql body
-- when a column it names is dropped, so without this the function keeps
-- its signature, passes every build, and fails the moment somebody opens
-- the link they were sent — which is the one moment that matters.
--
-- It comes from the lead now, the same place the email takes it from, so
-- the page and the email cannot greet them differently.
create or replace function public.open_business_preview(requested_token uuid)
returns table (
  business_id uuid,
  business_name text,
  category text,
  description text,
  logo_url text,
  cover_image_url text,
  area text,
  city text,
  contact_name text,
  sample_offer text,
  sample_reward text,
  sample_stamps integer,
  claimed boolean
)
language plpgsql
security definer
set search_path = public
as $$
#variable_conflict use_column
begin
  if not public.is_platform_admin() then
    update public.business_previews p
    set
      view_count = p.view_count + 1,
      first_viewed_at = coalesce(p.first_viewed_at, timezone('utc', now())),
      last_viewed_at = timezone('utc', now())
    where p.token = requested_token and p.claimed_at is null;
  end if;

  return query
  select
    b.id,
    b.name,
    b.category,
    b.description,
    b.logo_url,
    b.cover_image_url,
    l.region,
    l.city,
    lead.contact_name,
    p.sample_offer,
    p.sample_reward,
    p.sample_stamps,
    p.claimed_at is not null
  from public.business_previews p
  join public.businesses b on b.id = p.business_id
  left join lateral (
    select region, city from public.business_locations
    where business_locations.business_id = b.id
    order by created_at
    limit 1
  ) l on true
  -- A preview built before leads existed has none, and the page says
  -- "Here's …" instead of "Hi Sam, here's …", which it already did for
  -- anyone whose name we did not have.
  left join lateral (
    select contact_name from public.leads
    where leads.preview_business_id = b.id
    order by created_at
    limit 1
  ) lead on true
  where p.token = requested_token
    and p.created_at > timezone('utc', now()) - interval '90 days';
end;
$$;

revoke all on function public.open_business_preview(uuid) from public;
grant execute on function public.open_business_preview(uuid) to anon, authenticated;
