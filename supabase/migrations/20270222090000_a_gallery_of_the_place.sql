-- Photos of the place.
--
-- A business page shows one cover and nothing else of the premises. For
-- most of these businesses that is the weakest part of it: a coffee
-- shop is sold by the room, a barber by the work, a baker by the
-- counter at eight in the morning. They already shoot this every week
-- for Instagram.

create table if not exists public.business_photos (
    id uuid primary key default gen_random_uuid(),
    business_id uuid not null references public.businesses (id) on delete cascade,
    -- The path inside business-logos, not the public url. The url is
    -- built from it, so a bucket rename is one function rather than a
    -- migration over every row — and deleting a photo needs the path.
    storage_path text not null,
    -- Optional, and used as the image's alt text. These are content
    -- images on a public page; the fallback is in lib/business-photos.ts
    -- so the page is never left describing a photo as nothing.
    caption text,
    sort_order integer not null default 0,
    -- Set when a downgrade puts a photo beyond what the plan holds.
    -- Hidden, never deleted: the same promise offers and loyalty cards
    -- already make.
    plan_paused_at timestamptz,
    created_at timestamptz not null default timezone('utc', now()),
    created_by uuid references auth.users (id) on delete set null
);

create index if not exists business_photos_business_order_idx
    on public.business_photos (business_id, sort_order);

alter table public.business_photos enable row level security;

grant select on public.business_photos to anon, authenticated;
grant insert, update, delete on public.business_photos to authenticated;

-- Anyone can see the photos of a business that is live, as long as the
-- plan still holds them. The same sentence offers_public_select_approved
-- makes.
drop policy if exists business_photos_public_select on public.business_photos;

create policy business_photos_public_select
on public.business_photos
for select
to anon, authenticated
using (
    plan_paused_at is null
    and exists (
        select 1
        from public.businesses b
        where b.id = business_photos.business_id
          and b.approval_status = 'approved'
          and b.closed_at is null
    )
);

-- Its own team sees all of them, paused ones included, because the
-- dashboard has to show what it is holding.
drop policy if exists business_photos_member_select on public.business_photos;

create policy business_photos_member_select
on public.business_photos
for select
to authenticated
using (public.is_business_member(business_id, 'member'));

drop policy if exists business_photos_admin_write on public.business_photos;

create policy business_photos_admin_write
on public.business_photos
for all
to authenticated
using (public.is_business_member(business_id, 'admin'))
with check (public.is_business_member(business_id, 'admin'));

-- Platform admins can take one down. There is no review queue — the
-- business was approved before it went live, and twenty-five photos
-- from one of them should not be twenty-five things to click — so this
-- is the one lever for the one case that needs it.
drop policy if exists business_photos_platform_admin on public.business_photos;

create policy business_photos_platform_admin
on public.business_photos
for all
to authenticated
using (public.is_platform_admin())
with check (public.is_platform_admin());

-- ---------------------------------------------------------------------------
-- What each plan holds.
-- ---------------------------------------------------------------------------

-- Must match FREE_PHOTO_LIMIT and PRO_PHOTO_LIMIT in lib/business-photos.ts.
create or replace function public.photo_plan_limit(requested_business_id uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
    select case when public.business_has_pro(requested_business_id) then 25 else 5 end;
$$;

grant execute on function public.photo_plan_limit(uuid) to anon, authenticated;

-- The limit is here rather than in the form. The form reads the same
-- numbers so the button can be disabled before anybody tries, but a
-- limit that only exists in a React component is a limit anybody can
-- step round with a fetch.
--
-- Shaped on enforce_offer_plan_limit() in 20261023110000.
create or replace function public.enforce_photo_plan_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
    held integer;
    allowed integer;
begin
    -- A paused photo is one the plan is already not showing, so it does
    -- not count against the plan.
    if new.plan_paused_at is not null then
        return new;
    end if;

    if tg_op = 'UPDATE' and old.plan_paused_at is null and old.business_id = new.business_id then
        return new;
    end if;

    -- Serialise concurrent uploads for this business, so two at once
    -- cannot both read four and both insert a fifth.
    perform 1 from public.businesses where id = new.business_id for update;

    allowed := public.photo_plan_limit(new.business_id);

    select count(*)
    into held
    from public.business_photos p
    where p.business_id = new.business_id
      and p.id <> new.id
      and p.plan_paused_at is null;

    if held >= allowed then
        raise exception using
            errcode = 'P0004',
            message = case
                when allowed = 25
                    then 'Pro holds 25 photos. Remove one to add another.'
                else 'The Free plan holds 5 photos. Upgrade to Pro for 25.'
            end;
    end if;

    return new;
end;
$$;

drop trigger if exists business_photos_enforce_plan_limit on public.business_photos;

create trigger business_photos_enforce_plan_limit
before insert or update on public.business_photos
for each row
execute function public.enforce_photo_plan_limit();

-- ---------------------------------------------------------------------------
-- A downgrade hides, it never deletes.
-- ---------------------------------------------------------------------------

-- apply_business_plan already pauses offers on a downgrade and unpauses
-- them on upgrade, and the Stripe webhook calls it after every
-- subscription sync. Photos join it rather than getting a second hook
-- that could run at a different time and disagree.
create or replace function public.apply_business_plan(
  requested_business_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.business_has_pro(requested_business_id) then
    update public.offers
    set plan_paused_at = null
    where business_id = requested_business_id
      and plan_paused_at is not null;

    -- Everything they uploaded comes back, in the order they had it in.
    update public.business_photos
    set plan_paused_at = null
    where business_id = requested_business_id
      and plan_paused_at is not null;

    return;
  end if;

  -- On Free, keep the newest live offer and pause the rest.
  update public.offers
  set plan_paused_at = now()
  where business_id = requested_business_id
    and plan_paused_at is null
    and approval_status in ('pending', 'approved')
    and expires_at >= current_date
    and id <> (
      select o.id
      from public.offers o
      where o.business_id = requested_business_id
        and o.plan_paused_at is null
        and o.approval_status in ('pending', 'approved')
        and o.expires_at >= current_date
      order by o.created_at desc
      limit 1
    );

  -- On Free, keep the first few they put in front and pause the rest.
  -- By sort_order rather than by date: the order they arranged is the
  -- order they would choose to lose from, and the one they dragged to
  -- the front is the one they care about most.
  update public.business_photos
  set plan_paused_at = now()
  where business_id = requested_business_id
    and plan_paused_at is null
    and id not in (
      select p.id
      from public.business_photos p
      where p.business_id = requested_business_id
        and p.plan_paused_at is null
      order by p.sort_order, p.created_at
      limit public.photo_plan_limit(requested_business_id)
    );
end;
$$;

-- ---------------------------------------------------------------------------
-- A business can delete its own files.
-- ---------------------------------------------------------------------------

-- business-logos had insert and update policies and no delete one, so
-- removing a photo took the row out and left the file behind — silently,
-- since storage refuses without raising anything the page was reading.
--
-- The same shape as business_logos_business_admin_upload in
-- 20261023100000: the first folder of the path is the business id, and
-- you have to be an owner or admin of that business.
drop policy if exists business_logos_business_admin_delete on storage.objects;

create policy business_logos_business_admin_delete
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'business-logos'
  and exists (
    select 1
    from public.business_members bm
    where bm.business_id::text = (storage.foldername(objects.name))[1]
      and bm.user_id = (select auth.uid())
      and bm.role in ('owner', 'admin')
  )
);
