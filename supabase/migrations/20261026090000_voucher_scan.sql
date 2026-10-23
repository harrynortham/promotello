-- Scan-to-redeem: a voucher's QR code opens /redeem/<code> for staff.
-- Returns the voucher only to members of the business that owns the offer,
-- with the customer's first name rather than their email. Marking it used
-- goes through the existing mark_redemption_used().

create or replace function public.staff_get_redemption(
  requested_code text
)
returns table (
  redemption_id uuid,
  redemption_code text,
  business_id uuid,
  business_name text,
  offer_title text,
  offer_discount text,
  offer_expires_at date,
  redeemed_at timestamptz,
  used_at timestamptz,
  customer_name text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    r.id,
    r.redemption_code,
    o.business_id,
    b.name,
    o.title,
    o.discount,
    o.expires_at,
    r.redeemed_at,
    r.used_at,
    nullif(split_part(coalesce(u.raw_user_meta_data ->> 'full_name', ''), ' ', 1), '')
  from public.offer_redemptions r
  join public.offers o on o.id = r.offer_id
  join public.businesses b on b.id = o.business_id
  join auth.users u on u.id = r.user_id
  where r.redemption_code = upper(trim(requested_code))
    and public.is_business_member(o.business_id, 'member');
$$;

revoke all on function public.staff_get_redemption(text) from public, anon;
grant execute on function public.staff_get_redemption(text) to authenticated;
