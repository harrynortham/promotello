-- What kind of offer it is.
--
-- "The offer" was one free-text box saved to offers.discount, so nothing
-- knew whether "20% off" was a percentage, a price or a freebie — and
-- "20% offer" went live because nobody could stop it being typed. The
-- form now asks for a type and only the numbers that type needs, and
-- builds the headline from them (lib/offer-kinds.ts).
--
-- discount stays. It is still the headline every other surface reads —
-- cards, the offer page, emails, posters, vouchers, the till — and none
-- of those change. This only adds what it was built from.
--
-- Existing rows are classified from their headline, first rule that
-- matches wins, in the order below: "£1 off pints" is a pound off pints,
-- not a £1 item called "off pints". The same rules are guessKind() in
-- lib/offer-kinds.ts, so a change here is a change there. Headlines are
-- not rewritten, with one exception: the "% offer" typo.

alter table public.offers
  add column if not exists kind text not null default 'other'
    check (kind in ('percent_off', 'money_off', 'two_for_one', 'multi_buy', 'fixed_price', 'freebie', 'other')),
  add column if not exists kind_value numeric(10,2),
  add column if not exists kind_quantity smallint,
  add column if not exists kind_item text;

comment on column public.offers.kind is
  'What kind of offer it is. The headline in discount is built from it: see lib/offer-kinds.ts.';
comment on column public.offers.kind_value is
  'The number in the headline: 20 for 20% off, 5.00 for £5 off or a £5 price.';
comment on column public.offers.kind_quantity is
  'multi_buy only: the 2 in "2 for £15".';
comment on column public.offers.kind_item is
  'What the offer is on: "pints", "pastry", "beard trim". Up to 24 characters.';

-- Backfill. Each step only looks at rows nothing has classified yet, which
-- is what makes the order above the order that wins.

-- 20% off, 20% off pints — and the "20% offer" typo, read as 20%.
with matched as (
  select id, regexp_match(discount, '^(\d+)\s*%\s*off(?:er)?\s*(.*)$', 'i') as parts
  from public.offers
  where kind = 'other'
)
update public.offers o
set kind = 'percent_off',
    kind_value = (m.parts[1])::numeric,
    kind_item = nullif(btrim(regexp_replace(m.parts[2], '\s+', ' ', 'g')), '')
from matched m
where m.id = o.id
  and m.parts is not null
  -- A number we can hold. Anything else is left for a person to read.
  and m.parts[1] ~ '^\d{1,8}$';

-- £5 off, £1 off pints, £5 off pp.
with matched as (
  select id, regexp_match(discount, '^£([\d.]+)\s*off\s*(.*)$', 'i') as parts
  from public.offers
  where kind = 'other'
)
update public.offers o
set kind = 'money_off',
    kind_value = (m.parts[1])::numeric,
    kind_item = nullif(btrim(regexp_replace(m.parts[2], '\s+', ' ', 'g')), '')
from matched m
where m.id = o.id
  and m.parts is not null
  and m.parts[1] ~ '^\d{1,8}(\.\d+)?$';

-- 2 for 1, 2 for 1 on cocktails.
update public.offers
set kind = 'two_for_one',
    kind_item = nullif(
      btrim(regexp_replace(
        coalesce((regexp_match(discount, '^2\s+for\s+1\s+(?:on\s+)?(.+)$', 'i'))[1], ''),
        '\s+', ' ', 'g'
      )),
      ''
    )
where kind = 'other'
  and discount ~* '^2\s+for\s+1(\s|$)';

-- 2 for £15.
with matched as (
  select id, regexp_match(discount, '^(\d+)\s+for\s+£([\d.]+)$', 'i') as parts
  from public.offers
  where kind = 'other'
)
update public.offers o
set kind = 'multi_buy',
    kind_quantity = (m.parts[1])::smallint,
    kind_value = (m.parts[2])::numeric
from matched m
where m.id = o.id
  and m.parts is not null
  and m.parts[1] ~ '^\d{1,4}$'
  and m.parts[2] ~ '^\d{1,8}(\.\d+)?$';

-- £1 cones, £8 beard trim.
with matched as (
  select id, regexp_match(discount, '^£([\d.]+)\s+(.+)$', 'i') as parts
  from public.offers
  where kind = 'other'
)
update public.offers o
set kind = 'fixed_price',
    kind_value = (m.parts[1])::numeric,
    kind_item = nullif(btrim(regexp_replace(m.parts[2], '\s+', ' ', 'g')), '')
