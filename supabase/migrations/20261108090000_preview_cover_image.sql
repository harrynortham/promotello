-- A preview is the first thing a business sees of itself on Promotello, so it
-- should look like them rather than like a template. It already carried the
-- logo; it now carries the cover photo too.
--
-- Adding a column to the returned table means dropping the function first:
-- Postgres will not replace a function whose return type has changed.

drop function if exists public.open_business_preview(uuid);

create function public.open_business_preview(requested_token uuid)
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
    p.contact_name,
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
  where p.token = requested_token
    and p.created_at > timezone('utc', now()) - interval '90 days';
end;
$$;

revoke all on function public.open_business_preview(uuid) from public;
grant execute on function public.open_business_preview(uuid) to anon, authenticated;
