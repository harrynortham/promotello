# Offer types: a scope

Today an offer has one free-text headline, stored in `offers.discount`:
"20% off", "2 for 1", "Free side". It is written by the business, shown on
the card and the offer page, and searched as text. Nothing knows what kind
of offer it is.

This is what it would take to make the kind a real thing, and what we would
get for it. Nothing here is built.

## What the headlines actually say

Every live offer, grouped by hand (31 distinct values across 36 offers):

| Kind | Live examples | Share |
| --- | --- | --- |
| Percentage off | 20% off ×4, 10% off ×2, 15% off ×2, 50% off ×2, 20% offer ×2 | ~12 |
| Something free with a purchase | Free coffee ×2, Free pastry, Free side, Free bun, Free scoop, Free add-on, Free tote, Free breakfast, Free late checkout, Free shoe hire, Free repotting, Free check, Free class | ~14 |
| Money off | £5 off, £10 off, £15 off, £1 off pints, £5 off pp | 5 |
| A fixed price | £1 cones, £5 tickets, £8 beard trim, Flight for £8 | 4 |
| Multi-buy | 2 for £15, 2 for £20, 3rd half price | 3 |
| Credit | £10 credit | 1 |

Two things fall out of that. The taxonomy doesn't need inventing — five
kinds cover everything real businesses have written. And "20% offer" ×2 is
a typo that a picker plus a number would have made impossible.

## What it buys

- **Browsing.** "2 for 1 near me" is a thing people search for and we
  cannot answer. A kind filter beside category and area is the obvious
  home for it.
- **Landing pages.** `/offers/bristol/2-for-1` is a page worth having, the
  same way neighbourhood pages are. Today there is nothing to build it
  from.
- **Honest sorting.** "Biggest discount first" needs a number, not a
  string. So does "offers under £10".
- **Consistency.** A picker ends "20% offer", "20%off" and "twenty percent
  off" being three different things to search.
- **Better cards.** A kind can carry an icon and a colour, so a card reads
  at a glance.

## The model

Keep `discount` as the headline — it is what a business writes and what
the card shows, and nothing needs rewriting. Add the facts beside it:

```sql
alter table public.offers
  add column kind text not null default 'other'
    check (kind in ('percent_off','money_off','fixed_price','multi_buy','freebie','other')),
  -- The number behind the kind, where there is one: 20 for 20% off, 5.00
  -- for £5 off or a £5 price. Null for a freebie.
  add column kind_value numeric(10,2);
```

A column with a check rather than a Postgres enum: adding a kind later is
a one-line migration instead of a type change, and the set will move.

`kind_value` is what makes sorting and "under £10" possible. It is
optional at first: a kind with no number still filters.

## What changes, and where

| Where | Change | Size |
| --- | --- | --- |
| `supabase/migrations/` | the two columns, with a backfill (below) | S |
| `components/offer-fields.tsx` | a kind picker, a number beside it where the kind takes one, and the headline built from both unless the business overrides it | **M** |
| `lib/listing-filters.ts` | `kind` in `filterOffers`, and the sorts that need a number | S |
| `app/(customer-marketing)/offers/offers-listing.tsx` | a "Type of offer" section in the existing filter panel | S |
| `components/offer-card.tsx` | an icon per kind on the badge | S |
| `app/(customer-marketing)/offers/[slug]/page.tsx` | the kind in the structured data (`priceSpecification`, `discount`) | S |
| `app/admin/offers` | kind shown and filterable in review | S |
| `tests/` | unit tests for the backfill parser and the filter; e2e for the picker and the filter | M |

Not needed: the emails, the posters, the QR flow, the loyalty card. They
all use the headline, which doesn't change.

## Backfilling what we have

36 offers, 31 distinct headlines, and the patterns are regular enough to
parse. Run in this order, because the first rule that matches wins and
"£1 off pints" is money off, not a £1 price:

```
/^(\d+)\s*%\s*off/i     → percent_off, value   ("20% off" → 20)
/^£([\d.]+)\s*off/i      → money_off,   value   ("£5 off"  → 5)
/^(\d+)\s+for\s/i        → multi_buy            ("2 for £15")
/^£([\d.]+)\s/i          → fixed_price, value   ("£1 cones" → 1)
/^free\b/i               → freebie
```

I ran that over every live headline rather than guessing at it. **29 of
31 are classified**:

| Decision | Count | Notes |
| --- | --- | --- |
| freebie | 13 | every "Free …" |
| percent_off | 5 | includes "20% offer", the typo, read correctly as 20 |
| money_off | 5 | "£5 off pp" lands right, the per-person part is lost |
| fixed_price | 4 | one of them wrong: "£10 credit" is not a £10 price |
| multi_buy | 2 | "2 for £15", "2 for £20" |
| other | 2 | "3rd half price", "Flight for £8" |

So: three to fix by hand — the credit, and the two that didn't match —
and "£5 off pp" to decide about. At 36 rows the sensible thing is to run
the parser, print what it decided, correct those three, and only then
write the values into the migration. Do not run an unattended regex over
the table.

## The decision worth making first

**Does the business pick the kind, or do we guess it?**

- *Picker.* A select, then a number where the kind needs one, and we build
  the headline: "20% off", "£5 off", "2 for £15". Accurate, sortable, and
  it stops the typos. Costs a form that is three fields where it was one,
  and the headline stops being whatever they want to write.
- *Guess.* Keep the single field, parse it on save, and store the kind
  behind the scenes. Nothing changes for the business. But the parser will
  be wrong sometimes, and a filter people trust can't be built on a guess
  it can't explain.

I would pick the picker, with a free-text override for the business that
wants one: the filter is the point of the feature, and a filter is only
worth having if the data under it is true.

## Effort

About **two days** for the picker version: half a day on the migration and
backfill, half on the form, half on the filter and the cards, half on
tests and the admin side. The guess version is about half that and buys
less.

Landing pages (`/offers/bristol/2-for-1`) are a separate day on top, and
only worth it once there are enough offers of a kind to fill a page —
three 2-for-1s is not a page.

## What I would not do

- A kind per offer *line* (buy X get Y on specific products). That is a
  catalogue, and we are not that.
- Stacking kinds ("20% off **and** a free side"). One kind, and the rest
  goes in the description.
- Showing kinds customers can't act on. If nothing in Bristol is a
  multi-buy, the filter shouldn't offer it — the area filters already work
  this way.
