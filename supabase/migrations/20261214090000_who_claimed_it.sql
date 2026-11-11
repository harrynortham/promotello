-- Who is standing there.
--
-- The redemptions list reads offer_redemptions directly, and names live
-- in auth.users, which a business cannot read — so every voucher in the
-- list was anonymous while the same voucher opened by its code showed a
-- name. This closes that gap for a page of vouchers at a time.
--
-- A first name and nothing else, exactly as staff_get_redemption() does
-- it, and exactly what the privacy policy promises: "businesses see your
-- first name on vouchers and loyalty cards you use with them".

create or replace function public.staff_redemption_customers(
  requested_business_id uuid,
  requested_ids uuid[]
)
returns table (
  redemption_id uuid,
  customer_name text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    r.id,
    nullif(split_part(coalesce(u.raw_user_meta_data ->> 'full_name', ''), ' ', 1), '')
  from public.offer_redemptions r
  join public.offers o on o.id = r.offer_id
  join auth.users u on u.id = r.user_id
  where o.business_id = requested_business_id
    and r.id = any(requested_ids)
    and public.is_business_member(requested_business_id, 'member');
$$;

revoke all on function public.staff_redemption_customers(uuid, uuid[]) from public, anon;
grant execute on function public.staff_redemption_customers(uuid, uuid[]) to authenticated;
