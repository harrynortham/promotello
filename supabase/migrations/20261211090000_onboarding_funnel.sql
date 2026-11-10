-- Where a business stops, between an outreach link and paying us.
--
-- Most of the journey is already recorded: audit_logs has the approvals and
-- the first offer, business_previews has the link being opened and claimed,
-- and the state tables carry the rest. What nothing records is the middle —
-- which setup step somebody was on when they gave up — and whether a poster
-- was ever printed.
--
-- So this table holds only what isn't written down anywhere else, and
-- onboarding_funnel() reads it together with what is, rather than keeping a
-- second copy of facts the database already has.

create table if not exists public.onboarding_events (
  id bigint generated always as identity primary key,

  -- Null until the business exists: the first two steps happen before it.
  business_id uuid
    references public.businesses (id)
    on delete cascade,

  user_id uuid
    references auth.users (id)
    on delete set null,

  -- The only handle on somebody who pressed Claim before signing up.
  preview_token uuid,

  event text not null
    check (event in ('step_completed', 'step_viewed', 'step_failed')),

  step text not null
    check (step in (
      'preview_opened',
      'signup_started',
      'account_created',
      'business_created',
      'logo_added',
      'description_added',
      'address_added',
      'hours_added',
      'cover_added',
      'sent_for_review',
      'approved',
      'first_offer_published',
      'qr_poster_created',
      'qr_poster_downloaded',
      'first_qr_scan',
      'first_customer_action',
      'upgraded_to_paid'
    )),

  -- Why a step failed, which step was being viewed, whether a row was
  -- backfilled and whether its time is a guess.
  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists onboarding_events_business_idx
  on public.onboarding_events (business_id, created_at desc);

create index if not exists onboarding_events_step_idx
  on public.onboarding_events (step, created_at desc);

create index if not exists onboarding_events_preview_idx
  on public.onboarding_events (preview_token)
  where preview_token is not null;

alter table public.onboarding_events enable row level security;

-- Written only by the server, with the service role, through
-- lib/onboarding-events.ts: nothing in a browser can claim a business did
-- something. Read by nobody but us.
drop policy if exists onboarding_events_admin_read on public.onboarding_events;
create policy onboarding_events_admin_read
  on public.onboarding_events
  for select
  using (public.is_platform_admin());

-- A poster that was printed or saved as a PDF, which is not the same as one
-- that was made. It lives on the code rather than in onboarding_events so
-- the business's own dashboard can read it: the events table is ours alone.
alter table public.qr_codes
  add column if not exists poster_printed_at timestamptz;

create or replace function public.mark_poster_printed(requested_code_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  owning_business uuid;
begin
  select business_id into owning_business
  from public.qr_codes
  where id = requested_code_id;

  if owning_business is null or not public.is_business_member(owning_business, 'member') then
    return;
  end if;

  -- The first printing is the one the funnel is about; later ones change
  -- nothing, so this never moves the date.
  update public.qr_codes
  set poster_printed_at = coalesce(poster_printed_at, timezone('utc', now()))
  where id = requested_code_id;
end;
$$;

revoke all on function public.mark_poster_printed(uuid) from public, anon;
grant execute on function public.mark_poster_printed(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Every step a business has reached, whether it was logged or can be worked
-- out from what the database already holds. One row per business per step,
-- at the earliest time it happened.
-- ---------------------------------------------------------------------------

create or replace function public.onboarding_step_times()
returns table (
  business_id uuid,
  step text,
  at timestamptz,
  -- A backfilled time nobody recorded at the time: counted as reached, left
  -- out of how long steps take.
  approximate boolean
)
language sql
stable
security definer
set search_path = public
as $$
  -- 1. The outreach link was opened.
  select p.business_id, 'preview_opened', p.first_viewed_at, false
  from public.business_previews p
  where p.first_viewed_at is not null

  union all

  -- 2. Claim or sign-up started. Logged, and attached to a business by the
  -- preview it came from, or by the business that account later made.
  select
    coalesce(e.business_id, pb.business_id, mb.business_id),
    'signup_started',
    e.created_at,
    coalesce(e.metadata->>'approximate', 'false') = 'true'
  from public.onboarding_events e
  left join public.business_previews pb on pb.token = e.preview_token
  left join lateral (
    select m.business_id
    from public.business_members m
    where m.user_id = e.user_id
    order by m.created_at
    limit 1
  ) mb on true
  where e.step = 'signup_started' and e.event = 'step_completed'

  union all

  -- 3. The owner's account.
  select m.business_id, 'account_created', u.created_at, false
  from public.business_members m
  join auth.users u on u.id = m.user_id
  where m.role = 'owner'

  union all

  -- 4. The business row itself.
  select b.id, 'business_created', b.created_at, false
  from public.businesses b

  union all

  -- 5 to 9: only the events table knows when a logo or an address was
  -- added, because the business row only holds what it is now.
  select
    e.business_id,
    e.step,
    e.created_at,
    coalesce(e.metadata->>'approximate', 'false') = 'true'
  from public.onboarding_events e
  where e.event = 'step_completed'
    and e.step in (
      'logo_added', 'description_added', 'address_added',
      'hours_added', 'cover_added'
    )

  union all

  -- 10. Sent to us to read.
  select b.id, 'sent_for_review', b.review_requested_at, false
  from public.businesses b
  where b.review_requested_at is not null

  union all

  -- 11. We approved it.
  select a.business_id, 'approved', a.created_at, false
  from public.audit_logs a
  where a.action = 'business_approved' and a.business_id is not null

  union all

  -- Approvals from before the audit log existed (2 November 2026) would
  -- otherwise read as a cliff at this step. The business is approved; only
  -- the hour is a guess.
  select b.id, 'approved', b.updated_at, true
  from public.businesses b
  where b.approval_status = 'approved'
    and not exists (
      select 1 from public.audit_logs a
      where a.business_id = b.id and a.action = 'business_approved'
    )

  union all

  -- 12. Their first offer went live.
  select a.business_id, 'first_offer_published', a.created_at, false
  from public.audit_logs a
  where a.action = 'offer_approved' and a.business_id is not null

  union all

  -- And the offers approved before the audit log, same as above.
  select o.business_id, 'first_offer_published', o.updated_at, true
  from public.offers o
  where o.approval_status = 'approved'
    and not exists (
      select 1 from public.audit_logs a
      where a.business_id = o.business_id and a.action = 'offer_approved'
    )

  union all

  -- 13. A poster exists.
  select q.business_id, 'qr_poster_created', q.created_at, false
  from public.qr_codes q

  union all

  -- 14. And it was actually printed or saved. Made is not printed, which
  -- is what the dashboard checklist used to tick on.
  select q.business_id, 'qr_poster_downloaded', q.poster_printed_at, false
  from public.qr_codes q
  where q.poster_printed_at is not null

  union all

  -- 15. The first scan that isn't the owner holding their phone up to the
  -- screen. There is no user on a scan, so the rule is time: an hour after
  -- the code was made, the person scanning it is somebody else.
  select q.business_id, 'first_qr_scan', s.scanned_at, false
  from public.qr_scans s
  join public.qr_codes q on q.id = s.qr_code_id
  where s.scanned_at >= q.created_at + interval '1 hour'

  union all

  -- 16. A customer claimed something.
  select o.business_id, 'first_customer_action', r.redeemed_at, false
  from public.offer_redemptions r
  join public.offers o on o.id = r.offer_id
  where r.redeemed_at is not null

  union all

  -- 17. Paying rather than trying: the trial ended and billing began. The
  -- Stripe webhook logs this as it happens; this covers what came before.
  select
    s.business_id,
    'upgraded_to_paid',
    coalesce(s.trial_end, s.created_at),
    s.trial_end is null
  from public.subscriptions s
  where s.status in ('active', 'past_due')
    and coalesce(s.trial_end, s.created_at) <= now()

  union all

  select
    e.business_id,
    'upgraded_to_paid',
    e.created_at,
    false
  from public.onboarding_events e
  where e.step = 'upgraded_to_paid' and e.event = 'step_completed';
$$;

revoke all on function public.onboarding_step_times() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- The funnel itself: how many businesses reached each step, how many of the
-- ones before them got there, how long it took, and who is stuck.
--
-- Pass a city to look at one city. Businesses that haven't reached the
-- address step have no city at all, and they are exactly the ones this page
-- is for, so `only_without_city` asks for those instead of hiding them.
-- ---------------------------------------------------------------------------

create or replace function public.onboarding_funnel(
  requested_city_id uuid default null,
  only_without_city boolean default false,
  stuck_after_days integer default 3
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  result jsonb;
begin
  if not public.is_platform_admin() then
    raise exception using errcode = '42501', message = 'Platform admin access is required';
  end if;

  stuck_after_days := greatest(coalesce(stuck_after_days, 3), 1);

  return (
    with ordered_steps as (
      select * from (values
        ('preview_opened', 1, 'Preview opened'),
        ('signup_started', 2, 'Sign-up started'),
        ('account_created', 3, 'Account created'),
        ('business_created', 4, 'Business created'),
        ('logo_added', 5, 'Logo added'),
        ('description_added', 6, 'Description added'),
        ('address_added', 7, 'Address added'),
        ('hours_added', 8, 'Hours added'),
        ('cover_added', 9, 'Cover photo added'),
        ('sent_for_review', 10, 'Sent for review'),
        ('approved', 11, 'Approved'),
        ('first_offer_published', 12, 'First offer live'),
        ('qr_poster_created', 13, 'QR poster made'),
        ('qr_poster_downloaded', 14, 'QR poster printed'),
        ('first_qr_scan', 15, 'First real scan'),
        ('first_customer_action', 16, 'First customer'),
        ('upgraded_to_paid', 17, 'Paying')
      ) as s(step, step_order, label)
    ),

    -- Sample businesses are demonstration data, as in platform_metrics().
    -- A business's city is its first location's city_id, never its name:
    -- see docs/MULTI-CITY.md.
    subjects as (
      select b.id, b.name, b.slug, b.closed_at, l.city_id
      from public.businesses b
      left join lateral (
        select bl.city_id
        from public.business_locations bl
        where bl.business_id = b.id
        order by bl.created_at
        limit 1
      ) l on true
      where not coalesce(b.is_sample, false)
    ),
    chosen as (
      select * from subjects
      where case
        when only_without_city then city_id is null
        when requested_city_id is not null then city_id = requested_city_id
        else true
      end
    ),

    reached as (
      select
        t.business_id,
        t.step,
        min(t.at) as at,
        bool_or(t.approximate) as approximate
      from public.onboarding_step_times() t
      join chosen c on c.id = t.business_id
      where t.at is not null
      group by t.business_id, t.step
    ),

    -- The step before this one that the business actually reached, so a
    -- skipped step doesn't break the clock.
    with_previous as (
      select
        r.business_id,
        r.step,
        s.step_order,
        r.at,
        r.approximate,
        lag(r.at) over w as previous_at,
        lag(r.approximate) over w as previous_approximate
      from reached r
      join ordered_steps s on s.step = r.step
      window w as (partition by r.business_id order by s.step_order)
    ),

    per_step as (
      select
        s.step,
        s.step_order,
        s.label,
        count(w.business_id) as reached,
        percentile_cont(0.5) within group (
          order by extract(epoch from (w.at - w.previous_at))
        ) filter (
          where w.previous_at is not null
            and not w.approximate
            and not coalesce(w.previous_approximate, false)
            and w.at >= w.previous_at
        ) as median_seconds
      from ordered_steps s
      left join with_previous w on w.step = s.step
      group by s.step, s.step_order, s.label
    ),

    furthest as (
      select distinct on (w.business_id)
        w.business_id, w.step, w.step_order, w.at
      from with_previous w
      order by w.business_id, w.step_order desc
    )

    select jsonb_build_object(
      'businesses', (select count(*) from chosen),
      'stuck_after_days', stuck_after_days,

      'steps', coalesce((
        select jsonb_agg(
          jsonb_build_object(
            'step', step,
            'label', label,
            'position', step_order,
            'reached', reached,
            'median_seconds', median_seconds
          ) order by step_order
        )
        from per_step
      ), '[]'::jsonb),

      -- Somebody who started signing up and never made a business: they
      -- have no business row, so they can't be in the funnel above.
      'signups_without_a_business', (
        select count(distinct coalesce(e.user_id::text, e.preview_token::text, e.id::text))
        from public.onboarding_events e
        where e.step = 'signup_started'
          and e.event = 'step_completed'
          and e.business_id is null
          and not exists (
            select 1 from public.business_members m where m.user_id = e.user_id
          )
      ),

      'stuck', coalesce((
        select jsonb_agg(row_to_json(stuck) order by waiting_days desc)
        from (
          select
            c.id as business_id,
            c.name,
            c.slug,
            f.step,
            s.label,
            f.at,
            floor(extract(epoch from (now() - f.at)) / 86400)::int as waiting_days
          from furthest f
          join chosen c on c.id = f.business_id
          join ordered_steps s on s.step = f.step
          where c.closed_at is null
            and f.step_order < 17
            and f.at < now() - make_interval(days => stuck_after_days)
        ) stuck
      ), '[]'::jsonb)
    )
  );
end;
$$;

revoke all on function public.onboarding_funnel(uuid, boolean, integer) from public, anon;
grant execute on function public.onboarding_funnel(uuid, boolean, integer) to authenticated;

-- ---------------------------------------------------------------------------
-- One business's journey, in order, including the steps it tried and failed.
-- ---------------------------------------------------------------------------

create or replace function public.onboarding_timeline(requested_business_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_platform_admin() then
    raise exception using errcode = '42501', message = 'Platform admin access is required';
  end if;

  return (
    with steps_reached as (
      select t.step, min(t.at) as at, bool_or(t.approximate) as approximate
      from public.onboarding_step_times() t
      where t.business_id = requested_business_id and t.at is not null
      group by t.step
    ),
    tried as (
      select e.step, e.event, e.created_at as at, e.metadata
      from public.onboarding_events e
      where e.business_id = requested_business_id
        and e.event in ('step_viewed', 'step_failed')
    )
    select jsonb_build_object(
      'business', (
        select jsonb_build_object('id', b.id, 'name', b.name, 'slug', b.slug)
        from public.businesses b where b.id = requested_business_id
      ),
      'reached', coalesce((
        select jsonb_agg(
          jsonb_build_object('step', step, 'at', at, 'approximate', approximate)
          order by at
        ) from steps_reached
      ), '[]'::jsonb),
      'tried', coalesce((
        select jsonb_agg(
          jsonb_build_object('step', step, 'event', event, 'at', at, 'metadata', metadata)
          order by at
        ) from tried
      ), '[]'::jsonb)
    )
  );
end;
$$;

revoke all on function public.onboarding_timeline(uuid) from public, anon;
grant execute on function public.onboarding_timeline(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Backfill, so the funnel isn't empty on its first day.
--
-- Only the steps nothing else records need rows: everything else is worked
-- out from audit_logs and the state tables, for every business that ever
-- existed, with no help from here.
--
-- Nobody wrote down when a logo or an address was added, so these times are
-- the nearest honest one and are marked approximate: they count as reached,
-- and are left out of how long a step takes.
-- ---------------------------------------------------------------------------

insert into public.onboarding_events (business_id, user_id, event, step, metadata, created_at)
select
  b.id,
  null,
  'step_completed',
  v.step,
  jsonb_build_object('backfilled', true, 'approximate', true),
  v.at
from public.businesses b
cross join lateral (values
  ('logo_added', b.logo_url is not null, b.updated_at),
  ('description_added', b.description is not null and length(trim(b.description)) > 0, b.updated_at),
  ('cover_added', b.cover_image_url is not null, b.updated_at),
  ('address_added',
    exists (select 1 from public.business_locations l where l.business_id = b.id),
    (select min(l.created_at) from public.business_locations l where l.business_id = b.id)),
  ('hours_added',
    exists (select 1 from public.business_hours h where h.business_id = b.id),
    (select min(h.created_at) from public.business_hours h where h.business_id = b.id))
) as v(step, done, at)
where v.done
  and v.at is not null
  and not exists (
    select 1 from public.onboarding_events e
    where e.business_id = b.id and e.step = v.step and e.event = 'step_completed'
  );
