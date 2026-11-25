-- Following a page the business has not claimed yet.
--
-- The business page for a lead carries no offers and no card -- there
-- is nothing to claim and nothing to redeem until they take it over.
-- What somebody can do is ask to hear about it, and that is worth more
-- than it looks: a handful of people already waiting is the most
-- persuasive thing we can put in front of a business that has not said
-- yes yet, and it is theirs the moment they claim the page.
--
-- Until now the insert refused anything but an approved business, so
-- the button on such a page would simply have failed.
--
-- The condition is the same one that makes those pages public in the
-- first place, kept in step deliberately: if a page can be read, it
-- can be followed, and when it stops being readable -- closed, or
-- never listed -- it stops being followable too.

drop policy if exists business_followers_insert_own on public.business_followers;

create policy business_followers_insert_own on public.business_followers
for insert
to authenticated
with check (
  user_id = (select auth.uid())
  and exists (
    select 1
    from public.businesses b
    where b.id = business_followers.business_id
      and b.demo_at is null
      and (
        b.approval_status = 'approved'
        or (
          b.approval_status = 'pending'
          and b.listed_at is not null
          and b.closed_at is null
        )
      )
  )
);
