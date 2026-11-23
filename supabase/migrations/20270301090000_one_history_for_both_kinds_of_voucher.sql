-- A business could see every voucher claimed from an offer and none of
-- the gifts its own automations had sent. The Redemptions page reads
-- offer_redemptions and nothing else, so a welcome, birthday or
-- win-back reward was emailed, held up at the counter and marked used
-- without ever appearing on the business's side of the site -- which is
-- the one place an argument about it would be settled.
--
-- One view over both, so the tabs, the counts, the code search and the
-- pages cover a gift the same way they cover a claim.
--
-- security_invoker so the caller's own RLS still decides what they see.
-- Both tables already let a member of the business select (and a
-- customer their own), so nothing new is granted here: without it the
-- view would run as its owner and hand every business everyone's.

create or replace view public.business_voucher_history
with (security_invoker = true) as

select
    r.id,
    'offer'::text as source,
    o.business_id,
    r.offer_id,
    r.user_id,
    r.redemption_code as code,
    r.redeemed_at as claimed_at,
    r.used_at,
    -- Offers expire on a date and gifts at an instant. The page has
    -- always filtered by day, and the exact moment is still enforced
    -- where it matters, when staff try to mark one used.
    o.expires_at as expires_on,
    o.title,
    o.discount,
    o.description,
    o.terms
from public.offer_redemptions r
join public.offers o on o.id = r.offer_id

union all

select
    v.id,
    'gift',
    v.business_id,
    null::uuid,
    v.user_id,
    v.code,
    v.created_at,
    v.used_at,
    (v.expires_at at time zone 'Europe/London')::date,
    v.reward,
    case v.kind
        when 'welcome' then 'Welcome gift'
        when 'birthday' then 'Birthday treat'
        else 'Come-back gift'
    end,
    null::text,
    v.terms
from public.reward_vouchers v;

comment on view public.business_voucher_history is
    'Offer claims and automation gifts as one list, for the business Redemptions page. security_invoker: the caller''s RLS decides the rows.';

grant select on public.business_voucher_history to authenticated;

-- The same function, with the gifts added: a name for each row the page
-- is about to draw. Replaced rather than dropped, so it keeps the
-- grants it already has -- see docs/ENVIRONMENTS.md on what dropping
-- one costs.
create or replace function public.staff_redemption_customers(
    requested_business_id uuid,
    requested_ids uuid[]
)
returns table(redemption_id uuid, customer_name text)
language sql
stable
security definer
set search_path to 'public'
as $function$
  select
    r.id,
    nullif(split_part(coalesce(u.raw_user_meta_data ->> 'full_name', ''), ' ', 1), '')
  from public.offer_redemptions r
  join public.offers o on o.id = r.offer_id
  join auth.users u on u.id = r.user_id
  where o.business_id = requested_business_id
    and r.id = any(requested_ids)
    and public.is_business_member(requested_business_id, 'member')

  union all

  select
    v.id,
    nullif(split_part(coalesce(u.raw_user_meta_data ->> 'full_name', ''), ' ', 1), '')
  from public.reward_vouchers v
  join auth.users u on u.id = v.user_id
  where v.business_id = requested_business_id
    and v.id = any(requested_ids)
    and public.is_business_member(requested_business_id, 'member');
$function$;