from matched m
where m.id = o.id
  and m.parts is not null
  and m.parts[1] ~ '^\d{1,8}(\.\d+)?$';

-- Free coffee, Free late checkout.
with matched as (
  select id, regexp_match(discount, '^free\s+(.+)$', 'i') as parts
  from public.offers
  where kind = 'other'
)
update public.offers o
set kind = 'freebie',
    kind_item = nullif(btrim(regexp_replace(m.parts[1], '\s+', ' ', 'g')), '')
from matched m
where m.id = o.id
  and m.parts is not null;

-- "£10 credit" is not a £10 price.
update public.offers
set kind = 'other',
    kind_value = null,
    kind_quantity = null,
    kind_item = null
where kind <> 'other'
  and btrim(discount) ~* 'credit$';

-- A headline the rules read into a shape the table will refuse — an item
-- longer than it allows, a percentage over 100 — stays 'other' rather
-- than having somebody's words cut to fit. An admin can set its type by
-- hand, which is also how the leftovers get tidied.
update public.offers
set kind = 'other',
    kind_value = null,
    kind_quantity = null,
    kind_item = null
where not (
  case kind
    when 'percent_off' then kind_value is not null and kind_value between 1 and 100
    when 'money_off' then kind_value is not null and kind_value > 0
    when 'two_for_one' then true
    when 'multi_buy' then kind_value is not null and kind_value > 0
      and kind_quantity is not null and kind_quantity between 2 and 10
    when 'fixed_price' then kind_value is not null and kind_value > 0
      and btrim(coalesce(kind_item, '')) <> ''
    when 'freebie' then btrim(coalesce(kind_item, '')) <> ''
    else true
  end
  and char_length(coalesce(kind_item, '')) <= 24
);

-- The one headline that is rewritten: "20% offer" was always meant to be
-- "20% off". Every other row keeps the words customers have already read.
update public.offers
set discount = round(kind_value)::int || '% off' || coalesce(' ' || kind_item, '')
where kind = 'percent_off'
  and discount ~* '^\d+\s*%\s*offer';

alter table public.offers
  drop constraint if exists offers_kind_shape;

alter table public.offers
  add constraint offers_kind_shape check (
    case kind
      when 'percent_off' then kind_value is not null and kind_value between 1 and 100
      when 'money_off' then kind_value is not null and kind_value > 0
      when 'two_for_one' then true
      when 'multi_buy' then kind_value is not null and kind_value > 0
        and kind_quantity is not null and kind_quantity between 2 and 10
      when 'fixed_price' then kind_value is not null and kind_value > 0
        and btrim(coalesce(kind_item, '')) <> ''
      when 'freebie' then btrim(coalesce(kind_item, '')) <> ''
      else true
    end
    and char_length(coalesce(kind_item, '')) <= 24
  );

create index if not exists offers_kind on public.offers (kind);

-- An edit to a live offer waits in offer_edits, so the type waits there
-- too: it is part of what was promised. Rows already waiting are 'other'
-- with no numbers, which is what their headline is read as.
alter table public.offer_edits
  add column if not exists kind text not null default 'other'
    check (kind in ('percent_off', 'money_off', 'two_for_one', 'multi_buy', 'fixed_price', 'freebie', 'other')),
  add column if not exists kind_value numeric(10,2),
  add column if not exists kind_quantity smallint,
  add column if not exists kind_item text;

-- The same shape, checked when the edit is sent rather than when it is
-- approved: a raw constraint error belongs to the person who can fix it.
alter table public.offer_edits
  drop constraint if exists offer_edits_kind_shape;

alter table public.offer_edits
  add constraint offer_edits_kind_shape check (
    case kind
      when 'percent_off' then kind_value is not null and kind_value between 1 and 100
      when 'money_off' then kind_value is not null and kind_value > 0
      when 'two_for_one' then true
      when 'multi_buy' then kind_value is not null and kind_value > 0
        and kind_quantity is not null and kind_quantity between 2 and 10
      when 'fixed_price' then kind_value is not null and kind_value > 0
        and btrim(coalesce(kind_item, '')) <> ''
      when 'freebie' then btrim(coalesce(kind_item, '')) <> ''
      else true
    end
    and char_length(coalesce(kind_item, '')) <= 24
  );

