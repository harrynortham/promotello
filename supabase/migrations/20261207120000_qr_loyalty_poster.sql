-- A poster for the loyalty card.
--
-- A code could open the business page or an offer. The card by the till
-- is the thing a business is actually selling — "collect 9 stamps, get a
-- free coffee" — and it had no poster of its own: a window poster about
-- offers, landing at the top of a page, was the closest thing.
--
-- A code can now point at the card, and the scan lands on the card
-- itself rather than the top of the page.

alter table public.qr_codes
  add column if not exists loyalty_program_id uuid
    references public.loyalty_programs (id) on delete set null;

alter table public.qr_codes
  drop constraint if exists qr_codes_one_target_check;

-- One code, one thing it opens.
alter table public.qr_codes
  add constraint qr_codes_one_target_check
  check (offer_id is null or loyalty_program_id is null);

create index if not exists qr_codes_loyalty_program_idx
  on public.qr_codes (loyalty_program_id)
  where loyalty_program_id is not null;

-- Scanning: an offer if it points at one and that offer is live, the
-- loyalty card if it points at one and that card is still being handed
-- out, and the business page otherwise — a poster in a window never
-- leads nowhere.
create or replace function public.record_qr_scan(requested_code text, requested_device text default 'other')
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  qr public.qr_codes;
  offer_slug text;
  loyalty_id uuid;
begin
  select q.*
  into qr
  from public.qr_codes q
  join public.businesses b
    on b.id = q.business_id
  where q.code = lower(requested_code)
    and q.archived_at is null
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

  -- Send scans for an offer that has ended or been paused to the business.
  if qr.offer_id is not null then
    select o.slug
    into offer_slug
    from public.offers o
    where o.id = qr.offer_id
      and o.approval_status = 'approved'
      and o.expires_at >= current_date
      and o.plan_paused_at is null;
  end if;

  if offer_slug is not null then
    return '/offers/' || offer_slug;
  end if;

  -- A card that is no longer handed out can't be joined, so a poster
  -- for it falls back to the business page like an ended offer.
  if qr.loyalty_program_id is not null then
    select p.id
    into loyalty_id
    from public.loyalty_programs p
    where p.id = qr.loyalty_program_id
      and p.is_active
      and p.closed_at is null;
  end if;

  if loyalty_id is not null then
    return '/businesses/' || qr.business_id || '#loyalty-' || loyalty_id;
  end if;

  return '/businesses/' || qr.business_id;
end;
$$;
