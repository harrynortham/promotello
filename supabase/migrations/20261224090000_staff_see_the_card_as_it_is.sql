-- Staff see the card the customer is holding out.
--
-- The stamping page described a card — a name, a count, a row of
-- circles in the default colours — while the customer's phone showed
-- the card the business designed. Two drawings of one thing, and the
-- one with the business's own colours on it was the one not being
-- looked at.
--
-- staff_get_loyalty_card() hands back what it takes to draw the real
-- one: the programme it belongs to, its colours, its stamp, its terms
-- and the business's logo. Nothing new is exposed — all of it is on the
-- business's own public page already.

drop function if exists public.staff_get_loyalty_card(text);

create function public.staff_get_loyalty_card(requested_code text)
returns table (
  card_id uuid,
  card_code text,
  program_id uuid,
  business_id uuid,
  business_name text,
  business_logo_url text,
  reward text,
  stamps_required integer,
  stamps integer,
  rewards_redeemed integer,
  last_stamped_at timestamptz,
  terms text,
  card_colour text,
  card_header text,
  card_accent text,
  stamp_icon text,
  customer_name text,
  is_own_card boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select
    c.id,
    c.card_code,
    p.id,
    p.business_id,
    b.name,
    b.logo_url,
    p.reward,
    p.stamps_required,
    c.stamps,
    c.rewards_redeemed,
    c.last_stamped_at,
    p.terms,
    p.card_colour,
    p.card_header,
    p.card_accent,
    p.stamp_icon,
    -- First name only: staff don't need the customer's email.
    nullif(
      split_part(
        coalesce(u.raw_user_meta_data ->> 'full_name', c.guest_name, ''),
        ' ',
        1
      ),
      ''
    ),
    c.user_id is not null and c.user_id = auth.uid()
  from public.loyalty_cards c
  join public.loyalty_programs p on p.id = c.program_id
  join public.businesses b on b.id = p.business_id
  left join auth.users u on u.id = c.user_id
  where c.card_code = upper(trim(requested_code))
    and public.is_business_member(p.business_id, 'member');
$$;

revoke all on function public.staff_get_loyalty_card(text) from public, anon;
grant execute on function public.staff_get_loyalty_card(text) to authenticated;
