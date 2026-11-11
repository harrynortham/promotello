# Offer availability: the spec

Follows `docs/OFFER-TYPES-SPEC.md` and uses the same idea: the business
answers structured questions, and we write the line customers read.

## The problem

"Availability" on the offer form is free text saved to
`offers.availability`. Businesses use it for three different things —
when ("Weekdays before 10am"), who ("First visit only") and stock ("While
stocks last") — in whatever words occur to them, so the line reads
differently on every card.

The form also asks "when" a second time: the quiet-hours widget
(`components/offer-schedule-fields.tsx`, Growth only) takes days and a
time window and enforces them at the till. A Free business types the same
thing as text and nothing checks it. Customers can't tell which is which.

## The outcome

1. One "when" picker and one "who" picker for every business, whatever
   the plan. No free-text availability.
2. One function writes the line, so every offer says it the same way.
3. Growth keeps what it pays for: the window **enforced at the till**.
   That becomes a tick-box on the same picker rather than a separate
   widget.

## What the business sees

Replacing the Availability input and the quiet-hours block in
`components/offer-fields.tsx` (shared by new and edit):

**When can it be used?** (radio, required, default the first)

- *Any time you're open*
- *Certain days* — the existing day chips
- *Certain days and times* — day chips, plus From and Until. Either time
  may be left empty ("until 10am", "from 5pm"); at least one is needed.

**Who is it for?** (radio, default the first)

- *Everyone*
- *New customers only*

**Only let staff redeem it at these times** (checkbox, shown when "when"
is not *Any time*)

- Growth: ticking it enforces the window at the till, as quiet hours do
  now. Hint: "Customers can claim it any time. Staff can only mark it
  used inside these times (UK time)."
- Other plans: shown locked, with the existing "Available on Growth" link
  to billing. The days and times themselves are **not** locked.

Under the pickers, the line as customers will read it: "On your card:
**Mon–Fri, until 10am**".

Stock ("while stocks last") is the Maximum redemptions field's job.
Anything else unusual belongs in the terms.

## The line

`availabilityLine({ days, from, until, audience })` in `lib/schedule.ts`
(already pure and unit-testable), reusing `formatDays` and `formatTime`:

| Days | Times | Line |
| --- | --- | --- |
| – | – | `Any time` |
| Mon–Fri | – | `Weekdays` |
| – | 2pm–4pm | `Every day, 2pm–4pm` |
| Mon–Fri | until 10am | `Weekdays, until 10am` |
| Sat, Sun | from 5pm | `Weekends, from 5pm` |
| Mon–Thu | 2pm–4pm | `Mon–Thu, 2pm–4pm` |

New customers only appends ` · New customers only` (so `Any time · New
customers only`). All seven days chosen is the same as none.

Monday to Friday is **Weekdays** and Saturday with Sunday is
**Weekends**: businesses write them that way already — four live offers
say "Weekdays" — so the picker gives back the words they would have
typed. Any other set is a list or a range, as above. This naming is
`availabilityLine()` only: `formatSchedule()` is the window the till
enforces and keeps saying `Mon–Fri`, because that is a list of days
staff are held to rather than a phrase on a card.

Nothing else assembles this line. The form preview, `offerRow()`, the
sample data and the tests all call `availabilityLine`.

## Data model

One migration, named to sort after the newest file in
`supabase/migrations/` (filenames run ahead of the calendar).

```sql
alter table public.offers
  add column available_days smallint[],   -- null = every day; 0 (Sun) to 6 (Sat)
  add column available_from time,         -- null = from opening
  add column available_until time,        -- null = until closing
  add column audience text not null default 'everyone'
    check (audience in ('everyone', 'new_customers'));
```

Checks: `available_days`, when set, has 1–7 entries from 0–6; when both
times are set, `available_from < available_until`.

`availability` stays, as the built line. Every surface that prints it —
cards, the offer page, the wallet voucher, the dashboard offers list,
admin — is unchanged.

### Enforcement reuses the schedule columns

`schedule_days`, `schedule_start`, `schedule_end`, `offer_schedule_open`,
`mark_redemption_used`, the till page and `enforce_offer_schedule_plan`
are **not changed**. They remain "the window the till enforces".

When the enforce box is ticked, `offerRow()` writes the schedule columns
from the availability ones, filling the gaps the schedule check doesn't
allow:

- no days chosen → all seven
- no From → `00:00`
- no Until → `23:59:59`

When it isn't ticked, or "when" is *Any time*, all three are null. The
existing plan trigger still refuses a schedule from a non-Growth
business, so the lock is enforced by the database as it is today.

## Existing offers

In the migration:

- An offer with a schedule: copy `schedule_days/start/end` into
  `available_days/from/until`. Leave its `availability` text alone.
- An offer whose text is "Available now", "Any time" or "Any time we're
  open" (case-insensitive): set `availability` to `Any time`.
- Everything else: structured columns stay null and the text stays as
  written. Do not try to parse "Tuesday to Thursday evenings".

An offer is **legacy** when its stored `availability` differs from
`availabilityLine()` of its stored columns. No extra flag.

- Edit form, legacy offer: the pickers open on the stored columns, with a
  note above them: "Customers currently see: “Weekdays before 10am”.
  Choose the days and times below and saving will replace it." Saving
  always writes the built line.
- `scripts/offer-availability-report.mjs` (service-role key, in the style
  of `scripts/sample-data.mjs`) lists every legacy offer with its
  business and current text, so they can be tidied by hand.
- Admin: on `/admin/offers/[offerId]`, the correction form added for
  offer types also takes when and who, so a legacy line can be fixed
  without the business. Availability is not one of the reviewed fields
  (`docs/OFFER-EDIT-REVIEW.md`), and that doesn't change: these save
  straight to a live offer.

`scripts/sample-data/*.mjs`: each sample offer gets `days`, `from`,
`until` and `audience` written by hand in place of its `availability`
string ("Weekdays before 10am" → Mon–Fri, until 10:00; "First visit
only" → new customers), and the script builds the line.

## Form details

- `offerSchema()` drops `availability` and gains the when/who fields and
  the enforce flag. Errors sit under the field that caused them, in the
  voice of `lib/validation.ts`: "Pick at least one day.", "Add a start or
  an end time.", "Choose an end time after the start time."
- The quiet-hours widget's hidden-input/`scheduleFromForm` path goes; the
  fields are part of the react-hook-form schema like the rest.
  `components/offer-schedule-fields.tsx` is removed or reduced to the day
  chips, whichever leaves less behind.
- The live preview card in `new-offer-form.tsx` shows the built line; its
  "Available now" placeholder becomes "Any time".
- Switching "when" back to *Any time* clears days, times and the enforce
  box on save.
- Copy that names quiet hours (`lib/plan-features.ts`, plan comparison,
  help, FAQ, how-it-works) is read through once: "Quiet-hours offers"
  still means the enforced window, and nothing should now imply that
  days and times need Growth.

## Tests

- `tests/unit/` for `availabilityLine`: every row of the table above,
  both audiences, seven days equal to none, and the schedule-column
  mapping (gaps filled, nulls when not enforced).
- `tests/e2e/create-offer.spec.ts`: an offer saved with days and an
  until-time has the right columns and line; one with new customers only.
- `tests/e2e/growth.spec.ts`: the quiet-hours cases go through the new
  enforce box and still block redemption outside the window; a non-Growth
  business can set days and times but not tick the box.
- `tests/e2e/owner-edit.spec.ts`: a legacy offer shows the note, and
  saving replaces its line.
- `tests/global-setup.ts`: seeded offers use built lines.

`npm run lint`, `npm run test:unit` and `npm run build` pass; the e2e
specs above pass.

## Not in this build

- An "Available today" or "Open now" filter on `/offers`. The columns
  make it possible; it is its own piece of work.
- Checking "new customers only" at the till.
- Several windows on one offer (lunch and evening). One window; a second
  is a second offer.
- Date ranges inside the offer's life ("this weekend"). Expiry date
  covers it.
- Any change to how redemption checks the schedule.

When it's built: note it in `docs/ROADMAP.md` and add a line to
`CLAUDE.md` under the `offers` table.
