-- A business's own cover photo for its profile banner and directory card.
-- Until one is set, pages fall back to the newest offer photo. Files live in
-- the business-logos bucket under the business's folder, so the existing
-- storage policies (owners and admins upload, anyone reads) already cover them.
-- Nullable with no default, so adding it doesn't rewrite the table.

alter table public.businesses
  add column if not exists cover_image_url text;
