-- What the voucher is actually for.
--
-- staff_get_redemption() handed back the title and the discount, so the
-- person at the till could see "10% off" and nothing about what it covers
-- or what the offer says. The description and the terms are on the offer
-- already and are what settles a question at the counter — one per
-- customer, not with other offers, food only — so they come back with it.
--
-- Columns added at the end; everything before them is unchanged. Postgres
-- won't replace a function whose return type changes, so it is dropped
-- and made again, and its grants go back on afterwards.

drop function if exists public.staff_get_redemption(text);

create function public.staff_get_redemption(requested_code text)
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
  customer_name text,
  schedule_days smallint[],
  schedule_start time without time zone,
  schedule_end time without time zone,
  schedule_open boolean,
  offer_description text,
  offer_terms text
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
    nullif(split_part(coalesce(u.raw_user_meta_data ->> 'full_name', ''), ' ', 1), ''),
    o.schedule_days,
    o.schedule_start,
    o.schedule_end,
    public.offer_schedule_open(o.schedule_days, o.schedule_start, o.schedule_end),
    o.description,
    o.terms
  from public.offer_redemptions r
  join public.offers o on o.id = r.offer_id
  join public.businesses b on b.id = o.business_id
  join auth.users u on u.id = r.user_id
  where r.redemption_code = upper(trim(requested_code))
    and public.is_business_member(o.business_id, 'member');
$$;

revoke all on function public.staff_get_redemption(text) from public, anon;
grant execute on function public.staff_get_redemption(text) to authenticated, service_role;
