-- Tracking who has been written to.
--
-- A preview already records whether it was opened and whether it was claimed.
-- What it could not say was whether it had been sent at all, or to which
-- address, so there was nothing to stop the same business being emailed
-- twice. These four columns make the previews page the outreach list.

alter table public.business_previews
  add column if not exists contact_email text,
  -- Null means it has been built but not sent. This is the column that
  -- answers "have I already emailed them?".
  add column if not exists contacted_at timestamptz,
  add column if not exists status text not null default 'to_send',
  add column if not exists notes text;

-- Claimed is not a status: it is claimed_at, and it is set by the business
-- rather than by us.
alter table public.business_previews
  drop constraint if exists business_previews_status_check;

alter table public.business_previews
  add constraint business_previews_status_check
  check (status in ('to_send', 'sent', 'replied', 'not_interested'));

comment on column public.business_previews.contacted_at is
  'When the preview link was sent. Null means built but not yet sent.';

-- The list is worked through in this order: what is still to send first.
create index if not exists business_previews_status_idx
  on public.business_previews (status, created_at desc);
