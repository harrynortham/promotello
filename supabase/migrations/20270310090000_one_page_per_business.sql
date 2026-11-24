-- One shop, one page.
--
-- Pages first put ten public pages up on Gloucester Road, and made a
-- hole in the sign-up flow at the same time. A business that finds its
-- own page sees two routes, and they are not equal:
--
--   the page       "Claim your free page" -- files a request, waits for
--                  an admin to release it
--   the home page  Sign up, and you have a business in thirty seconds
--
-- The correct route looks like the slow one. So they sign up, and
-- create_business_with_owner() happily makes a second row: the slug
-- trigger gives it its own slug and now one shop has two pages, ours
-- carrying whatever search traffic it has picked up and theirs
-- carrying all of their work. The only thing that catches it is a
-- reviewer noticing and declining it as a duplicate, by which point
-- they have written a description, picked a category and uploaded a
-- logo for nothing.
--
-- This is the lookup that lets the sign-up flow ask first. It is
-- deliberately not admin-only: every row it can return is a page
-- anybody can already read at /businesses, so there is nothing here to
-- leak. It returns nothing at all about a business that has claimed its
-- page, or one that was never published.

create or replace function public.unclaimed_pages_like(
  search_name text,
  search_postcode text default null
)
returns table (
  page_name text,
  page_slug text,
  page_address text,
  page_area text,
  page_city text
)
language sql
security definer
set search_path = public
stable
as $$
  with asked as (
    select
      lower(regexp_replace(coalesce(search_name, ''), '[^a-zA-Z0-9]', '', 'g')) as name_key,
      lower(regexp_replace(coalesce(search_postcode, ''), '[^a-zA-Z0-9]', '', 'g')) as postcode_key
  )
  select
    b.name,
    b.slug,
    l.address_line_1,
    l.region,
    l.city
  from public.businesses b
  join public.business_previews p on p.business_id = b.id
  left join lateral (
    select address_line_1, region, city, postal_code
    from public.business_locations
    where business_id = b.id
    limit 1
  ) l on true
  cross join asked a
  where b.listed_at is not null
    and b.approval_status = 'pending'
    and b.closed_at is null
    and b.demo_at is null
    and p.claimed_at is null
    -- Four characters before we start guessing. "The" matching every
    -- pub on the road is worse than asking nothing.
    and length(a.name_key) >= 4
    and (
      lower(regexp_replace(b.name, '[^a-zA-Z0-9]', '', 'g')) = a.name_key
      -- Either way round, so "Joe's Bakery" finds "Joes Bakery Ltd" and
      -- "Joe's Bakery Ltd" finds "Joes Bakery".
      or lower(regexp_replace(b.name, '[^a-zA-Z0-9]', '', 'g')) like a.name_key || '%'
      or a.name_key like lower(regexp_replace(b.name, '[^a-zA-Z0-9]', '', 'g')) || '%'
    )
    -- Given a postcode, it has to match too. A name on its own is a
    -- guess worth putting to somebody; a name and a postcode is the
    -- same shop.
    and (
      a.postcode_key = ''
      or lower(regexp_replace(coalesce(l.postal_code, ''), '[^a-zA-Z0-9]', '', 'g')) = a.postcode_key
    )
  order by b.name
  limit 3;
$$;

comment on function public.unclaimed_pages_like(text, text) is
  'Unclaimed public pages that might be the business somebody is signing up as. Returns only pages anybody can already read.';

revoke all on function public.unclaimed_pages_like(text, text) from public;
grant execute on function public.unclaimed_pages_like(text, text) to anon, authenticated;
