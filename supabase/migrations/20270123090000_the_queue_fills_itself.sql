-- The queue fills itself
--
-- A business finished a checklist, pressed "Send your page for review",
-- and then waited. The send was the one step on that list they could do
-- nothing about, and it sat exactly where enthusiasm peaks
-- (docs/LAUNCH-FUNNEL.md item 5, which took half of this).
--
-- Nothing about it was a decision. A page with a description, an address
-- and hours is a listing; a page without them is not, and no amount of
-- pressing a button changes which one it is. So the condition does the
-- asking, and the business gets on with the rest.
--
-- review_requested_at keeps its meaning — when this page asked to be
-- looked at — so everything reading it is untouched: the admin queue and
-- its count, the dashboard banner, the preview status, and
-- sent_for_review in the lifecycle emails. Only the cause changes.
--
-- The three are the same three as
-- 20270121090000_a_nudge_knows_what_actually_blocks.sql, which is the
-- same three the send button was locked behind. A fourth copy of that
-- rule is how the rule stops being one rule.
--
-- Set only, never unset. A business that deletes its only address while
-- it waits has still asked, and the reviewer can see what is in front of
-- them; clearing the stamp would both hide it and lose how long it has
-- been waiting.

create or replace function public.queue_business_if_ready(requested_business_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.businesses b
  set review_requested_at = timezone('utc', now())
  where b.id = requested_business_id
    and b.approval_status = 'pending'
    and b.review_requested_at is null
    and b.closed_at is null
    and coalesce(btrim(b.description), '') <> ''
    and exists (select 1 from public.business_locations l where l.business_id = b.id)
    and exists (select 1 from public.business_hours h where h.business_id = b.id);
end;
$$;

revoke all on function public.queue_business_if_ready(uuid) from public, anon, authenticated;

-- Two bodies rather than one that branches on tg_table_name: the row
-- that changed names the business in a different column each time, and
-- plpgsql resolves new.business_id when it prepares the expression, not
-- when the branch is taken — so a single function naming both columns
-- fails on whichever table lacks the other.
create or replace function public.queue_business_from_business()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.queue_business_if_ready(new.id);
  return null;
end;
$$;

create or replace function public.queue_business_from_profile_row()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.queue_business_if_ready(new.business_id);
  return null;
end;
$$;

revoke all on function public.queue_business_from_business() from public, anon, authenticated;
revoke all on function public.queue_business_from_profile_row() from public, anon, authenticated;

drop trigger if exists businesses_queue_when_ready on public.businesses;
drop trigger if exists business_locations_queue_when_ready on public.business_locations;
drop trigger if exists business_hours_queue_when_ready on public.business_hours;

-- Only the description can arrive on the business row itself; the other
-- two are rows in their own tables, and it is their existence that
-- counts rather than their contents, so an insert is the only moment
-- either can change the answer.
create trigger businesses_queue_when_ready
after insert or update of description on public.businesses
for each row
execute function public.queue_business_from_business();

create trigger business_locations_queue_when_ready
after insert on public.business_locations
for each row
execute function public.queue_business_from_profile_row();

create trigger business_hours_queue_when_ready
after insert on public.business_hours
for each row
execute function public.queue_business_from_profile_row();

-- Pages that were already finished and never sent. They are what this
-- migration is about: each one is a business that did the work and is
-- sitting behind a button nobody told them was the last step.
select public.queue_business_if_ready(id)
from public.businesses
where approval_status = 'pending'
  and review_requested_at is null
  and closed_at is null;
