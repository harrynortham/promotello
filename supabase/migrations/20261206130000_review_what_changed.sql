-- An edit only goes back for review when it changes what is promised.
--
-- Every edit used to, including swapping the photograph. An offer that is
-- being reviewed is hidden from customers, so a business fixing a blurry
-- picture took its own offer off the site, and the QR poster in its window
-- started landing people on the business page instead of the deal printed
-- on the sheet.
--
-- What is promised is the headline, the title, the description and the
-- terms. Those still go back.
--
-- What does not: the picture, and the availability line. The picture
-- cannot turn "20% off" into something else, and availability is already
-- inconsistent — a Growth business can change schedule_days, which moves
-- when the offer actually runs, without any review at all.
--
-- This is a narrowing, not a removal. A business still cannot rewrite an
-- approved offer into something nobody read.

create or replace function public.require_review_of_edited_offer()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.approval_status = 'approved'
     and new.approval_status = 'approved'
     and (
       new.title is distinct from old.title
       or new.description is distinct from old.description
       or new.discount is distinct from old.discount
       or new.terms is distinct from old.terms
     )
     and not public.is_platform_admin() then
    new.approval_status := 'pending';
  end if;

  return new;
end;
$$;
