-- Refunds, disputes and early fraud warnings on subscription payments.
-- Written by the Stripe webhook (service role); reviewed by platform admins.
create table if not exists public.billing_alerts (
  id uuid primary key default gen_random_uuid(),

  business_id uuid
    references public.businesses (id)
    on delete set null,

  type text not null
    check (type in ('refund', 'dispute', 'early_fraud_warning')),

  stripe_event_id text not null unique,
  stripe_charge_id text not null,
  stripe_subscription_id text,

  amount integer not null,
  currency text not null,
  reason text,
  livemode boolean not null,

  resolved_at timestamptz,
  resolved_by uuid
    references auth.users (id)
    on delete set null,

  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists billing_alerts_business_id_idx
  on public.billing_alerts (business_id);

create index if not exists billing_alerts_created_at_idx
  on public.billing_alerts (created_at desc);

alter table public.billing_alerts enable row level security;

drop policy if exists billing_alerts_platform_admin_select on public.billing_alerts;

create policy billing_alerts_platform_admin_select
on public.billing_alerts
for select
to authenticated
using (
  public.is_platform_admin()
);

drop policy if exists billing_alerts_platform_admin_update on public.billing_alerts;

create policy billing_alerts_platform_admin_update
on public.billing_alerts
for update
to authenticated
using (
  public.is_platform_admin()
)
with check (
  public.is_platform_admin()
);
