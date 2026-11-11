# Offer types: the spec

`docs/OFFER-TYPES.md` is the scope: why, the live headlines, the backfill
rules. This is what to build. Where the two disagree, this wins.

## The problem

"The offer" on the new-offer form is one free-text box, saved to
`offers.discount`. Businesses mistype it ("20% offer"), nothing knows what
kind of offer it is, and customers cannot filter by kind.

## The outcome

1. A business **picks a type** and fills in only what that type needs. We
   write the headline, so it cannot be mistyped.
2. Customers can **filter `/offers` by type**.
3. Every existing offer has a type.

## The types

| `kind` | Picker label | Inputs | Headline we build | Filter label | `?type=` |
| --- | --- | --- | --- | --- | --- |
| `percent_off` | Percentage off | percent (whole, 1–100); what on (optional) | `20% off` / `20% off pints` | % off | `percent-off` |
| `money_off` | Money off | amount £; what on (optional) | `£5 off` / `£5 off pints` | Money off | `money-off` |
| `two_for_one` | 2 for 1 | what on (optional) | `2 for 1` / `2 for 1 on cocktails` | 2 for 1 | `2-for-1` |
| `multi_buy` | Multi-buy | quantity (2–10); price £ | `2 for £15` | Multi-buy | `multi-buy` |
| `fixed_price` | Set price | price £; what (required) | `£8 beard trim` | Set price | `set-price` |
| `freebie` | Something free | what (required) | `Free pastry` | Freebies | `freebie` |
| `other` | Something else | headline, free text, up to 30 characters | as written | not offered | – |

- Money prints without trailing zeros: `£5`, `£2.50`. Never `£5.00`.
- "What" / "what on" is up to 24 characters, trimmed, no line breaks.
- There is **no free-text override** on the six real types. "Something
  else" is the escape hatch, with a hint under it: "Use this only if none
  of the others fit. It won't appear in the type filter."
- One type per offer. No stacking.

## Data model

One migration. **Migration filenames run ahead of the calendar** — name it
to sort after the newest file in `supabase/migrations/`, not by today's
date.

```sql
alter table public.offers
  add column kind text not null default 'other'
    check (kind in ('percent_off','money_off','two_for_one','multi_buy','fixed_price','freebie','other')),
  add column kind_value numeric(10,2),   -- 20 for 20%, 5.00 for £5 off / a £5 price
  add column kind_quantity smallint,     -- multi_buy only: the 2 in "2 for £15"
  add column kind_item text;             -- "pastry", "pints", "beard trim"
```

A text column with a check, not a Postgres enum, so adding a type is a
one-line migration.

Shape checks (one table constraint, `offers_kind_shape`):

- `percent_off`: `kind_value` between 1 and 100
- `money_off`, `fixed_price`: `kind_value` > 0
- `multi_buy`: `kind_value` > 0 and `kind_quantity` between 2 and 10
- `fixed_price`, `freebie`: `kind_item` not blank
- `kind_item`, where present, at most 24 characters

`discount` stays. It remains the headline every other surface reads —
cards, offer page, emails, posters, vouchers, the till page, admin — and
**none of those change**. The form now writes it from the type fields.

Index: `create index offers_kind on public.offers (kind);`

### One source for the headline

New file `lib/offer-kinds.ts`, importing nothing from Next.js or Supabase
(same rule as `lib/listing-filters.ts`, so it unit tests on its own):

- `OFFER_KINDS`: the table above as data — kind, picker label, filter
  label, slug, which inputs it takes.
- `offerHeadline({ kind, value, quantity, item, text })` → the string.
- `kindFromSlug(slug)` / `slugOfKind(kind)`.
- `guessKind(headline)` → `{ kind, value, quantity, item }`, the backfill
  rules below, used by the sample data and the tests.

The form preview, `offerRow()`, the sample-data script and the tests all
call `offerHeadline`. Nothing else assembles a headline.

