-- Two ways to win businesses without visiting them:
--
-- 1. Previews. An admin builds a business's listing in advance and sends
--    the owner a private link showing their page, offer, loyalty card and
--    poster, with a button to claim it. The business stays unapproved, so
--    hidden from customers, until an admin approves it after the claim.
--
-- 2. Emails that guide a new business through setup and its free trial:
--   welcome        straight after sign-up
--   setup_nudge_1  day 2, if a setup step is still missing
--   setup_nudge_2  day 5, if a setup step is still missing
--   trial_ending   5 days before a trial ends, with what it has achieved
-- Each is sent at most once per business. Owners can turn off the setup
-- tips (not the trial notice) in their account's notification settings.

-- ---------------------------------------------------------------------------
-- 1. Previews
-- ---------------------------------------------------------------------------

create table if not exists public.business_previews (
  business_id uuid primary key
    references public.businesses (id)
    on delete cascade,

  token uuid not null unique default gen_random_uuid(),

  -- Who it's for, to personalise the page ("Hi Sam").
  contact_name text check (contact_name is null or char_length(contact_name) <= 80),

  -- What the page suggests they could run.
  sample_offer text not null check (char_length(trim(sample_offer)) between 3 and 80),
  sample_reward text not null check (char_length(trim(sample_reward)) between 3 and 60),
  sample_stamps integer not null default 9 check (sample_stamps between 3 and 20),

  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),

  first_viewed_at timestamptz,
  last_viewed_at timestamptz,
  view_count integer not null default 0,

  claimed_at timestamptz,
  claimed_by uuid references auth.users (id) on delete set null
);

alter table public.business_previews enable row level security;

drop policy if exists business_previews_admin_all on public.business_previews;
create policy business_previews_admin_all on public.business_previews
  for all to authenticated
  using (public.is_platform_admin())
  with check (public.is_platform_admin());

