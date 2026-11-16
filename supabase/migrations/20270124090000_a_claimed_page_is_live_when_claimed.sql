-- A page we built is live when they claim it
--
-- 20270113090000 took the wait out of a claimed preview but kept the
-- choice: the page went live the moment they pressed "Send your page for
-- review", rather than when we next looked. With the send gone
-- (20270123090000) there is no press left to hang it on, and inventing
-- one back would be the dead step returning under another name.
--
-- So the claim is the acceptance. We wrote the page, we read it before
-- we sent it, and they have just told us it is theirs. Nothing about
-- waiting a day after that makes it a better page.
--
-- The claim button used to promise "nothing goes public until you say
-- so", which is why it was safe to press. It cannot promise that any
-- more, and the pages that say it are changed in the same commit rather
-- than left making an offer the database no longer keeps.
--
-- The floor: a page missing the three things that make a listing queues
-- instead of publishing. We build these ourselves and they are complete,
-- so this should never fire — but a claim must not be able to put a page
-- with no address on the directory, whatever we did or didn't fill in.

-- The guard learns the same three.
--
-- prevent_unauthorized_business_approval is the only thing standing
-- between a business and approving itself — businesses_update_admins
-- lets a business admin write any approval_status onto their own row —
-- so it checks the facts rather than trusting the caller
-- (20270114090000, which says why a transaction-local flag would be a
-- hole). That stays exactly as it is.
--
-- What changes is "finished". It still read the old five, logo and cover
-- photo included, which the send button stopped requiring in
-- 20270121090000; this was the last copy of that rule, and it is the one
-- that decides whether a claim can go live. A page we built with no logo
-- would have been refused here and queued for nobody's benefit.
create or replace function public.prevent_unauthorized_business_approval()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.approval_status is distinct from new.approval_status
     and not public.is_platform_admin()
     and not (
       old.approval_status = 'pending'
       and new.approval_status = 'approved'
       and new.review_requested_at is not null
       and public.is_business_member(new.id, 'admin')
       and exists (
         select 1
         from public.business_previews p
         where p.business_id = new.id
           and p.claimed_at is not null
       )
       and coalesce(btrim(new.description), '') <> ''
       and exists (select 1 from public.business_locations l where l.business_id = new.id)
       and exists (select 1 from public.business_hours h where h.business_id = new.id)
     ) then
    raise exception using
      errcode = '42501',
      message = 'Only platform administrators can change business approval status';
  end if;

  return new;
end;
$$;

create or replace function public.claim_business_preview(requested_token uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  preview public.business_previews;
  ready boolean;
begin
  if auth.uid() is null then
    raise exception using errcode = '42501', message = 'Please sign in to claim this business.';
  end if;

  select * into preview
  from public.business_previews
  where token = requested_token
    and created_at > timezone('utc', now()) - interval '90 days'
  for update;

  if preview.business_id is null then
    raise exception using errcode = 'P0002', message = 'This link has expired. Get in touch and we''ll send a new one.';
  end if;

  if preview.claimed_at is not null then
    if preview.claimed_by = auth.uid() then
      return preview.business_id;
    end if;

    raise exception using errcode = '42501', message = 'This business has already been claimed.';
  end if;

  insert into public.business_members (business_id, user_id, role)
  values (preview.business_id, auth.uid(), 'owner')
  on conflict (business_id, user_id)
  do update set role = 'owner', updated_at = timezone('utc', now());

  delete from public.business_members
  where business_id = preview.business_id
    and user_id <> auth.uid();

  update public.business_previews
  set claimed_at = timezone('utc', now()), claimed_by = auth.uid()
  where business_id = preview.business_id;

  -- The same three as 20270123090000, and for the same reason.
  select
    coalesce(btrim(b.description), '') <> ''
    and exists (select 1 from public.business_locations l where l.business_id = b.id)
    and exists (select 1 from public.business_hours h where h.business_id = b.id)
  into ready
  from public.businesses b
  where b.id = preview.business_id;

  -- Asked for, either way: a complete page is accepted here, and an
  -- incomplete one joins the queue with everybody else.
  update public.businesses
  set review_requested_at = coalesce(review_requested_at, timezone('utc', now())),
      approval_status = case
        when coalesce(ready, false) then 'approved'
        else approval_status
      end,
      updated_at = timezone('utc', now())
  where id = preview.business_id
    and approval_status = 'pending'
    and closed_at is null;

  return preview.business_id;
end;
$$;
