-- A decline says why.
--
-- review_business() and review_offer() took a decision and nothing else,
-- so there was nowhere to put the reason even when there was one. The
-- business got an email listing what the reason *might* have been, a
-- notification claiming "we've emailed you why", and a red chip. Then it
-- replied to ask, and we had to remember.
--
-- Two columns and three functions fix that. The code goes on the row;
-- the sentences live in lib/review-reasons.ts, so the wording can be
-- improved without a migration. The note is the part written about this
-- business in particular, and it is what the business reads first.
--
-- The old two-argument functions stay, delegating, so nothing in flight
-- breaks while the app deploys. They can only approve or suspend now:
-- a decline without a reason is the thing being removed.

alter table public.businesses
  add column if not exists review_reason text,
  add column if not exists review_note text;

alter table public.offers
  add column if not exists review_reason text,
  add column if not exists review_note text;

alter table public.offer_edits
  add column if not exists review_reason text,
  add column if not exists review_note text;

comment on column public.businesses.review_reason is
  'Why it was not approved. A code from lib/review-reasons.ts, which holds the words.';

comment on column public.businesses.review_note is
  'What we wrote about this business in particular. Read by its owners.';

comment on column public.offers.review_reason is
  'Why it was not approved. A code from lib/review-reasons.ts, which holds the words.';

comment on column public.offers.review_note is
  'What we wrote about this offer in particular. Read by the business.';

-- The set of codes is not constrained here on purpose: it is copy, it
-- will grow, and a migration per wording change is how the words stop
-- being improved. The shape is constrained, so a stray sentence or a
-- whole paragraph can never land in the code column.
do $$
begin
  alter table public.businesses
    add constraint businesses_review_reason_shape
    check (review_reason is null or review_reason ~ '^[a-z][a-z-]{1,39}$');
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  alter table public.offers
    add constraint offers_review_reason_shape
    check (review_reason is null or review_reason ~ '^[a-z][a-z-]{1,39}$');
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  alter table public.offer_edits
    add constraint offer_edits_review_reason_shape
    check (review_reason is null or review_reason ~ '^[a-z][a-z-]{1,39}$');
exception
  when duplicate_object then null;
end
$$;

-- ---------------------------------------------------------------------
-- The reviews themselves

create or replace function public.review_business(
  business_id uuid,
  decision text,
  reason text,
  note text
)
returns public.businesses
language plpgsql
security definer
set search_path = public
as $$
declare
  reviewed_business public.businesses;
  tidy_reason text := nullif(btrim(coalesce(reason, '')), '');
  tidy_note text := nullif(btrim(coalesce(note, '')), '');
begin
  if not public.is_platform_admin() then
    raise exception using
      errcode = '42501',
      message = 'Platform administrator access is required';
  end if;

  if decision not in ('approved', 'rejected', 'suspended') then
    raise exception using
      errcode = '22023',
      message = 'Invalid business decision';
  end if;

  -- A decline with no reason is what this migration exists to stop.
  if decision = 'rejected' and tidy_reason is null then
    raise exception using
      errcode = '22023',
      message = 'Say why it was not approved';
  end if;

  if decision = 'rejected' and tidy_reason = 'other' and tidy_note is null then
    raise exception using
      errcode = '22023',
      message = 'Write what to tell them';
  end if;

  update public.businesses
  set
    approval_status = decision,
    -- Approving clears it: a business that was turned down and then put
    -- right must not keep last month's reason on its dashboard.
    review_reason = case when decision = 'approved' then null else tidy_reason end,
    review_note = case when decision = 'approved' then null else left(tidy_note, 400) end,
    updated_at = timezone('utc', now())
  where id = business_id
  returning * into reviewed_business;

  if reviewed_business.id is null then
    raise exception using
      errcode = 'P0002',
      message = 'Business not found';
  end if;

  return reviewed_business;
end;
$$;

-- Kept so a page served before this deploy keeps working. It cannot
-- decline: that now needs a reason.
create or replace function public.review_business(business_id uuid, decision text)
returns public.businesses
language plpgsql
security definer
set search_path = public
as $$
begin
  if decision = 'rejected' then
    raise exception using
      errcode = '22023',
      message = 'Say why it was not approved';
  end if;

  return public.review_business(business_id, decision, null, null);
end;
$$;

