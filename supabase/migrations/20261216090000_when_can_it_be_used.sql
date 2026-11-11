-- When an offer can be used, and who it is for.
--
-- "Availability" was one free-text box, and businesses used it for three
-- different things — when ("Weekdays before 10am"), who ("First visit
-- only") and stock ("While stocks last") — so the line read differently
-- on every card. The form now asks when and who as pickers, and
-- availabilityLine() in lib/schedule.ts writes the line from the answers.
--
-- availability stays, as that built line. Every surface that prints it —
-- cards, the offer page, the voucher, the dashboard, admin — is
-- unchanged.
--
-- These are not the columns the till enforces. schedule_days,
-- schedule_start and schedule_end keep that job, and keep needing
-- Growth; the form writes them from these when the business ticks the
-- box. Nothing about offer_schedule_open(), mark_redemption_used() or
-- enforce_offer_schedule_plan() changes.

alter table public.offers
  add column if not exists available_days smallint[],
  add column if not exists available_from time,
  add column if not exists available_until time,
  add column if not exists audience text not null default 'everyone'
    check (audience in ('everyone', 'new_customers'));

comment on column public.offers.available_days is
  'Days it can be used, 0 (Sunday) to 6 (Saturday). Null means every day.';
comment on column public.offers.available_from is
  'Null means from opening. The line in availability is built from this: see lib/schedule.ts.';
comment on column public.offers.available_until is
  'Null means until closing.';
comment on column public.offers.audience is
  'Who it is for. Said on the card; not checked at the till.';

alter table public.offers
  drop constraint if exists offers_availability_check;

-- A day that isn't a day, or a window that ends before it starts, is
-- somebody's typo rather than an offer. One open end is fine: "until
-- 10am" and "from 5pm" are both real answers.
alter table public.offers
  add constraint offers_availability_check check (
    (
      available_days is null
      or (
        cardinality(available_days) between 1 and 7
        and available_days <@ array[0, 1, 2, 3, 4, 5, 6]::smallint[]
      )
    )
    and (
      available_from is null
      or available_until is null
      or available_from < available_until
    )
  );

-- An offer that already repeats on set days and times knows when it can
-- be used; that is what the pickers would have been filled in with. Its
-- line is left exactly as the business wrote it.
update public.offers
set available_days = schedule_days,
    available_from = schedule_start,
    available_until = schedule_end
where schedule_days is not null
  and available_days is null;

-- The three phrases that mean "any time", written three ways. Nothing
-- else is parsed: "Tuesday to Thursday evenings" is a sentence, not a
-- schedule, and guessing at it would put words in a business's mouth.
-- Those offers keep their line and get a type from the pickers the next
-- time anybody edits them — scripts/offer-availability-report.mjs lists
-- them.
update public.offers
set availability = 'Any time'
where available_days is null
  and available_from is null
  and available_until is null
  and lower(btrim(availability)) in ('available now', 'any time', 'any time we''re open')
  and availability is distinct from 'Any time';