-- What the preview page shows. The token is the secret. Views by admins
-- (checking the page) aren't counted.
create or replace function public.open_business_preview(requested_token uuid)
returns table (
  business_id uuid,
  business_name text,
  category text,
  description text,
  logo_url text,
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

-- The signed-in visitor becomes the business's owner, and whoever built
-- the preview leaves the team. Returns the business id.
create or replace function public.claim_business_preview(requested_token uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  preview public.business_previews;
begin
  if auth.uid() is null then
    raise exception using errcode = '42501', message = 'Please sign in to claim this business.';
  end if;

  select * into preview
  from public.business_previews
  where token = requested_token
    and created_at > timezone('utc', now()) - interval '90 days'
  for update;

  if preview.business_id is null then
    raise exception using errcode = 'P0002', message = 'This link has expired. Get in touch and we''ll send a new one.';
  end if;

  if preview.claimed_at is not null then
    if preview.claimed_by = auth.uid() then
      return preview.business_id;
    end if;

    raise exception using errcode = '42501', message = 'This business has already been claimed.';
  end if;

  insert into public.business_members (business_id, user_id, role)
  values (preview.business_id, auth.uid(), 'owner')
  on conflict (business_id, user_id)
  do update set role = 'owner', updated_at = timezone('utc', now());

  delete from public.business_members
  where business_id = preview.business_id
    and user_id <> auth.uid();

  update public.business_previews
  set claimed_at = timezone('utc', now()), claimed_by = auth.uid()
  where business_id = preview.business_id;

  return preview.business_id;
end;
$$;

revoke all on function public.claim_business_preview(uuid) from public, anon;
grant execute on function public.claim_business_preview(uuid) to authenticated;

-- Admins can delete a preview that hasn't been claimed, with the business
-- built for it. Claimed businesses are never deleted this way.
create or replace function public.delete_business_preview(requested_business_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_platform_admin() then
    raise exception using errcode = '42501', message = 'Only platform admins can delete previews';
  end if;

  delete from public.businesses b
  using public.business_previews p
  where p.business_id = b.id
    and b.id = requested_business_id
    and p.claimed_at is null;

  return found;
end;
$$;

revoke all on function public.delete_business_preview(uuid) from public, anon;
grant execute on function public.delete_business_preview(uuid) to authenticated;

-- Daily: previews nobody claimed within 90 days are deleted, with their
-- businesses (the privacy policy promises this).
create or replace function public.delete_expired_business_previews()
returns integer
language sql
security definer
set search_path = public
as $$
  with expired as (
    delete from public.businesses b
    using public.business_previews p
    where p.business_id = b.id
      and p.claimed_at is null
      and p.created_at < timezone('utc', now()) - interval '90 days'
    returning b.id
  )
  select count(*)::integer from expired;
$$;

revoke all on function public.delete_expired_business_previews() from public, anon, authenticated;
grant execute on function public.delete_expired_business_previews() to service_role;

-- ---------------------------------------------------------------------------
-- 2. Setup and trial emails
-- ---------------------------------------------------------------------------

alter table public.account_notification_settings
  add column if not exists business_tips_enabled boolean not null default true;

create table if not exists public.business_lifecycle_sends (
  business_id uuid not null
    references public.businesses (id)
    on delete cascade,

  kind text not null
    check (kind in ('welcome', 'setup_nudge_1', 'setup_nudge_2', 'trial_ending')),

  sent_at timestamptz not null default timezone('utc', now()),

  primary key (business_id, kind)
);

alter table public.business_lifecycle_sends enable row level security;
-- No policies: only the service role reads or writes it.

-- Marks the emails due now as sent and returns what's needed to write
-- them. Pass a business id to check just that one (used right after
-- sign-up for the welcome email).
create or replace function public.claim_business_lifecycle_emails(only_business uuid default null)
returns table (
  business_id uuid,
  business_name text,
  kind text,
  emails text[],
  details jsonb
)
language plpgsql
security definer
set search_path = public
as $$
#variable_conflict use_column
begin
  return query
  with candidates as (
    select
      b.id,
      -- A claimed preview starts when it's claimed, not when it was built.
      coalesce(pv.claimed_at, b.created_at) as created_at,
      now() - coalesce(pv.claimed_at, b.created_at) as age,
      exists (select 1 from public.offers o where o.business_id = b.id) as has_offer,
      exists (select 1 from public.loyalty_programs p where p.business_id = b.id and p.is_active) as has_loyalty,
      exists (select 1 from public.qr_codes q where q.business_id = b.id and q.archived_at is null) as has_poster,
      (
        select s.trial_end
        from public.subscriptions s
        where s.business_id = b.id
          and s.status = 'trialing'
          and s.trial_end between now() and now() + interval '5 days'
        order by s.trial_end
        limit 1
      ) as trial_end
    from public.businesses b
    left join public.business_previews pv on pv.business_id = b.id
    where b.approval_status in ('pending', 'approved')
      and not coalesce(b.is_sample, false)
      -- Not yet claimed: the only owner is whoever built the preview.
      and (pv.business_id is null or pv.claimed_at is not null)
      and (only_business is null or b.id = only_business)
  ),
  due_kinds as (
    -- Only new businesses get the setup emails, never ones that signed up
    -- before these emails existed.
    select c.id, 'welcome'::text as kind
    from candidates c
    where c.age < interval '2 days'
    union all
    select c.id, 'setup_nudge_1'
    from candidates c
    where c.age >= interval '2 days' and c.age < interval '10 days'
      and not (c.has_offer and c.has_loyalty and c.has_poster)
    union all
    select c.id, 'setup_nudge_2'
    from candidates c
    where c.age >= interval '5 days' and c.age < interval '14 days'
      and not (c.has_offer and c.has_loyalty and c.has_poster)
      and exists (
        select 1 from public.business_lifecycle_sends s
        where s.business_id = c.id and s.kind = 'setup_nudge_1'
          and s.sent_at < now() - interval '2 days'
      )
    union all
    select c.id, 'trial_ending'
    from candidates c
    where c.trial_end is not null
  ),
  claimed as (
    insert into public.business_lifecycle_sends (business_id, kind)
    select d.id, d.kind from due_kinds d
    on conflict do nothing
    returning business_lifecycle_sends.business_id, business_lifecycle_sends.kind
  )
  select
    cl.business_id,
    b.name,
    cl.kind,
    coalesce(
      (select array_agg(u.email::text)
       from public.business_members m
       join auth.users u on u.id = m.user_id
       left join public.account_notification_settings ns on ns.user_id = m.user_id
       where m.business_id = cl.business_id
         and m.role = 'owner'
         and u.email is not null
         -- The trial notice always goes; tips respect the owner's setting.
         and (cl.kind in ('welcome', 'trial_ending') or coalesce(ns.business_tips_enabled, true))),
      '{}'
    ),
    jsonb_build_object(
      'has_offer', c.has_offer,
      'has_loyalty', c.has_loyalty,
      'has_poster', c.has_poster,
      'trial_end', c.trial_end,
      'since', c.created_at,
      'followers', (select count(*) from public.business_followers f where f.business_id = cl.business_id),
      'loyalty_members', (
        select count(*) from public.loyalty_cards lc
        join public.loyalty_programs p on p.id = lc.program_id
        where p.business_id = cl.business_id
      ),
      'claims', (
        select count(*) from public.offer_redemptions r
        join public.offers o on o.id = r.offer_id
        where o.business_id = cl.business_id
      ),
      'visits', (
        select count(*) from public.offer_redemptions r
        join public.offers o on o.id = r.offer_id
        where o.business_id = cl.business_id and r.used_at is not null
      ) + (
        select count(*) from public.loyalty_events e
        join public.loyalty_cards lc on lc.id = e.card_id
        join public.loyalty_programs p on p.id = lc.program_id
        where p.business_id = cl.business_id and e.kind = 'stamp'
      ),
      'qr_scans', (
        select count(*) from public.qr_scans s
        join public.qr_codes q on q.id = s.qr_code_id
        where q.business_id = cl.business_id
      ),
      'views', (select count(*) from public.page_views pv where pv.business_id = cl.business_id)
    )
  from claimed cl
  join public.businesses b on b.id = cl.business_id
  join candidates c on c.id = cl.business_id;
end;
$$;

revoke all on function public.claim_business_lifecycle_emails(uuid) from public, anon, authenticated;
grant execute on function public.claim_business_lifecycle_emails(uuid) to service_role;
