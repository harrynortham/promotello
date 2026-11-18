# The sales pipeline

Where a business goes between being a shop on a street and a claimed page.
`docs/OUTREACH.md` says who may be written to and why; this says what the
dashboard does with them.

The pipeline lives at `/admin/sales` and is platform-admin only. A lead is a
business that has not asked to be on Promotello, so nothing on the business
side can read it — tested in `tests/e2e/sales-pipeline.spec.ts` against the
database rather than against a page.

## The gate, before anything else

`leads.can_email` starts **false** and a trigger refuses to set it true
without a company number (`20270131090000`). Under PECR a sole trader has the
same protection as a private individual; a limited company does not. That used
to be a column in a spreadsheet and a discipline. It is now a constraint, in
three places:

- the database refuses the row,
- `moveLead()` refuses to walk a lead into **Emailed** or **Followed up**,
- the board shows **Post only** against anybody it applies to.

A business we may not email is not stuck. A letter needs no consent, which is
why posting one is in the sequence at all.

## What is kept, and from where

| Fact | Comes from | Kept? |
| --- | --- | --- |
| `place_id` | Google Places | Yes — the one field their terms allow indefinitely |
| name, address, phone, website | shown by Places at import, **kept only because somebody chose to** | Ours from then on |
| `email`, `email_source` | the business's own website | Yes |
| `company_number`, `company_name` | Companies House (Open Government Licence) | Yes |
| notes, category, stage | us | Yes |

Google's terms give names, addresses, ratings and photos **no caching
exception** and call out bulk storing them. So Places answers one question —
who is trading on this street — and the record is built from sources we may
keep. Check the live terms before changing `lib/places-import.ts`; they are
revised, and the EEA version differs.

## The stages

`new → enriched → emailable → preview → emailed → followed_up → letter`, and
then `claimed`, `not_interested` or `dead`.

**Post only is not a stage.** It is `can_email = false` and it cuts across all
of them, so the board filters on it instead.

The stage is where a lead is. `lead_events` is how it got there, appended and
never edited, so dragging a stage backwards does not lose the day we wrote to
them.

## The day's work

The daily cron (08:00, `app/api/cron/daily/route.ts`) runs
`flagLeadsDueToday()`:

- emailed four or more days ago, nothing back → **due a follow-up**
- a fortnight since the last touch → **worth a letter**

It writes a note on the lead and nothing else. **It does not send.** The
sequence is approved and sent by a person; the job is only so that nobody has
to remember whose turn it is.

`dueToday()` in `lib/sales-pipeline.ts` is pure and takes `now`, so the dates
are tested rather than waited for.

## Keys

Both are optional, and the pipeline works without either — a lead can be
added and enriched by hand.

- `GOOGLE_PLACES_API_KEY` — the area import. Without it that page says so.
- `COMPANIES_HOUSE_API_KEY` — free from their developer portal, roughly 600
  requests per five minutes. Without it no lead can become emailable, which
  fails in the safe direction.

## Still to build

Sending. The approve-and-send queue, the outreach subdomain and the letters
provider are the second piece of work. Until then the board shows those stages
and an admin moves a lead into them by hand, so the pipeline is honest from
the first day.

**Outreach must not share the sending domain** with vouchers and receipts. One
spam complaint run against cold email should not be able to stop a customer
getting their voucher.
