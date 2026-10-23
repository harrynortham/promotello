-- Links each business to its Stripe customer. Written server-side when a
-- business first starts checkout; webhooks resolve events through this table.
create table if not exists public.billing_customers (
  business_id uuid primary key
    references public.businesses (id)
    on delete cascade,

  stripe_customer_id text not null unique,

  created_at timestamptz not null default timezone('utc', now())
);

alter table public.billing_customers enable row level security;

create policy billing_customers_select_admins
on public.billing_customers
for select
to authenticated
using (
  public.is_business_member(business_id, 'admin')
);

-- Local mirror of Stripe subscriptions. Only the Stripe webhook writes here
-- (service role), so there are no client write policies.
create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),

  business_id uuid not null
    references public.businesses (id)
    on delete cascade,

  stripe_subscription_id text not null unique,
  stripe_customer_id text not null,

  status text not null
    check (status in (
      'incomplete',
      'incomplete_expired',
      'trialing',
      'active',
      'past_due',
      'canceled',
      'unpaid',
      'paused'
    )),

  price_id text,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  trial_end timestamptz,
  canceled_at timestamptz,

  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists subscriptions_business_id_idx
  on public.subscriptions (business_id);

alter table public.subscriptions enable row level security;

create policy subscriptions_select_members
on public.subscriptions
for select
to authenticated
using (
  public.is_business_member(business_id, 'member')
);

-- Stripe event IDs already processed, so redelivered events are skipped.
-- No policies: only reachable with the service role.
create table if not exists public.stripe_events (
  id text primary key,
  type text not null,
  processed_at timestamptz not null default timezone('utc', now())
);

alter table public.stripe_events enable row level security;
