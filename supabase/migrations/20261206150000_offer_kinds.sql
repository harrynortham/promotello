-- What kind of offer this is, beside the headline the business writes.
--
-- The headline stays the thing customers read, and nothing is rewritten.
-- The kind is the fact underneath it: "20% off" is a percentage and the
-- number is 20. A sentence cannot be filtered, sorted or handed to a
-- search engine; a kind and a number can.
--
-- A column with a check rather than an enum, so adding a kind later is a
-- one-line migration rather than a type change.

alter table public.offers
  add column if not exists kind text not null default 'other',
  add column if not exists kind_value numeric(10, 2);

alter table public.offers
  drop constraint if exists offers_kind_check;

alter table public.offers
  add constraint offers_kind_check
  check (kind in ('percent_off', 'money_off', 'fixed_price', 'multi_buy', 'freebie', 'other'));

alter table public.offers
  drop constraint if exists offers_kind_value_check;

-- A number only where the kind has one, and never a negative.
alter table public.offers
  add constraint offers_kind_value_check
  check (
    (kind_value is null)
    or (kind in ('percent_off', 'money_off', 'fixed_price') and kind_value > 0)
  );

-- Backfill, in this order: the first rule that matches wins, so
-- "£1 off pints" is money off rather than a £1 price. Checked against
-- every live headline in tests/unit/offer-kinds.test.ts.
update public.offers
set
  kind = case
    when discount ~* '^[0-9]+(\.[0-9]+)?\s*%\s*off' then 'percent_off'
    when discount ~* '^£[0-9]+(\.[0-9]+)?\s*off' then 'money_off'
    when discount ~* '^[0-9]+\s+for\s' then 'multi_buy'
    when discount ~* '^£[0-9]+(\.[0-9]+)?(\s|$)' then 'fixed_price'
    when discount ~* '^free(\s|$)' then 'freebie'
    else 'other'
  end,
  kind_value = case
    when discount ~* '^[0-9]+(\.[0-9]+)?\s*%\s*off'
      then (substring(discount from '^([0-9]+(?:\.[0-9]+)?)'))::numeric
    when discount ~* '^£[0-9]+(\.[0-9]+)?\s*off'
      then (substring(discount from '^£([0-9]+(?:\.[0-9]+)?)'))::numeric
    when discount ~* '^[0-9]+\s+for\s' then null
    when discount ~* '^£[0-9]+(\.[0-9]+)?(\s|$)'
      then (substring(discount from '^£([0-9]+(?:\.[0-9]+)?)'))::numeric
    else null
  end
where kind = 'other' and kind_value is null;

-- The one the parser gets wrong: credit on account is not a set price.
update public.offers
set kind = 'other', kind_value = null
where discount ~* '^£[0-9.]+\s*credit';
