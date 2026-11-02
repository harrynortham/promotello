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

## The list itself

Keep the long list in a spreadsheet, not in Promotello. Most of these
businesses will never be contacted, and building a preview for each one is
wasted work. A business graduates from the spreadsheet to a preview at the
moment it is worth writing to.

One row per business:

| Column | What goes in it |
| ------ | --------------- |
| `name` | Trading name, as written on the shop |
| `street` | Gloucester Road, North Street, and so on |
| `category` | Café, barber, bakery: matches a Promotello category |
| `website` | Their own site, if any |
| `email` | Only from their own site or profile |
| `instagram` | Handle, where there is one |
| `companies_house` | Company number, or `none` for a sole trader |
| `can_email` | `yes` for a limited company, `no` otherwise |
| `preview_built` | Date, once it exists in `/admin/previews` |
| `notes` | Anything worth remembering before writing |

Sort by `can_email`, then by how good a fit they are. Cafés and barbers first:
they already understand a stamp card, which makes the pitch a short one.

## From a row to a sent email

1. **Build the preview** at `/admin/previews` from what is on their website:
   name, category, address, a sample offer that suits them, a loyalty reward
   that suits them. Put their email in "Where you'll write".
2. **Add a logo and a cover photo** on the preview's own page. A preview that
   looks like them is the entire argument, so this is worth the two minutes.
3. **Open the preview** and read it as they would. If the sample offer is
   wrong for that business, fix it before sending.
4. **Copy the subject and the message** from the preview page and send it from
   Gmail, so the signature and its disclosure go with it.
5. **Mark it emailed** on the preview page. This is what stops the same
   business being written to twice, so do it before closing the tab.
6. **Fill in `preview_built`** in the spreadsheet.

## What is tracked, and where

The spreadsheet holds the long list. The previews page holds everyone who has
actually been contacted, and answers three questions on one row:

- **Did I write to them?** Set by marking it emailed.
- **Did they open it?** Counted by the preview link itself.
- **Did they claim it?** Set by the business, when they do.

That last pair is the useful one. Someone who opened it and did not claim
means the preview is not convincing. Nobody opening at all means the subject
line is wrong. They need different fixes, and the page tells them apart.

## Following up

One follow-up, five to seven days later, in the same thread, and then stop.
Mark the preview `not_interested` if they reply no, and `replied` if they
reply at all, so the list stays what is still outstanding.

A preview expires after 90 days and the daily job deletes it. A business that
has gone quiet for that long can be rebuilt later with a better offer.

## Pace

Keep it slow and individual. A handful of genuinely personal emails a day from
a normal Gmail account looks like a person writing to shops, which is what it
is. A few hundred at once looks like a mailing, which is how a domain gets
filtered, and the sending domain is the same one the product's own email
depends on.
