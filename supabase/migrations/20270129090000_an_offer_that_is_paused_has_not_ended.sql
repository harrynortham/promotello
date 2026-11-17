-- An offer that is paused has not ended
--
-- Every code whose offer did not resolve returned "?ended=offer", and
-- ScannedNote answers that with "That offer has ended. The poster you
-- scanned was for an offer that's finished."
--
-- Three different things arrive there and only one of them is finished.
-- An offer over the Free limit after a downgrade is paused, not ended:
-- it is still approved, it has not expired, and it comes straight back
-- if the business subscribes again. One pulled back into review has not
-- ended either. Telling somebody standing in the shop that it is
-- finished is untrue in both cases, and it tells them not to bother
-- looking again.
--
-- Found by walking a business through a downgrade in a browser: a
-- poster for an offer expiring in June 2027 was announcing to every
-- customer that it had finished.
--
-- So the reason travels with the scan. The page still lands them on the
-- business, with whatever is on now — that part was always right.
-- Nothing says why a plan lapsed: paused is paused.

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

    -- The business's plan lapsed and this offer is over the Free limit.
    -- Says nothing about why: that is between them and us.
    if offer_paused is not null then
      return business_path || '?ended=paused';
    end if;

    -- Pulled back into review, or never through it. Not ended either.
    if offer_status = 'pending' then
      return business_path || '?ended=checking';
    end if;

    -- Expired, rejected or suspended: gone, and not coming back.
    return business_path || '?ended=offer';
  end if;

  -- Deleted: the id went with the offer, the title stayed behind.
  if qr.former_target is not null then
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