The database does not rebuild the headline: every new offer and every
edit to a live one is already read by a person, and the admin pages will
show the type beside the headline (below). The check constraint stops
impossible shapes.

## Backfill

In the same migration, classify existing rows from `discount`. First rule
that matches wins, in this order (`£1 off pints` is money off, not a £1
price):

```
^(\d+)\s*%\s*off(?:er)?\s*(.*)$   → percent_off, value, item = rest    ("20% offer" → 20)
^£([\d.]+)\s*off\s*(.*)$           → money_off, value, item = rest      ("£5 off pp")
^2\s+for\s+1\b                     → two_for_one
^(\d+)\s+for\s+£([\d.]+)$          → multi_buy, quantity, value
^£([\d.]+)\s+(.+)$                 → fixed_price, value, item = rest    ("£1 cones")
^free\s+(.+)$                      → freebie, item = rest
anything else                      → other
```

All case-insensitive. Then, in the same migration:

- Any row whose headline ends in `credit` goes back to `other` ("£10
  credit" is not a £10 price).
- **Do not rewrite `discount`** for existing rows, except the one known
  typo: a `percent_off` row whose headline matches `% offer` becomes
  `N% off`.
- A row the rules would classify but which would break `offers_kind_shape`
  (an item over 24 characters, a percentage over 100) stays `other`.
  Add the constraint after the backfill.

After migrating, print every offer's `discount → kind, value, quantity,
item` (a `scripts/offer-kinds-report.mjs` using the service-role key, in
the style of `scripts/sample-data.mjs`) so the result can be read by a
person. Expect a handful of `other` ("3rd half price", "Flight for £8",
"3rd night free").

`scripts/sample-data/*.mjs` and `scripts/sample-data.mjs`: each sample
offer gets its kind fields via `guessKind`, so re-seeding doesn't produce
a table of `other`.

## The business form

`components/offer-fields.tsx` is shared by new and edit; change it once.

Replace the single "The offer" input with:

1. **Type of offer** (required): a native `<select>` like `CategorySelect`,
   id `kind`, with "Choose a type" as the empty first option. No default
   on a new offer.
2. The inputs for the chosen type, shown only once a type is chosen, in
   the same grid cell: `#kindValue` (number; `%` or `£` shown as a prefix
   or suffix beside it), `#kindQuantity`, `#kindItem`, or `#discount` for
   "Something else".
3. Under them, the headline as it will appear: "On your card: **20% off
   pints**".

Rules:

- `offerSchema()` gains `kind`, `kindValue`, `kindQuantity`, `kindItem`;
  `discount` becomes required only when `kind === "other"` (max 30). Use
  `superRefine` so each error lands under its own field, written the way
  `lib/validation.ts` writes them ("Enter a percentage between 1 and
  100.", "Enter what's free, like pastry or side.").
- `offerRow()` returns `kind`, `kind_value`, `kind_quantity`, `kind_item`
  and `discount: offerHeadline(...)`. Inputs a type doesn't use are saved
  as null, so switching type never leaves a stale number behind.
- The live preview card in `new-offer-form.tsx` shows the built headline;
  its placeholder becomes "Your offer" (it says "Your discount" today).
- Examples under the field change with the type, replacing today's single
  hint line.
- The edit form loads the four new columns and fills the inputs. An offer
  backfilled as `other` opens on "Something else" with its headline in
  the box, and can be moved to a real type.

### Edits to a live offer

The type is part of what's promised, so it follows the existing rule in
`docs/OFFER-EDIT-REVIEW.md`:

- `offer_edits` gains `kind`, `kind_value`, `kind_quantity`, `kind_item`
  (existing waiting rows: `other`, nulls).
- `submit_offer_edit` takes the four new arguments; `apply_offer_edit`
  copies them onto the offer with the headline. The old five-argument
  `submit_offer_edit` is dropped, with revoke/grant redone for the new
  signature.
- `require_review_of_edited_offer` also treats a change to any of the four
  as a rewrite.
- `edit-offer-form.tsx`: a changed kind field counts as `rewritten`, and
  the four are held back from the direct update with title, discount,
  description and terms.

**Fix while there (existing bug):** `offer_edits` checks title ≤ 120,
headline ≤ 60, description and terms ≤ 2000, but `offerSchema` allows 160,
100, 5000 and 5000 — so a long edit to a live offer fails with a raw
constraint error. Widen the `offer_edits` checks to title 160,
description 5000, terms 5000; leave headline at 60 (built headlines top
out well under it).

## The customer side

`/offers` and `/offers/<city>` (`offers-listing.tsx`):

- `ListingOffer` gains `kind`; `getLiveOffers` selects it.
- `filterOffers` takes `kind?: string`. An unknown or missing `?type=`
  filters nothing (never an empty page from a bad link).
- A **"Type of offer"** section in the existing `FilterDrawer`, between
  "Sort by" and "Area": "Any type" first, then each type **that has at
  least one offer in the current city and category**, with its count
  (`FilterOption.count`). `other` is never listed. With fewer than two
  types to show, the section is left out.
- Read `docs/MULTI-CITY.md` first: counts are of the listing already
  narrowed to the city, the way `areasFrom` is fed.
- `?type=` survives search, category, area and sort, and resets `show`,
  like the other filters: add it to `SearchParams`, the `PageProps` in
  `offers/page.tsx`, `hasFilters`, the `hidden` fields of `OffersSearch`,
  and the empty-state line ("Try a different search, category, type or
  area.").
- The drawer trigger already names what's chosen; the type's filter label
  joins it.

Free-text search keeps matching `discount`, so "2 for 1" typed into
search still works.

## Admin

- `/admin/offers/[offerId]`: a "Type" row above the headline row (labelled
  "Discount" today; rename to "Headline").
- `/admin/offers` Edits tab: type in the side-by-side diff.
- An admin can correct an offer's type from `/admin/offers/[offerId]` — a
  small form with the same inputs, saving the four columns and the
  rebuilt headline. Admins are already exempt from the review trigger.
  This is how the backfill's `other` rows get tidied.

## Tests

- `tests/unit/offer-kinds.test.ts`: `offerHeadline` for every type
  (including `£2.50`, optional item present and absent), slugs round-trip,
  `guessKind` over the headlines listed in `docs/OFFER-TYPES.md` and the
  sample data.
- `tests/unit/listing-filters.test.ts`: `kind` filter; unknown kind
  ignored; combined with category and area.
- `tests/e2e/create-offer.spec.ts`: `fillOffer` picks a type and a number
  instead of typing `#discount`; assert the saved row's `kind`,
  `kind_value` and `discount`. One case for "Something else".
- `tests/e2e/owner-edit.spec.ts` / `forms.spec.ts`: changing the type of a
  live offer queues an edit and the live offer keeps its old type until
  approved.
- `tests/e2e/filters.spec.ts`: the type section appears, filters, and
  survives a category change.
- `tests/global-setup.ts`: seeded offers get kind fields.

`npm run lint`, `npm run test:unit` and `npm run build` pass; e2e for the
specs above pass.

## Not in this build

- Type landing pages (`/offers/bristol/2-for-1`).
- "Biggest saving" sort.
- Type icons or colours on the card.
- Structured data changes on the offer page.
- A type filter on category, explore or business pages (`filterOffers`
  accepts it; nothing else passes it yet).
- Emails, posters, QR flow, vouchers, loyalty: they read the headline,
  which still exists.

When it's built: mark `docs/OFFER-TYPES.md` as built the way
`docs/OFFER-EDIT-REVIEW.md` is, move "Offer types beyond a discount" in
`docs/ROADMAP.md`, and add a line to `CLAUDE.md` under the `offers` table.
