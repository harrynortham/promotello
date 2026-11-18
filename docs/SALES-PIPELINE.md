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
| `email`, `email_source` | the business's own website | Yes |
| `company_number`, `company_name` | Companies House (Open Government Licence) | Yes |
| notes, category, stage | us | Yes |

### A preview is something a lead has

There is no previews section. Building one is **Build the preview** on the
lead, which opens `/admin/sales/[leadId]/preview` and asks only what a lead
cannot answer: what they are, the sample offer, what the card gives, a logo
and a photo. The name, category, address, area, postcode, who to write to and
their email all come from the lead, and the page says so above the form.

It was a dialog first. `ImagePicker` opens its own modal to crop, so inside a
dialog the cropper sat in a sheet already constraining it, and two pickers
with `shrink-0` upload buttons pushed past the edge. Cropping is the one thing
here that wants room.

Afterwards the lead shows the link to send, how many times it has been opened,
and deleting it. Sending is unchanged: queue it, read it in the outbox, send.

`business_previews` keeps only what a preview knows — the sample offer, the
card, and who has looked at it. `contact_name`, `contact_email`,
`instagram_handle`, `status`, `notes` and `contacted_at` were all a second
copy of what the lead holds and are gone (`20270209090000`).

**The greeting on the public page comes from the lead.** `open_business_preview`
served "Hi Sam," from the preview's own `contact_name`; Postgres does not check
a plpgsql body when a column it names is dropped, so the function would have
kept its signature, passed every build, and failed the moment a business opened
the link they were sent.

### Everything on a lead is editable

A lead is written down by hand, so it is corrected by hand: the name, who to
write to, the category, email, phone, website and Instagram in one form; the
address in another; the company in a third.

**Who to write to** is `contact_name`. It fills the preview form and it is the
first line of the outreach email — "Hi Sam," rather than "Hi there,".

An email typed here is marked `typed`, and the crawler leaves it alone, the
same as a typed address. There is no **Look again** once one is written down,
because looking again could not change it.

**The company can be written down too.** Paste the registered name and number
and it is stored exactly as the API check stores it — it is the same fact
arriving by a different route. The gate is unchanged: a number is what makes a
lead emailable, and clearing it puts them back to post only.

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

The postcode comes from the business's own site or is typed, and that is as
far as it goes. Coordinates and the ward were looked up from it for a while
and nothing ever read them — there is no map here, and a letter needs a
postcode rather than a point — so the lookup is gone along with the
attribution condition and the Northern Ireland licence question it carried.
A postcode can be looked up again by anyone, for free, which is the argument
against storing the answer.

### The address, and why it has a source

`leads.address_source` is `website` or `typed`.

It is typed when the lead is added, or afterwards on the lead itself — the
street, the town, the area and the postcode, through the same
`LocationFields` the add form uses, so the two cannot drift apart. The town
and area were fixed at the moment a lead was added, which made one filed in
the wrong part of town unfixable.
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
Companies House, and what somebody typed.

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