create or replace function public.review_offer(
  offer_id uuid,
  decision text,
  reason text,
  note text
)
returns public.offers
language plpgsql
security definer
set search_path = public
as $$
declare
  reviewed_offer public.offers;
  business_name text;
  business_status text;
  tidy_reason text := nullif(btrim(coalesce(reason, '')), '');
  tidy_note text := nullif(btrim(coalesce(note, '')), '');
begin
  if not public.is_platform_admin() then
    raise exception using
      errcode = '42501',
      message = 'Platform administrator access is required';
  end if;

  if decision not in ('approved', 'rejected', 'suspended') then
    raise exception using
      errcode = '22023',
      message = 'Invalid offer decision';
  end if;

  if decision = 'rejected' and tidy_reason is null then
    raise exception using
      errcode = '22023',
      message = 'Say why it was not approved';
  end if;

  if decision = 'rejected' and tidy_reason = 'other' and tidy_note is null then
    raise exception using
      errcode = '22023',
      message = 'Write what to tell them';
  end if;

  -- An offer can only be approved once its business is: the public
  -- policy already requires that, so approving early published nothing
  -- and left the business reading "Approved" on an offer no one could
  -- reach (20261206110000).
  if decision = 'approved' then
    select b.name, b.approval_status into business_name, business_status
    from public.offers o
    join public.businesses b on b.id = o.business_id
    where o.id = offer_id;

    if business_status is distinct from 'approved' then
      raise exception using
        errcode = 'P0003',
        message = format(
          'Approve the business first: %s is %s.',
          coalesce(business_name, 'the business'),
          coalesce(business_status, 'not approved')
        );
    end if;
  end if;

  update public.offers
  set
    approval_status = decision,
    review_reason = case when decision = 'approved' then null else tidy_reason end,
    review_note = case when decision = 'approved' then null else left(tidy_note, 400) end,
    updated_at = timezone('utc', now())
  where id = offer_id
  returning * into reviewed_offer;

  if reviewed_offer.id is null then
    raise exception using
      errcode = 'P0002',
      message = 'Offer not found';
  end if;

  return reviewed_offer;
end;
$$;

create or replace function public.review_offer(offer_id uuid, decision text)
returns public.offers
language plpgsql
security definer
set search_path = public
as $$
begin
  if decision = 'rejected' then
    raise exception using
      errcode = '22023',
      message = 'Say why it was not approved';
  end if;

  return public.review_offer(offer_id, decision, null, null);
end;
$$;

-- An edit to a live offer is answered on its own, so the offer never
-- leaves the site (docs/OFFER-EDIT-REVIEW.md). Turning the new wording
-- down now says what was wrong with it.
create or replace function public.apply_offer_edit(
  edit_id uuid,
  decision text,
  reason text,
  note text
)
returns public.offer_edits
language plpgsql
security definer
set search_path = public
as $$
declare
  waiting public.offer_edits;
  tidy_reason text := nullif(btrim(coalesce(reason, '')), '');
  tidy_note text := nullif(btrim(coalesce(note, '')), '');
begin
  if not public.is_platform_admin() then
    raise exception using
      errcode = '42501',
      message = 'Platform administrator access is required';
  end if;

  if decision not in ('approved', 'rejected') then
    raise exception using errcode = '22023', message = 'Invalid decision';
  end if;

  if decision = 'rejected' and tidy_reason is null then
    raise exception using
      errcode = '22023',
      message = 'Say why it was not approved';
  end if;

  if decision = 'rejected' and tidy_reason = 'other' and tidy_note is null then
    raise exception using
      errcode = '22023',
      message = 'Write what to tell them';
  end if;

  select * into waiting from public.offer_edits where id = edit_id;

  if waiting.id is null then
    raise exception using errcode = 'P0002', message = 'Edit not found';
  end if;

  if waiting.decided_at is not null then
    raise exception using errcode = 'P0003', message = 'That edit has already been answered';
  end if;

  if decision = 'approved' then
    -- require_review_of_edited_offer exempts platform admins, so this
    -- does not send the offer back to pending.
    update public.offers
    set
      title = waiting.title,
      description = waiting.description,
      discount = waiting.discount,
      terms = waiting.terms,
      kind = waiting.kind,
      kind_value = waiting.kind_value,
      kind_quantity = waiting.kind_quantity,
      kind_item = waiting.kind_item
    where id = waiting.offer_id;
  end if;

  update public.offer_edits
  set decided_at = timezone('utc', now()),
      decided_by = auth.uid(),
      decision = apply_offer_edit.decision,
      review_reason = case when apply_offer_edit.decision = 'approved' then null else tidy_reason end,
      review_note = case when apply_offer_edit.decision = 'approved' then null else left(tidy_note, 400) end
  where id = edit_id
  returning * into waiting;

  return waiting;
