-- The deleted-offer case, which 20261207130000 missed.
--
-- That migration decided the reason from qr_codes.offer_id, but deleting an
-- offer is exactly what sets offer_id to null — so the one case the work was
-- for, a poster whose offer has been deleted, fell through to the business
-- page with nothing said. former_target is the only thing left that knows
-- the code was printed for an offer, so it is what the reason is read from.

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
    select o.slug
    into offer_slug
    from public.offers o
    where o.id = qr.offer_id
      and o.approval_status = 'approved'
      and o.expires_at >= current_date
      and o.plan_paused_at is null;

    if offer_slug is not null then
      return '/offers/' || offer_slug;
    end if;

    -- Ended, paused, or pulled back into review.
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
