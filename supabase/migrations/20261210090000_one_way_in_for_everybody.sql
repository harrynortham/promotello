-- One way in, whoever built the page.
--
-- 20261207170000 split new businesses in two: one that signs itself up asked
-- for review on the way in, by the column's default, while a page we built
-- waited for the business to ask. The reasoning was that a business typing
-- its own words has already vouched for them.
--
-- It doesn't hold. A business that has just typed a name, a category and an
-- address has a page with no logo, no description worth reading, no hours
-- and no offer — and it was in the approval queue before it saw itself.
-- Worse, every screen since has had to know which kind of business it was
-- looking at, and so would every screen after it.
--
-- So nobody asks on the way in. Everybody fills the page in, looks at it,
-- and sends it: the same seven steps, the same queue, one thing to reason
-- about. The businesses that already asked keep their place in the queue.

alter table public.businesses
  alter column review_requested_at drop default;

-- Nothing writes the default now, so nothing has to undo it for a preview.
drop trigger if exists business_previews_clear_review_request on public.business_previews;
drop function if exists public.clear_review_request_for_preview();
