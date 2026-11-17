-- Looking a preview up without counting it as a visit
--
-- open_business_preview() does two things: it returns the page we built,
-- and it records that the business opened it — view_count,
-- first_viewed_at, last_viewed_at. Those are the outreach numbers. They
-- are how /admin/previews tells a link that was opened from one that was
-- ignored, which is the only signal there is between sending an email
-- and hearing back.
--
-- The sign-up page wants the same few fields, to show somebody the page
-- they are about to claim while they are typing their address into the
-- form. Reusing open_business_preview() there would count a view every
-- time that form was rendered — including every reload, and every person
-- who got as far as the form and stopped — and quietly turn a real
-- number into a meaningless one.
--
-- So: the same read, no writing. Only what a sign-up panel can show, and
-- nothing about the business's own arrangements: no contact name, no
-- claimed_at, no sample reward. The same 90-day window and the same
-- grants, because it answers for the same links.

create or replace function public.preview_card(requested_token uuid)
returns table (
  business_name text,
  category text,
  description text,
  logo_url text,
  cover_image_url text,
  area text,
  city text,
  sample_offer text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    b.name,
    b.category,
    b.description,
    b.logo_url,
    b.cover_image_url,
    l.region,
    l.city,
    p.sample_offer
  from public.business_previews p
  join public.businesses b on b.id = p.business_id
  left join lateral (
    select region, city from public.business_locations
    where business_locations.business_id = b.id
    order by created_at
    limit 1
  ) l on true
  where p.token = requested_token
    and p.claimed_at is null
    and p.created_at > timezone('utc', now()) - interval '90 days';
$$;

revoke all on function public.preview_card(uuid) from public;
grant execute on function public.preview_card(uuid) to anon, authenticated;
