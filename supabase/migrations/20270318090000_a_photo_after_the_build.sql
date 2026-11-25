-- The photo on a lead's page, after it was built.
--
-- A preview built one at a time can have a photo put on it while it is
-- being made. One published in bulk down a street cannot, and that is
-- most of them, so they carry the cover we draw from their colours.
-- That is fine as a page header and wrong as an offer card: the
-- directory draws that card with the same image, and a flat panel with
-- the business name on it does not look like anything to walk in for.
--
-- A function rather than an update from the client, for one reason
-- RLS cannot give: it stops once they have claimed the page.
--
-- Writing businesses.cover_image_url is gated on is_business_member(),
-- which does let this through today -- create_business_with_owner()
-- makes whoever built the preview its owner, and that is the same
-- admin sitting on the lead page. But owning it is not what entitles
-- us to change it: the page being unclaimed is. Those two come apart
-- the moment a preview is built by one admin and edited by another,
-- and they come apart for good when somebody claims a page we still
-- hold a membership row for.
--
-- So the rule is written down where it cannot drift: admin only, and
-- only while the page is still ours to change -- the same two
-- conditions the examples beside it already answer to.

create or replace function public.set_preview_cover(
  requested_business_id uuid,
  image_url text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_platform_admin() then
    return false;
  end if;

  -- Claimed means the page is theirs, and what is on it with it.
  if not exists (
    select 1
    from public.business_previews p
    where p.business_id = requested_business_id
      and p.claimed_at is null
  ) then
    return false;
  end if;

  update public.businesses
  set cover_image_url = image_url
  where id = requested_business_id;

  return found;
end;
$$;

comment on function public.set_preview_cover(uuid, text) is
  'Sets the cover photo on an unclaimed preview business. Platform admins only.';

revoke all on function public.set_preview_cover(uuid, text) from public, anon;
grant execute on function public.set_preview_cover(uuid, text) to authenticated;
