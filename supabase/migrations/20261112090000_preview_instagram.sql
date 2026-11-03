-- The Instagram account to message.
--
-- Plenty of independents have an Instagram account and no address worth
-- writing to, and a sole trader cannot be cold emailed at all. Without the
-- handle here, sending the DM means looking the account up by hand every
-- time, which is the step that gets skipped.
--
-- Stored bare and lowercased ("thebristolloaf"), with no @ and no URL, so it
-- can be dropped straight into a profile or message link.

alter table public.business_previews
  add column if not exists instagram_handle text;

alter table public.business_previews
  drop constraint if exists business_previews_instagram_handle_check;

-- Instagram allows letters, numbers, full stops and underscores, up to 30.
alter table public.business_previews
  add constraint business_previews_instagram_handle_check
  check (instagram_handle is null or instagram_handle ~ '^[a-z0-9._]{1,30}$');

comment on column public.business_previews.instagram_handle is
  'Bare lowercase Instagram handle, no @ or URL. Null means not found yet.';
