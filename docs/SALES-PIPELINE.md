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
| `place_id` | the importer that used to be here | Kept on old rows; nothing writes it now |
| name, phone, website | typed, or read from their own site | Ours |
| address | **never from Places** — their own site, or typed | `address_source` says which |
| lat/long, ward | postcodes.io, looked up from the postcode | Ours, with attribution |
| `email`, `email_source` | the business's own website | Yes |
| `company_number`, `company_name` | Companies House (Open Government Licence) | Yes |
| notes, category, stage | us | Yes |

### Leads are written down

There is no importer. One asked Google what was trading on a street, and the
half of it worth having — the address — was the half the terms would not let
us keep. What it actually saved was a name and a website, and the address was
typed afterwards anyway, so **Add a lead** types the name too and there is
nothing left to explain.

`place_id` stays on the table, unwritten: existing rows have one, and it is
the only piece of Places data the terms allowed us to keep. `address_source`
can no longer be `places`, and the database refuses one.

What is still automatic is what is genuinely slow by hand: the crawler reads
their site for an email and the address they publish, and the Companies House
check decides whether they may be emailed at all.

The postcode comes from the business's own site or is typed. Everything else
is looked up **from** it via postcodes.io — never the other way round.
Reverse geocoding a shop's coordinates returns the nearest postcode centroid:
from Joe's Bakery's own point the three nearest are BS7 8PH, BS7 8QN and
BS7 8TJ, and the real one, BS7 8NZ, is not among them. Fine for a map,
useless on an envelope.

postcodes.io is Ordnance Survey OpenData and ONS data: free, no key, storable
with attribution, which `ATTRIBUTION` in `lib/postcodes.ts` carries wherever
it is shown. **Northern Ireland is not covered** — BT postcodes come from Land
and Property Services and commercial use needs a licence from them, so they
are refused rather than quietly stored. That will matter the day Promotello
opens in Belfast.

### The address, and why it has a source

`leads.address_source` is `website` or `typed`.

It is typed when the lead is added, or afterwards on the lead itself.
Enrichment reads the business's own contact page — the same pages it already
opens for the email — and fills it in when nobody has. A typed one is left
alone. A registered office is often an accountant's in another county, so it
is no use for a letter.

**A letter should go to an address whose source is not `places`.** The lead
page says which one it has, and has fields to write one in.

Those fields are the preview form's, by the same names: `addressLine1` and
`postalCode` on the lead, with the town and area coming from `city_id` and
`area_id`, chosen when it was added. **Build the preview** then opens
`/admin/previews/new?lead=<id>` with every one of them filled in — name,
category, website, email, Instagram, street, town, area, postcode — so
building a preview is checking rather than retyping from the tab next door.
Creating it links the preview back to the lead and moves it to **Preview**,
rather than leaving somebody to remember.

A typed address outranks both and the crawler leaves it alone. Wherever
somebody found it — the shop's own site, a search, the front of the building
— a business's address is a fact about a street, and writing it down is not
keeping anybody's API response.

An address with no street number is refused rather than guessed: "we deliver
to most of Bristol, including BS7 8NZ" has a postcode and is not somewhere a
letter can go. The cost is that "The Old Bakehouse, Church Lane" is missed and
gets typed by hand, which is the right way round — a miss costs seconds, a
wrong address costs a letter.

Google's terms give names, addresses, ratings and photos **no caching
exception** and call out bulk storing them. That is why there is no importer
any more: the one fact it was good for was the one we could not keep, and
every record here is built from sources we may — the business's own site,
Companies House, postcodes.io, and what somebody typed.

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

- `COMPANIES_HOUSE_API_KEY` — free from their developer portal, roughly 600
  requests per five minutes. Without it no lead can become emailable, which
  fails in the safe direction.

## The outbox

`/admin/sales/outbox` holds the day's drafts. A lead with an address, a
preview and a company number can be queued — the first email or the follow-up
— and the message is **drafted from the preview and stored**, so what somebody
approved is what goes out. A preview edited in between does not silently
change an email that was already read and agreed to.

Sending needs `OUTREACH_EMAIL_FROM`, an address on its own subdomain verified
in Resend. **Outreach must not share the sending domain** with vouchers and
receipts: one spam complaint run against cold email should not be able to stop
a customer getting what they claimed. Without it the queue drafts and holds,
the Send button is disabled, and the action refuses on the server as well.

The gate is checked a third time here. `outreach_messages` has its own trigger
refusing a row for a lead whose `can_email` is false, because inserting
straight into that table would otherwise be a way round the other two.

## Still to build

The letter. The daily job flags who is due one after a fortnight, and an admin
moves the lead to **Letter posted** by hand; nothing addresses or posts it
yet. A provider needs choosing and funding first.
