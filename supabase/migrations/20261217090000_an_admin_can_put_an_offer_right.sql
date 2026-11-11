-- An admin correcting an offer shouldn't take it off the site.
--
-- /admin/offers/<id> can set an offer's type and availability by hand —
-- the backfills left what their rules couldn't read alone, and that is
-- where it gets answered. The write went through the service key,
-- because there is no update policy on offers for platform admins, only
-- for the business's own people.
--
-- The service key has no auth.uid(), so is_platform_admin() is false
-- inside require_review_of_edited_offer(), and the exemption that rule
-- is written around didn't apply: correcting a live offer's type sent it
-- back to 'pending', which means invisible — the thing offer_edits was
-- built to stop happening.
--
-- This is the same shape as review_offer() and apply_offer_edit(): the
-- admin's own session calls a SECURITY DEFINER function, so RLS is out
-- of the way while auth.uid() is still theirs and both triggers see an
-- admin.

create or replace function public.admin_correct_offer(
  requested_offer_id uuid,
  new_kind text,
  new_kind_value numeric,
  new_kind_quantity smallint,
  new_kind_item text,
  new_discount text,
  new_availability text,
  new_available_days smallint[],
  new_available_from time,
  new_available_until time,
  new_audience text
)
returns public.offers
language plpgsql
security definer
set search_path = public
as $$
declare
  corrected public.offers;
begin
  if not public.is_platform_admin() then
    raise exception using
      errcode = '42501',
      message = 'Platform administrator access is required';
  end if;

  update public.offers
  set
    kind = new_kind,
    kind_value = new_kind_value,
    kind_quantity = new_kind_quantity,
    kind_item = new_kind_item,
    discount = new_discount,
    availability = new_availability,
    available_days = new_available_days,
    available_from = new_available_from,
    available_until = new_available_until,
    audience = new_audience
  where id = requested_offer_id
  returning * into corrected;

  if corrected.id is null then
    raise exception using errcode = 'P0002', message = 'Offer not found';
  end if;

  return corrected;
end;
$$;

-- The window the till enforces is deliberately not here: whether staff
-- are held to the times is the business's to ask for, on its own plan,
-- and enforce_offer_schedule_plan() would refuse it anyway.

revoke all on function public.admin_correct_offer(
  uuid, text, numeric, smallint, text, text, text, smallint[], time, time, text
) from public, anon;

grant execute on function public.admin_correct_offer(
  uuid, text, numeric, smallint, text, text, text, smallint[], time, time, text
) to authenticated;
