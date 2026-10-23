-- Google review prompts. A business adds its Google review link; customers
-- who recently used a voucher or got a loyalty stamp there are asked to
-- leave a review. Clicks go through /review/<business> so they can be
-- counted. Prompts are a Pro feature.

alter table public.businesses
  add column if not exists google_review_url text;

alter table public.businesses
  drop constraint if exists businesses_google_review_url_check;

-- Only Google review links: g.page short links, maps.app.goo.gl, and
-- google.com / search.google.com review pages.
alter table public.businesses
  add constraint businesses_google_review_url_check
  check (
    google_review_url is null
    or (
      char_length(google_review_url) <= 500
      and google_review_url ~* '^https://(g\.page|maps\.app\.goo\.gl|(www\.|search\.)?google\.[a-z.]+)/'
    )
  );

create table if not exists public.review_link_clicks (
  id bigint generated always as identity primary key,

  business_id uuid not null
    references public.businesses (id)
    on delete cascade,

  user_id uuid
    references auth.users (id)
    on delete set null,

  source text not null default 'profile'
    check (source in ('voucher', 'loyalty', 'profile')),

  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists review_link_clicks_business_created_idx
  on public.review_link_clicks (business_id, created_at desc);

create index if not exists review_link_clicks_user_idx
  on public.review_link_clicks (user_id, business_id);

alter table public.review_link_clicks enable row level security;

drop policy if exists review_link_clicks_select_members on public.review_link_clicks;

-- Members can count clicks for their business. Rows are written only by
-- record_review_click().
create policy review_link_clicks_select_members
on public.review_link_clicks
for select
to authenticated
using (
  public.is_business_member(business_id, 'member')
);

-- ---------------------------------------------------------------------------
-- Review prompts for the signed-in customer: businesses they used a voucher
-- at or got a loyalty stamp from in the last 14 days, that are on Pro and
-- have a review link, and that they haven't clicked through to in 90 days.
-- ---------------------------------------------------------------------------

create or replace function public.review_prompts_for_current_user()
returns table (
  business_id uuid,
  business_name text,
  logo_url text,
  source text,
  happened_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  with visits as (
    select o.business_id, 'voucher'::text as source, r.used_at as happened_at
    from public.offer_redemptions r
    join public.offers o on o.id = r.offer_id
    where r.user_id = auth.uid()
      and r.used_at > now() - interval '14 days'

    union all

    select p.business_id, 'loyalty'::text, e.created_at
    from public.loyalty_events e
    join public.loyalty_cards c on c.id = e.card_id
    join public.loyalty_programs p on p.id = c.program_id
    where c.user_id = auth.uid()
      and e.kind = 'stamp'
      and e.created_at > now() - interval '14 days'
  ),
  latest as (
    select distinct on (v.business_id) v.business_id, v.source, v.happened_at
    from visits v
    order by v.business_id, v.happened_at desc
  )
  select b.id, b.name, b.logo_url, l.source, l.happened_at
  from latest l
  join public.businesses b on b.id = l.business_id
  where b.approval_status = 'approved'
    and b.google_review_url is not null
    and public.business_has_pro(b.id)
    and not exists (
      select 1
      from public.review_link_clicks k
      where k.business_id = b.id
        and k.user_id = auth.uid()
        and k.created_at > now() - interval '90 days'
    )
  order by l.happened_at desc
  limit 3;
$$;

-- ---------------------------------------------------------------------------
-- Records a click on a business's review link and returns where to go.
-- Callable signed out too (from the public business page).
-- ---------------------------------------------------------------------------

create or replace function public.record_review_click(
  requested_business_id uuid,
  requested_source text default 'profile'
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  review_url text;
begin
  select b.google_review_url
  into review_url
  from public.businesses b
  where b.id = requested_business_id
    and b.approval_status = 'approved';

  if review_url is null then
    return null;
  end if;

  insert into public.review_link_clicks (business_id, user_id, source)
  values (
    requested_business_id,
    auth.uid(),
    case when requested_source in ('voucher', 'loyalty', 'profile') then requested_source else 'profile' end
  );

  return review_url;
end;
$$;

revoke all on function public.review_prompts_for_current_user() from public, anon;
grant execute on function public.review_prompts_for_current_user() to authenticated;

revoke all on function public.record_review_click(uuid, text) from public;
grant execute on function public.record_review_click(uuid, text) to anon, authenticated;
