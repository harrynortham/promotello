-- Extend the existing offers table without deleting legacy offers.

alter table public.offers
  add column if not exists business_id uuid
    references public.businesses (id)
    on delete cascade;

alter table public.offers
  add column if not exists created_by uuid
    references auth.users (id)
    on delete restrict;

alter table public.offers
  add column if not exists approval_status text
    not null default 'approved'
    check (
      approval_status in (
        'pending',
        'approved',
        'rejected',
        'suspended'
      )
    );

alter table public.offers
  add column if not exists updated_at timestamptz
    not null default timezone('utc', now());

create index if not exists offers_business_id_idx
  on public.offers (business_id);

create index if not exists offers_approval_status_idx
  on public.offers (approval_status);

create index if not exists offers_expires_at_idx
  on public.offers (expires_at);

drop trigger if exists offers_set_updated_at on public.offers;

create trigger offers_set_updated_at
before update on public.offers
for each row
execute function public.set_updated_at();

alter table public.offers enable row level security;

drop policy if exists offers_public_select_approved on public.offers;

create policy offers_public_select_approved
on public.offers
for select
to anon, authenticated
using (
  approval_status = 'approved'
  and expires_at >= current_date
);

drop policy if exists offers_members_select_own on public.offers;

create policy offers_members_select_own
on public.offers
for select
to authenticated
using (
  business_id is not null
  and public.is_business_member(business_id, 'member')
);

drop policy if exists offers_insert_admins on public.offers;

create policy offers_insert_admins
on public.offers
for insert
to authenticated
with check (
  business_id is not null
  and public.is_business_member(business_id, 'admin')
  and created_by = auth.uid()
  and approval_status = 'pending'
);

drop policy if exists offers_update_admins on public.offers;

create policy offers_update_admins
on public.offers
for update
to authenticated
using (
  business_id is not null
  and public.is_business_member(business_id, 'admin')
)
with check (
  business_id is not null
  and public.is_business_member(business_id, 'admin')
  and approval_status in (
    'pending',
    'approved',
    'rejected',
    'suspended'
  )
);

drop policy if exists offers_delete_admins on public.offers;

create policy offers_delete_admins
on public.offers
for delete
to authenticated
using (
  business_id is not null
  and public.is_business_member(business_id, 'admin')
);