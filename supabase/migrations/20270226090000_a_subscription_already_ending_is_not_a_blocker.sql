-- A subscription already ending does not hold an account open.
--
-- Deleting an account is refused while a business you solely own is
-- still being billed, which is right: nobody should be able to walk
-- away from a card that is still being charged.
--
-- But the check read status alone, and closing a business does not
-- change status. It sets cancel_at_period_end, and the subscription
-- carries on reading 'trialing' or 'active' until the term it has
-- already been paid for runs out. So: close your business, which
-- cancels the subscription, then try to delete your account and be told
-- to go and cancel the subscription. On a founding trial that is ninety
-- days of being told to do something you have done.
--
-- A subscription set to cancel at period end will not charge again, so
-- it is not a reason to hold the account open. The ones that are still
-- live, and still could charge, block it exactly as before.

create or replace function public.account_deletion_check()
returns table(business_id uuid, business_name text, outcome text)
language sql
stable
security definer
set search_path = public
as $$
  select
    b.id,
    b.name,
    case
      when exists (
        select 1 from public.subscriptions s
        where s.business_id = b.id
          and s.status in ('trialing', 'active', 'past_due', 'unpaid', 'paused')
          and s.cancel_at_period_end is not true
      ) then 'cancel_subscription'
      when exists (
        select 1 from public.business_members other
        where other.business_id = b.id and other.user_id <> m.user_id
      ) then 'hand_over'
      else 'delete'
    end
  from public.business_members m
  join public.businesses b on b.id = m.business_id
  where m.user_id = auth.uid()
    and m.role = 'owner'
    and not exists (
      select 1 from public.business_members co
      where co.business_id = m.business_id
        and co.role = 'owner'
        and co.user_id <> m.user_id
    )
  order by b.name;
$$;
