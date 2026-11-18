# Finding businesses and writing to them

How a street gets turned into a list, and a list into previews. Written to be
repeated: Gloucester Road first, then North Street, then whatever is next.

Selling is remote and in writing. There are no shop visits and no cold calls,
so the list and the email are the whole machine.

## The legal gate, first

This decides who can be emailed at all, so it comes before the work rather
than after it.

Under UK PECR, **a sole trader or an ordinary partnership has the same
protection as a private individual**: unsolicited marketing email needs their
consent. **A limited company (or an LLP) can be emailed without consent**, as
long as the sender is identified and every message offers a way to opt out.

Plenty of independent cafés and barbers are sole traders, so this is not a
technicality that can be skipped. In practice:

- **Check Companies House before adding anyone to the email list.** Search the
  trading name and the postcode at <https://find-and-update.company-information.service.gov.uk>.
  A match means a limited company: email is fine.
- **No match means treat them as a sole trader.** Do not email. Post them a
  printed QR poster instead, or wait until they come to Promotello another
  way. Keep them on the list with `can_email` set to `no` so nobody adds them
  later by accident.
- **An address on a website that says "email us" is an invitation**, but it is
  safer to rely on the company status than to argue the point for each one.
- **Honour "no thanks" the same day**, and never write to that address again.
  The previews page has a status for it.
- The Companies Act also wants Promotello Ltd's registered name, number, place
  of registration and office in every business email. That lives in the Gmail
  signature, not in the copied message. Send yourself a test to check it is
  actually attached.

Nothing here is legal advice. It is worth half an hour of your own reading
before the first batch, and the ICO's own guidance on electronic mail
marketing is the place to start.

## Where the names come from

In rough order of how much work each one is per business.

1. **Walk the street on Google Maps.** Street View along Gloucester Road from
   the Arches to Horfield, listing every independent shop, café, barber and
   salon. This is the most reliable source of who actually exists and is still
   trading, and it costs an afternoon once per street.
2. **The business's own website.** The email is nearly always on a contact
   page. This is a person publishing an address for people to use, which is
   the cleanest way to get it.
3. **Instagram bios.** Independents often put a booking or enquiry address
   there. Note that a DM is also electronic mail for PECR, so the same rules
   apply to messaging them as to emailing them.
4. **Bristol Independents, the Gloucester Road Traders association, and BID
   member lists.** Good for discovering businesses, less good for addresses.

Do not scrape Google Maps or buy a list. Scraping breaks their terms, and a
bought list has no consent behind it and will burn the sending domain.

**The Places API is not scraping** and `/admin/sales/import` uses it to ask
who is trading on a street. Their terms still decide what may be kept: a
place id indefinitely, and names and addresses not at all. So the import
shows what Google said, once, and what is kept is what somebody chose to
keep as our own record. `docs/SALES-PIPELINE.md` has the table.

## The list itself

**The list lives in Promotello now, at `/admin/sales`.** It used to be a
spreadsheet, deliberately: most of these businesses would never be contacted
and a preview each was wasted work. That is still true, which is why a lead
and a preview are different things — a lead is a row, a preview is a page we
built, and a lead graduates to one when it is worth writing to.

What changed is the volume. A spreadsheet is the right tool for ten
businesses and the wrong one for a hundred, and the legal gate below is too
important to leave as a column somebody remembers to fill in.

`docs/SALES-PIPELINE.md` has the stages and what moves a lead between them.
The columns the spreadsheet used to carry now live on the `leads` table, with
two differences worth knowing:

- `can_email` is not something you type. It is set only by a confident
  Companies House match, and the database refuses it otherwise.
- Where a fact came from is kept beside the fact — `email_source` is the page
  the address was found on, which is the answer to "how did you get this".

Still sorted the same way: what we may email first, and cafés and barbers
before anybody else, because they already understand a stamp card.

## From a lead to a sent email

1. **Find their address.** On the lead, "Find their address" reads their own
   website for the one they publish, and records the page it was on.
2. **Check Companies House**, which is what decides whether they can be
   emailed at all. No confident match means post only, and the rest of this
   list is a letter instead.
3. **Build the preview** from the lead: name, category, address, a sample
   offer that suits them, a loyalty reward that suits them.
4. **Add a logo and a cover photo** on the preview's own page. A preview that
   looks like them is the entire argument, so this is worth the two minutes.
5. **Open the preview** and read it as they would. If the sample offer is
   wrong for that business, fix it before sending.
6. **Copy the subject and the message** from the preview page and send it from
   Gmail, so the signature and its disclosure go with it. (The approve-and-send
   queue is the next piece of work; until it lands this step is still by hand.)
7. **Move the lead to Emailed.** This is what stops the same business being
   written to twice, so do it before closing the tab.

## What is tracked, and where

The pipeline holds the long list. The previews page holds everyone who has
actually been contacted, and answers three questions on one row:

- **Did I write to them?** Set by marking it emailed.
- **Did they open it?** Counted by the preview link itself.
- **Did they claim it?** Set by the business, when they do.

That last pair is the useful one. Someone who opened it and did not claim
means the preview is not convincing. Nobody opening at all means the subject
line is wrong. They need different fixes, and the page tells them apart.

## Following up

One follow-up, four or five days later, in the same thread. After a fortnight
of nothing, a letter — which needs no consent, and is the only way to reach
a sole trader at all. Then stop.

The daily job flags who is due each of those on the board; it does not send
them. Move a lead to `not_interested` if they reply no, and `claimed` when
they take the page, so the list stays what is still outstanding.

A preview expires after 90 days and the daily job deletes it. A business that
has gone quiet for that long can be rebuilt later with a better offer.

## Pace

Keep it slow and individual. A handful of genuinely personal emails a day from
a normal Gmail account looks like a person writing to shops, which is what it
is. A few hundred at once looks like a mailing, which is how a domain gets
filtered, and the sending domain is the same one the product's own email
depends on.
