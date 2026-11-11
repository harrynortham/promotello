-- The stuck clock counts from the last thing we watched happen.
--
-- Backfilled steps carry the nearest honest timestamp rather than a
-- recorded one — for steps 5 to 9 that is usually businesses.updated_at,
-- which for most businesses is recent. The medians already left those out;
-- the stuck list did not, so a business that has sat still since October
-- looked as though it moved this week, and the list was shorter than the
-- truth.
--
-- Where a business got to is still the furthest step it reached. How long
-- it has been there is counted from that step's own time when we recorded
-- it, and only when that time was backfilled does it fall back to the last
-- step we did watch happen — every business has one of those: its own
-- created_at. Counting from the latest real time in every case would be a
-- different measurement, "how long since anything happened", and would
-- under-report a business that stalled after a late burst of activity.

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
        w.business_id, w.step, w.step_order, w.at, w.approximate
      from with_previous w
      order by w.business_id, w.step_order desc
    ),

    -- When the clock starts. Normally it is the moment they reached the
    -- step they are on. But a backfilled step carries the nearest honest
    -- timestamp rather than a recorded one — for steps 5 to 9 that is
    -- usually the day the business row was last touched — so counting
    -- from one would say a business that has sat still since October
    -- moved this week. For those, the clock starts at the last step we
    -- did watch happen. Every business has one: its own created_at.
    clock as (
      select
        f.business_id,
        case
          when not f.approximate then f.at
          else (
            select max(r.at)
            from reached r
            where r.business_id = f.business_id and not r.approximate
          )
        end as at
      from furthest f
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
            -- Where they got to is the furthest step; how long they have
            -- been there is counted from a time we actually recorded,
            -- never from a backfilled guess.
            l.at,
            floor(extract(epoch from (now() - l.at)) / 86400)::int as waiting_days
          from furthest f
          join chosen c on c.id = f.business_id
          join ordered_steps s on s.step = f.step
          join clock l on l.business_id = f.business_id
          where c.closed_at is null
            and f.step_order < 17
            and l.at < now() - make_interval(days => stuck_after_days)
        ) stuck
      ), '[]'::jsonb)
    )
  );
end;
$$;

revoke all on function public.onboarding_funnel(uuid, boolean, integer) from public, anon;
grant execute on function public.onboarding_funnel(uuid, boolean, integer) to authenticated;
