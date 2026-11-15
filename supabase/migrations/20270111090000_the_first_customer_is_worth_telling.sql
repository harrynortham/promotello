-- The first customer is worth telling them about.
--
-- The funnel records first_qr_scan and first_customer_action — for the
-- admin page. Every single caller of notifyBusinessManagers is an
-- approval, an expiry, a stock alert or a billing problem. Not one is
-- good news about a customer.
--
-- So a business on Free finds out it is working by going to look, which
-- is backwards. The most persuasive message we will ever send is
-- "somebody just claimed your offer": free, true, and it arrives while
-- they are still deciding whether any of this is real
-- (docs/LAUNCH-FUNNEL.md).
--
-- A milestone is a thing that happens once. This is the ledger of them,
-- separate from business_lifecycle_sends on purpose: that table's
-- newest row also decides when the next setup email may go, so writing
-- a celebration into it would quietly push the next nudge back two
-- days.

create table if not exists public.business_milestones (
  business_id uuid not null references public.businesses (id) on delete cascade,
  kind text not null check (kind in ('first_customer')),
  reached_at timestamptz not null default timezone('utc', now()),
  primary key (business_id, kind)
);

comment on table public.business_milestones is
  'One row per business per milestone, ever. Claimed by claim_business_milestone() so the thing that notices first is the only one that tells them.';

alter table public.business_milestones enable row level security;

-- Nobody reads these from a browser: they are written with the service
-- role and read by the same code. A business that wants to know it has
-- a customer has the notification, the email and its own analytics.
create policy business_milestones_admin_select
on public.business_milestones
for select
to authenticated
using (public.is_platform_admin());

-- Claims a milestone, and says whether this call is the one that got it.
--
-- Two customers in the same second are two requests, and both would
-- otherwise read "not told yet" and send. The insert is the lock: only
-- one of them comes back true.
create or replace function public.claim_business_milestone(
  requested_business_id uuid,
  requested_kind text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  claimed boolean;
begin
  insert into public.business_milestones (business_id, kind)
  values (requested_business_id, requested_kind)
  on conflict (business_id, kind) do nothing
  returning true into claimed;

  return coalesce(claimed, false);
end;
$$;

revoke all on function public.claim_business_milestone(uuid, text) from public, anon, authenticated;

-- A business that already has customers has had its first one, and
-- being told about it now would be absurd. This backfills the ledger
-- from what has already happened, so nobody gets a "your first
-- customer" about something from last month.
insert into public.business_milestones (business_id, kind, reached_at)
select o.business_id, 'first_customer', min(r.redeemed_at)
from public.offer_redemptions r
join public.offers o on o.id = r.offer_id
where r.redeemed_at is not null
group by o.business_id
on conflict (business_id, kind) do nothing;

insert into public.business_milestones (business_id, kind, reached_at)
select p.business_id, 'first_customer', min(c.created_at)
from public.loyalty_cards c
join public.loyalty_programs p on p.id = c.program_id
group by p.business_id
on conflict (business_id, kind) do nothing;
