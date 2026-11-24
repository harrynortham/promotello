-- "Enjoyed it? Leave us a review."
--
-- A business asking a customer for a Google review has, until now, had
-- to ask out loud across a counter, which is the hardest thing in
-- retail to do well. A code on the till does the asking.
--
-- Almost none of this is new. /review/<business_id> already counts the
-- click and forwards to Google (record_review_click), the poster
-- designer already draws, colours and sizes a sheet, and `follows` is
-- the pattern for a code that points at something which is not an offer
-- and not a card. This adds the fourth target and lets it through the
-- Free plan's gate.
--
-- Free on purpose. A review poster costs us nothing, it is worth having
-- whether or not the business ever pays us, and it puts our QR code in
-- their window — which is the cheapest advertising this product has.

alter table public.qr_codes
  add column if not exists reviews boolean not null default false;

comment on column public.qr_codes.reviews is
  'A code that asks for a Google review. Resolves to /review/<business_id>, which counts the click and forwards.';

-- ---------------------------------------------------------------------------
-- One target, still
-- ---------------------------------------------------------------------------

alter table public.qr_codes drop constraint if exists qr_codes_one_target;

alter table public.qr_codes
  add constraint qr_codes_one_target
  check (
    (case when follows then 1 else 0 end)
    + (case when reviews then 1 else 0 end)
    + (case when offer_id is not null then 1 else 0 end)
    + (case when loyalty_program_id is not null then 1 else 0 end)
    <= 1
  );

-- ---------------------------------------------------------------------------
-- The layouts a sheet may be drawn in
-- ---------------------------------------------------------------------------
--
-- Three for a review, and `follow`, which has been missing since the
-- follow poster was built: POSTER_LAYOUTS has offered it the whole
-- time, the designer offers nothing else on a follow code, and the
-- insert has been failing this constraint and showing the business a
-- plain "couldn't create". A bug, found while adding the row below it.

alter table public.qr_codes drop constraint if exists qr_codes_poster_layout_check;

alter table public.qr_codes
  add constraint qr_codes_poster_layout_check
  check (
    poster_layout = any (array[
      'classic', 'code_first', 'bold', 'minimal',
      'stamp_card', 'stamp_strip',
      'follow',
      'review_quiet', 'review_bold', 'review_code_first'
    ])
  );

-- ---------------------------------------------------------------------------
-- Where a scan goes
-- ---------------------------------------------------------------------------
--
-- One branch, beside the one `follows` already has. /review counts the
-- click against the business and forwards to whatever google_review_url
-- holds; with no link set it falls through to the business page, which
-- is the same thing the profile link has always done.

create or replace function public.record_qr_scan(requested_code text, requested_device text default 'other')
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  qr public.qr_codes;
  business_path text;
  offer_slug text;
  offer_paused timestamptz;
  offer_status text;
  loyalty_id uuid;
begin
  -- An archived code is no longer listed, but it is still printed on
  -- whatever it was printed on, so it still resolves and still counts.
  select q.*
  into qr
  from public.qr_codes q
  join public.businesses b
    on b.id = q.business_id
  where q.code = lower(requested_code)
    and b.approval_status = 'approved';

  if qr.id is null then
    return null;
  end if;

  insert into public.qr_scans (qr_code_id, device)
  values (
    qr.id,
    case
      when requested_device in ('mobile', 'tablet', 'desktop') then requested_device
      else 'other'
    end
  );

  business_path := '/businesses/' || qr.business_id;

  if qr.archived_at is not null then
    return business_path || '?ended=poster';
  end if;

  -- Before the rest: a follow poster carries neither of the others, and
  -- the scan is meant to do the thing rather than describe it.
  if qr.follows then
    return '/follow/' || qr.business_id;
  end if;

  -- The same, for a review. source=qr is what tells the two apart in
  -- the analytics: a scan from a poster, rather than a click from the
  -- business's own page.
  if qr.reviews then
    return '/review/' || qr.business_id || '?source=qr';
  end if;

  if qr.offer_id is not null then
    -- The row rather than a filtered slug, so the reason can be told
    -- apart. All three used to come back as "?ended=offer", and the
    -- page says "That offer has ended" — which is false of an offer
    -- that is merely paused, and of one that is still being checked.
    -- Both can come back; "ended" tells somebody not to bother again.
    select o.slug, o.plan_paused_at, o.approval_status
    into offer_slug, offer_paused, offer_status
    from public.offers o
    where o.id = qr.offer_id
      and o.expires_at >= current_date;

    if offer_slug is not null
       and offer_status = 'approved'
       and offer_paused is null then
      return '/offers/' || offer_slug;
    end if;

    return business_path || '?ended=offer';
  end if;

  if qr.loyalty_program_id is not null then
    select p.id
    into loyalty_id
    from public.loyalty_programs p
    where p.id = qr.loyalty_program_id
      and p.is_active
      and p.closed_at is null;

    if loyalty_id is not null then
      return business_path || '#loyalty-' || loyalty_id;
    end if;

    return business_path || '?ended=card';
  end if;

  return business_path;
end;
$$;

revoke all on function public.record_qr_scan(text, text) from public;
grant execute on function public.record_qr_scan(text, text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Free gets these, and they do not use up the one
-- ---------------------------------------------------------------------------
--
-- The Free plan includes one QR code, and a business that spends it on
-- a review poster has nothing left for its offer or its card — which
-- would mean the businesses this is for could not have it. So review
-- codes sit outside that count entirely, and carry a limit of their own:
-- three, which is a window, a till and a table.

create or replace function public.enforce_qr_plan_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  other_active integer;
begin
  if new.archived_at is not null then
    return new;
  end if;

  if tg_op = 'UPDATE' and old.archived_at is null then
    return new;
  end if;

  if public.business_has_pro(new.business_id) then
    return new;
  end if;

  perform 1 from public.businesses where id = new.business_id for update;

  -- A review code is counted against review codes and nothing else, in
  -- both directions: it does not spend the Free code, and the Free code
  -- does not stop it.
  if new.reviews then
    select count(*)
    into other_active
    from public.qr_codes
    where business_id = new.business_id
      and id <> new.id
      and archived_at is null
      and reviews;

    if other_active >= 3 then
      raise exception using
        errcode = 'P0005',
        message = 'Three review posters is the limit on Free: one for the window, one for the till, one for a table.';
    end if;

    return new;
  end if;

  select count(*)
  into other_active
  from public.qr_codes
  where business_id = new.business_id
    and id <> new.id
    and archived_at is null
    and not reviews;

  if other_active >= 1 then
    raise exception using
      errcode = 'P0004',
      message = 'The Free plan includes 1 QR code. Upgrade to Pro for a code in every spot.';
  end if;

  return new;
end;
$$;
