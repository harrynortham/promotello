-- "Something else", and what we do about it.
--
-- The first thing we ask a business is what kind of business it is,
-- from six headings and twenty-nine kinds. A tattoo studio, a car
-- garage, a newsagent or a nursery is none of them, and the answer was
-- compulsory: pick the nearest wrong one, or give up on the first
-- screen. Nothing recorded that anybody had struggled, so the list
-- never learned.
--
-- The list ends with "Something else" and a box to say what they do in
-- a few words. create_business_with_owner() already handles it: it
-- takes the category as text, looks for a category with that id or
-- slug, and leaves category_id null when nothing matches while keeping
-- what was typed. So their page says "Tattoo studio" from the start,
-- they are in the city listing and the search, and they are simply not
-- on a category page until we give them one.
--
-- Which we do while reviewing them, because we read every new business
-- anyway. Ask, record, assign.

create or replace function public.set_business_category(
  requested_business_id uuid,
  requested_category_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  chosen public.categories;
begin
  if not public.is_platform_admin() then
    raise exception using errcode = '42501', message = 'Admin access is required';
  end if;

  -- A business belongs to a kind of business, not to a heading.
  select * into chosen
  from public.categories
  where id = requested_category_id
    and parent_id is not null
    and is_active;

  if not found then
    raise exception using errcode = 'P0002', message = 'That is not a category a business can be in';
  end if;

  -- The words on the page follow the category: what they typed was
  -- standing in until there was one.
  update public.businesses
  set category_id = chosen.id,
      category = chosen.name
  where id = requested_business_id;
end;
$$;

comment on function public.set_business_category(uuid, uuid) is
  'Puts a business in a category, for one that joined before we had a category for it.';

revoke all on function public.set_business_category(uuid, uuid) from public, anon;
grant execute on function public.set_business_category(uuid, uuid) to authenticated;

-- The queue: businesses whose own words are still standing in for a
-- category, newest first.
create or replace function public.businesses_without_a_category()
returns table (
  id uuid,
  name text,
  slug text,
  said text,
  approval_status text,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select b.id, b.name, b.slug, b.category, b.approval_status, b.created_at
  from public.businesses b
  where b.category_id is null
    and b.closed_at is null
    and coalesce(b.is_sample, false) = false
    and public.is_platform_admin()
  order by b.created_at desc;
$$;

revoke all on function public.businesses_without_a_category() from public, anon;
grant execute on function public.businesses_without_a_category() to authenticated;
