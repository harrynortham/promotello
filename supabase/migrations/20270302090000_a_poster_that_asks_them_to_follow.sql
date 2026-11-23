-- Automations only reach followers, and almost nobody who visits
-- follows. A business had three things to point a poster at -- an
-- offer, a stamp card, or its page -- and none of them asks the one
-- question that puts somebody on the list a welcome, a birthday treat
-- and a win-back all go out to.
--
-- So: a fourth target. Scanning it follows the business, rather than
-- landing on a page that mentions following somewhere down the side.

alter table public.qr_codes
    add column if not exists follows boolean not null default false;

comment on column public.qr_codes.follows is
    'This poster asks to be followed: a scan goes to /follow/<business>, which does it.';

-- A code is pointed at one thing. These were already exclusive by
-- construction -- the actions null the others out -- and now it is
-- written down, because a follow code that also carried an offer id
-- would resolve to the offer and the poster would lie.
alter table public.qr_codes
    drop constraint if exists qr_codes_one_target;

alter table public.qr_codes
    add constraint qr_codes_one_target check (
        not follows or (offer_id is null and loyalty_program_id is null)
    );

-- Replaced rather than dropped: the return type is unchanged, so it
-- keeps the grants it has (docs/ENVIRONMENTS.md).
create or replace function public.record_qr_scan(
    requested_code text,
    requested_device text default 'other'
)
returns text
language plpgsql
security definer
set search_path to 'public'
as $function$
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
$function$;
