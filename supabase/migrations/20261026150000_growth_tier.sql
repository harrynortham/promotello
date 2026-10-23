-- Growth plan: everything in Pro plus Phase 2 features (automations,
-- quiet-hours offers, the monthly value report and events). The webhook
-- sets each subscription's tier from its Stripe price's lookup key.

alter table public.subscriptions
  add column if not exists tier text not null default 'pro'
    check (tier in ('pro', 'growth'));

-- Growth includes Pro, so business_has_pro() stays true for Growth.
create or replace function public.business_has_growth(
  requested_business_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.subscriptions
    where business_id = requested_business_id
      and tier = 'growth'
      and status in ('trialing', 'active', 'past_due')
  );
$$;

revoke all on function public.business_has_growth(uuid) from public, anon, authenticated;
