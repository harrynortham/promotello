-- A poster is made before the page is live
--
-- 20261206100000 refused to write a qr_codes row until the business was
-- approved, because a poster in a window that goes nowhere is worse than
-- no poster. That was right while approval was a day away and a business
-- had nothing else to do in the meantime. It is the wrong trade now that
-- the queue fills itself (20270123090000) and everything else in the
-- dashboard is open: the code is the one thing they could not make, and
-- making it is most of the work of getting a poster into a window.
--
-- Nothing is loosened downstream. record_qr_scan still matches on the
-- business's current status, so a code made today resolves to nothing
-- today and starts working the moment the page is approved, with no
-- backfill and no second trigger.

drop trigger if exists qr_codes_require_approved_business on public.qr_codes;

-- What a scan says while there is nothing to open.
--
-- The customer is standing in the shop with the poster in front of them,
-- so "that code isn't live yet" is true but useless — it reads as the
-- shop's mistake. The name turns it into a sentence about this business:
-- it is coming, come back. Nothing here is a leak: they are holding the
-- poster it is printed on.
--
-- Deliberately not a widened RLS policy. A pending business stays
-- unreadable to anonymous clients — that guarantee is the whole reason
-- any of this is safe — and this hands back one name, for one code
-- somebody has scanned.
create or replace function public.scan_fallback(requested_code text)
returns table (business_name text, reason text)
language sql
stable
security definer
set search_path = public
as $$
  select
    b.name,
    case
      when b.closed_at is not null then 'closed'
      when b.approval_status = 'suspended' then 'suspended'
      when b.approval_status = 'pending' then 'waiting'
      else 'unknown'
    end
  from public.qr_codes q
  join public.businesses b on b.id = q.business_id
  where q.code = lower(requested_code)
    and b.approval_status <> 'approved';
$$;

revoke all on function public.scan_fallback(text) from public;
grant execute on function public.scan_fallback(text) to anon, authenticated;
