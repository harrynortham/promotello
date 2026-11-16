-- A category picture is uploaded, not pasted
--
-- /admin/categories asked for an image URL, which meant the picture had
-- to already be hosted somewhere before it could be named here. There
-- is nowhere in the product that puts one there, so in practice the
-- field could only hold a link to somebody else's server — a picture we
-- do not control, on a page we do.
--
-- A bucket of our own, written only by platform admins and read by
-- anybody, so the uploader on that page has somewhere to put a file.
-- The same limits as the other image buckets: 5MB, and the three types
-- the cropper produces.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'category-images',
  'category-images',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "category_images_public_read" on storage.objects;
drop policy if exists "category_images_admin_upload" on storage.objects;
drop policy if exists "category_images_admin_update" on storage.objects;
drop policy if exists "category_images_admin_delete" on storage.objects;

-- The categories themselves are public, so their pictures are too.
create policy "category_images_public_read"
on storage.objects for select
using (bucket_id = 'category-images');

-- Writing is the whole platform's shop window, so it is ours alone.
-- is_platform_admin() is the same gate the categories table itself
-- uses, so a picture cannot be put somewhere its row could not be.
create policy "category_images_admin_upload"
on storage.objects for insert
to authenticated
with check (bucket_id = 'category-images' and public.is_platform_admin());

create policy "category_images_admin_update"
on storage.objects for update
to authenticated
using (bucket_id = 'category-images' and public.is_platform_admin())
with check (bucket_id = 'category-images' and public.is_platform_admin());

create policy "category_images_admin_delete"
on storage.objects for delete
to authenticated
using (bucket_id = 'category-images' and public.is_platform_admin());
