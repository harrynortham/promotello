-- A QR code for a business that isn't approved yet points at nothing.
-- record_qr_scan only matches an approved business, so the short link
-- falls through to the homepage: a poster in a window that goes nowhere,
-- and a scan that isn't even counted.
--
-- The dashboard stops offering it, but the dashboard is a suggestion.
-- This is the part that is true however the row is written.
--
-- Codes made before this keep working the moment their business is
-- approved, because the scan function matches on the current status
-- rather than anything stored on the code.

create or replace function public.enforce_qr_business_approved()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  status text;
begin
  select b.approval_status into status
  from public.businesses b
  where b.id = new.business_id;

  if status is distinct from 'approved' then
    -- Not P0004: that is the Free plan's one-code limit in this same
    -- table, and the two need different words in front of the business.
    raise exception using
      errcode = 'P0003',
      message = 'A QR code can be made once the business is approved. We check every new business, usually the same day.';
  end if;

  return new;
end;
$$;

revoke all on function public.enforce_qr_business_approved() from public, anon, authenticated;

drop trigger if exists qr_codes_require_approved_business on public.qr_codes;

-- Insert only: a business suspended later keeps its codes, and they stop
-- resolving on their own.
create trigger qr_codes_require_approved_business
before insert on public.qr_codes
for each row
execute function public.enforce_qr_business_approved();