-- The lengths offer_edits accepts were shorter than the form's own rules
-- (title 120 against 160, description and terms 2000 against 5000), so a
-- long edit to a live offer failed with a raw constraint error. The
-- headline stays at 60: a built one tops out well under it.
alter table public.offer_edits drop constraint if exists offer_edits_title_check;
alter table public.offer_edits add constraint offer_edits_title_check
  check (char_length(trim(both from title)) between 2 and 160);

alter table public.offer_edits drop constraint if exists offer_edits_description_check;
alter table public.offer_edits add constraint offer_edits_description_check
  check (char_length(trim(both from description)) between 2 and 5000);

alter table public.offer_edits drop constraint if exists offer_edits_terms_check;
alter table public.offer_edits add constraint offer_edits_terms_check
  check (char_length(trim(both from terms)) between 2 and 5000);

-- The five-argument version is gone: the type travels with the headline
-- it was built from, so there is no call that should send one without the
-- other.
drop function if exists public.submit_offer_edit(uuid, text, text, text, text);

create or replace function public.submit_offer_edit(
  requested_offer_id uuid,
  new_title text,
  new_description text,
  new_discount text,
  new_terms text,
  new_kind text,
  new_kind_value numeric,
  new_kind_quantity smallint,
  new_kind_item text
)
returns public.offer_edits
language plpgsql
security definer
set search_path = public
as $$
declare
  target public.offers;
  waiting public.offer_edits;
begin
  select * into target from public.offers where id = requested_offer_id;

  if target.id is null then
    raise exception using errcode = 'P0002', message = 'Offer not found';
  end if;

  if not public.is_business_member(target.business_id, 'admin') then
    raise exception using
      errcode = '42501',
      message = 'Only the people who run this business can change its offers';
  end if;

  -- An offer that is not live has nothing to protect: it is edited in
  -- place and reviewed as a whole.
  if target.approval_status is distinct from 'approved' then
    raise exception using
      errcode = 'P0003',
      message = 'This offer is not live, so it is edited directly rather than reviewed as a change';
  end if;

  delete from public.offer_edits
  where offer_id = requested_offer_id and decided_at is null;

  insert into public.offer_edits (
    offer_id, business_id, title, description, discount, terms,
    kind, kind_value, kind_quantity, kind_item, submitted_by
  )
  values (
    requested_offer_id,
    target.business_id,
    new_title,
    new_description,
    new_discount,
    new_terms,
    coalesce(new_kind, 'other'),
    new_kind_value,
    new_kind_quantity,
    new_kind_item,
    auth.uid()
  )
  returning * into waiting;

  return waiting;
end;
$$;

-- Approving copies the words and the type over together: the headline and
-- what it was built from are one change, never half of one.
create or replace function public.apply_offer_edit(edit_id uuid, decision text)
returns public.offer_edits
language plpgsql
security definer
set search_path = public
as $$
declare
  waiting public.offer_edits;
begin
  if not public.is_platform_admin() then
    raise exception using
      errcode = '42501',
      message = 'Platform administrator access is required';
  end if;

  if decision not in ('approved', 'rejected') then
    raise exception using errcode = '22023', message = 'Invalid decision';
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
      decision = apply_offer_edit.decision
  where id = edit_id
  returning * into waiting;

  return waiting;
end;
$$;

revoke all on function public.submit_offer_edit(uuid, text, text, text, text, text, numeric, smallint, text) from public, anon;
revoke all on function public.apply_offer_edit(uuid, text) from public, anon;
grant execute on function public.submit_offer_edit(uuid, text, text, text, text, text, numeric, smallint, text) to authenticated;
grant execute on function public.apply_offer_edit(uuid, text) to authenticated;

-- Changing the type changes what is promised, the same as changing the
-- headline, so the backstop treats it the same way: an offer whose type
-- is written directly goes back for review.
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
       or new.kind is distinct from old.kind
       or new.kind_value is distinct from old.kind_value
       or new.kind_quantity is distinct from old.kind_quantity
       or new.kind_item is distinct from old.kind_item
     )
     and not public.is_platform_admin() then
    new.approval_status := 'pending';
  end if;

  return new;
end;
$$;
