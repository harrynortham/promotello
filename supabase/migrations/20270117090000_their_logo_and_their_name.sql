-- Their logo, and their name.
--
-- Every email to a business opened with no name and nothing of theirs
-- on it, while the two that do greet somebody — the sign-up reminder,
-- the customer welcome — read noticeably better for it. These are the
-- two pieces the lifecycle emails were missing to do the same.
--
-- The addresses array is left exactly as it was: names come alongside
-- it, keyed by address, so nothing downstream changes shape and a
-- business with two owners greets each of them correctly.
--
-- Generated from the deployed definition, checked byte for byte first
-- (md5 e1b5fdbf…) — the file it was patched from is itself that text.

CREATE OR REPLACE FUNCTION public.claim_business_lifecycle_emails(only_business uuid DEFAULT NULL::uuid)
 RETURNS TABLE(business_id uuid, business_name text, kind text, emails text[], details jsonb)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
      b.logo_url is not null as has_logo,
      coalesce(btrim(b.description), '') <> '' as has_description,
      exists (select 1 from public.business_locations l where l.business_id = b.id) as has_address,
      exists (select 1 from public.business_hours h where h.business_id = b.id) as has_hours,
      b.cover_image_url is not null as has_cover,
      -- What the dashboard calls ready to send: the five things the
      -- send button is locked behind.
      (
        b.logo_url is not null
        and coalesce(btrim(b.description), '') <> ''
        and exists (select 1 from public.business_locations l where l.business_id = b.id)
        and exists (select 1 from public.business_hours h where h.business_id = b.id)
        and b.cover_image_url is not null
      ) as profile_ready,
      -- Nothing is public until the business asks us to look.
      b.review_requested_at is not null as sent_for_review,
      b.approval_status = 'approved' as live,
      -- Never subscribed, so the free trial is still there to take.
      not exists (select 1 from public.subscriptions s where s.business_id = b.id) as never_subscribed,
      (
        select max(s.sent_at)
        from public.business_lifecycle_sends s
        where s.business_id = b.id
      ) as last_sent_at,
      (
        select s.trial_end
        from public.subscriptions s
        where s.business_id = b.id
          and s.status = 'trialing'
          and s.trial_end between now() and now() + interval '5 days'
        order by s.trial_end
        limit 1
      ) as trial_end,
      -- Whether that trial has a card behind it. Null when no trial is
      -- ending, which is every row the trial email is not about.
      (
        select s.has_payment_method
        from public.subscriptions s
        where s.business_id = b.id
          and s.status = 'trialing'
          and s.trial_end between now() and now() + interval '5 days'
        order by s.trial_end
        limit 1
      ) as trial_has_card,
      -- The offer and the reward we drew in their preview email, so the
      -- welcome can name them instead of describing a blank page
      -- (docs/LAUNCH-FUNNEL.md). Null for a cold sign-up — and the
      -- filter below means any preview row reaching here is a claimed
      -- one, so there is nothing extra to check.
      pv.sample_offer,
      pv.sample_reward,
      pv.sample_stamps,
      -- Their own logo, drawn over every email we send them.
      b.logo_url
    from public.businesses b
    left join public.business_previews pv on pv.business_id = b.id
    where b.approval_status in ('pending', 'approved')
      and not coalesce(b.is_sample, false)
      -- Not yet claimed: the only owner is whoever built the preview.
      and (pv.business_id is null or pv.claimed_at is not null)
      and (only_business is null or b.id = only_business)
  ),
  scheduled as (
    -- Only new businesses get these, never ones that signed up before
    -- each email existed. Lower priority numbers go first when several
    -- are due on the same day.
    select c.id, 'setup_nudge_1'::text as kind, 1 as priority
    from candidates c
    where c.age >= interval '2 days' and c.age < interval '10 days'
      and not (c.profile_ready and c.sent_for_review and c.has_offer and c.has_poster)
    union all
    select c.id, 'loyalty_pitch', 2
    from candidates c
    where c.age >= interval '3 days' and c.age < interval '14 days'
      and c.never_subscribed and not c.has_loyalty
      and c.live
    union all
    select c.id, 'setup_nudge_2', 3
    from candidates c
    where c.age >= interval '5 days' and c.age < interval '14 days'
      and not (c.profile_ready and c.sent_for_review and c.has_offer and c.has_poster)
      and exists (
        select 1 from public.business_lifecycle_sends s
        where s.business_id = c.id and s.kind = 'setup_nudge_1'
          and s.sent_at < now() - interval '2 days'
      )
    union all
    select c.id, 'founding_places', 4
    from candidates c
    where c.age >= interval '7 days' and c.age < interval '21 days'
      and c.never_subscribed
      and c.live
    union all
    select c.id, 'results', 5
    from candidates c
    where c.age >= interval '14 days' and c.age < interval '28 days'
      and c.never_subscribed
      and c.live
    union all
    select c.id, 'check_in', 6
    from candidates c
    where c.age >= interval '21 days' and c.age < interval '35 days'
      and not (c.has_offer and c.has_poster)
  ),
  next_scheduled as (
    -- The first not yet sent, and only if nothing went in the last two days.
    select distinct on (s.id) s.id, s.kind
    from scheduled s
    join candidates c on c.id = s.id
    where not exists (
        select 1 from public.business_lifecycle_sends sent
        where sent.business_id = s.id and sent.kind = s.kind
      )
      -- By date, so a daily job running a little earlier than yesterday
      -- doesn't push an email back a further day.
      and (c.last_sent_at is null or c.last_sent_at::date <= current_date - 2)
    order by s.id, s.priority
  ),
  due_kinds as (
    select c.id, 'welcome'::text as kind
    from candidates c
    where c.age < interval '2 days'
    union all
    select c.id, 'trial_ending'
    from candidates c
    where c.trial_end is not null
    union all
    select n.id, n.kind from next_scheduled n
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
         -- The welcome and trial notice always go; the rest respect the
         -- owner's setting.
         and (cl.kind in ('welcome', 'trial_ending') or coalesce(ns.business_tips_enabled, true))),
      '{}'
    ),
    jsonb_build_object(
      'logo_url', c.logo_url,
      -- What to call each of them, by address. A business with two
      -- owners gets two emails, and greeting both by one name would
      -- address the wrong person half the time — so the name is looked
      -- up per recipient rather than carried once for the business.
      -- Null where they never told us, which reads as no greeting.
      'owner_names', coalesce(
        (select jsonb_object_agg(u.email::text, nullif(btrim(coalesce(u.raw_user_meta_data ->> 'full_name', '')), ''))
         from public.business_members m
         join auth.users u on u.id = m.user_id
         where m.business_id = cl.business_id
           and m.role = 'owner'
           and u.email is not null),
        '{}'::jsonb
      ),
      'has_offer', c.has_offer,
      'has_loyalty', c.has_loyalty,
      'has_poster', c.has_poster,
      'has_logo', c.has_logo,
      'has_description', c.has_description,
      'has_address', c.has_address,
      'has_hours', c.has_hours,
      'has_cover', c.has_cover,
      'profile_ready', c.profile_ready,
      'sent_for_review', c.sent_for_review,
      'trial_end', c.trial_end,
      'trial_has_card', coalesce(c.trial_has_card, true),
      'sample_offer', c.sample_offer,
      'sample_reward', c.sample_reward,
      'sample_stamps', c.sample_stamps,
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
$function$;