end;
$$;

create or replace function public.apply_offer_edit(edit_id uuid, decision text)
returns public.offer_edits
language plpgsql
security definer
set search_path = public
as $$
begin
  if decision = 'rejected' then
    raise exception using
      errcode = '22023',
      message = 'Say why it was not approved';
  end if;

  return public.apply_offer_edit(edit_id, decision, null, null);
end;
$$;

revoke all on function public.review_business(uuid, text, text, text) from public, anon;
revoke all on function public.review_offer(uuid, text, text, text) from public, anon;
revoke all on function public.apply_offer_edit(uuid, text, text, text) from public, anon;

grant execute on function public.review_business(uuid, text, text, text) to authenticated;
grant execute on function public.review_offer(uuid, text, text, text) to authenticated;
grant execute on function public.apply_offer_edit(uuid, text, text, text) to authenticated;

-- ---------------------------------------------------------------------
-- The trail
--
-- audit_logs recorded that something was rejected and what it was before.
-- The one thing worth knowing afterwards — why — was the thing missing.
-- Extended from the deployed version (20261023100000) rather than
-- rewritten: every other branch is unchanged.

create or replace function public.audit_entity_changes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  audit_action text;
  audit_entity_type text;
  audit_business_id uuid;
  audit_metadata jsonb;
begin
  if tg_table_name = 'businesses' then
    audit_entity_type := 'business';
    audit_business_id := new.id;

    if tg_op = 'INSERT' then
      audit_action := 'business_created';
      audit_metadata := jsonb_build_object(
        'name', new.name,
        'category', new.category
      );
    elsif old.approval_status is distinct from new.approval_status then
      audit_action := case new.approval_status
        when 'approved' then 'business_approved'
        when 'rejected' then 'business_rejected'
        when 'suspended' then 'business_suspended'
        else 'business_created'
      end;

      audit_metadata := jsonb_build_object(
        'previous_status', old.approval_status,
        'new_status', new.approval_status,
        'reason', new.review_reason,
        'note', new.review_note
      );
    else
      return new;
    end if;

  elsif tg_table_name = 'offers' then
    audit_entity_type := 'offer';
    audit_business_id := new.business_id;

    if tg_op = 'INSERT' then
      audit_action := 'offer_created';
      audit_metadata := jsonb_build_object(
        'title', new.title,
        'category', new.category
      );
    elsif old.approval_status is distinct from new.approval_status then
      audit_action := case new.approval_status
        when 'approved' then 'offer_approved'
        when 'rejected' then 'offer_rejected'
        when 'suspended' then 'offer_suspended'
        else 'offer_created'
      end;

      audit_metadata := jsonb_build_object(
        'previous_status', old.approval_status,
        'new_status', new.approval_status,
        'reason', new.review_reason,
        'note', new.review_note
      );
    else
      return new;
    end if;

  elsif tg_table_name = 'business_invitations' then
    audit_entity_type := 'invitation';
    audit_business_id := new.business_id;

    if tg_op = 'INSERT' then
      audit_action := 'invitation_created';
      audit_metadata := jsonb_build_object(
        'email', new.email,
        'role', new.role
      );
    elsif old.accepted_at is null
      and new.accepted_at is not null then
      audit_action := 'invitation_accepted';
      audit_metadata := jsonb_build_object(
        'email', new.email,
        'role', new.role
      );
    else
      return new;
    end if;

  elsif tg_table_name = 'offer_redemptions' then
    audit_entity_type := 'redemption';

    select business_id
    into audit_business_id
    from public.offers
    where id = new.offer_id;

    if tg_op = 'INSERT' then
      audit_action := 'redemption_created';
      audit_metadata := jsonb_build_object(
        'offer_id', new.offer_id,
        'redemption_code', new.redemption_code
      );
    elsif old.used_at is null
      and new.used_at is not null then
      audit_action := 'redemption_used';
      audit_metadata := jsonb_build_object(
        'offer_id', new.offer_id,
        'redemption_code', new.redemption_code
      );
    else
      return new;
    end if;

  else
    return new;
  end if;

  insert into public.audit_logs (
    actor_user_id,
    business_id,
    action,
    entity_type,
    entity_id,
    metadata
  )
  values (
    auth.uid(),
    audit_business_id,
    audit_action,
    audit_entity_type,
    new.id,
    audit_metadata
  );

  return new;
end;
$$;
