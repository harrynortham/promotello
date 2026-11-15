# What a business is told when it's approved or turned down

**Built.** This was the scope; it now describes what is there.

Six decisions exist. Five send something. Before
`20270107090000_a_decline_says_why.sql` none of them could carry a reason,
so a decline was three messages that between them said nothing:

- the email listed what the reason **might** have been ("the usual reasons
  are unclear terms, or a discount that's hard to check") and asked them to
  reply;
- the notification said "We've emailed you why", which that email had not
  done;
- the dashboard showed a red **Rejected** chip and no words at all.

Nothing was recorded either. `review_business(uuid, text)` and
`review_offer(uuid, text)` took a decision and nothing else, `offer_edits`
had `decision/decided_by/decided_at` and no reason, and `audit_logs`
metadata on a decline held `{previous_status, new_status}`. So when the
business replied to ask, we had to remember.

## Where the words live

`lib/review-reasons.ts` holds eight causes for a business and eight for an
offer. Each is a code, the admin's label, the sentence the business reads
(`says`) and what to do about it (`fix`).

The **code** is stored on the row. The **sentences are not**: they are
rebuilt on every read, so the wording can be improved without a migration
and without the email, the notification, the dashboard and the help centre
drifting apart. That is the same reason `lib/offer-kinds.ts` is the only
place a headline is built.

`review_note` is the part written about this one business — it is what they
read first, and for the "something else" cause it is the whole message, so
an empty note is refused in the dialog and again in the function.

A decline from before any of this has no code. Every surface renders
without one rather than inventing a cause: the email falls back to its old
words, and the dashboard says we didn't record a reason and to ask us.

## What is sent, step by step

| Decision | Email | Notification | In the app |
| --- | --- | --- | --- |
| **Business approved** | "{Name} is live on Promotello" → print your QR poster | "{Name} is live on Promotello" → `/business/{id}` | Banner gone; checklist moves on |
| **Business declined** | "We couldn't approve {Name} yet" — cause, note, **What to change**, → their profile, with links to the help article and to us | The cause itself → `/business/{id}` | Red banner, then the cause, the note and what to change, with the article and "Ask us" |
| **Offer approved** | "{Title} is live" | "“{Title}” is live" | Chip reads Approved; followers are emailed |
| **Offer declined** | "{Title} wasn't approved" — cause, note, **What to change**, → that offer's editor | The cause itself → their offers | The cause above the offer, beside **Edit offer** |
| **Change to a live offer approved** | "Your changes are live" | Same | New wording on the offer |
| **Change declined** | "We couldn't approve the new wording" — says the offer is still up, then the cause → that offer's editor | The cause itself | Offer unchanged and still live |
| **Suspended** | Nothing | Nothing | Banner says suspended, no reason |

Both declined-offer emails now open the **business's own editor**
(`/business/{id}/offers/{offerId}/edit`), not the customer's page. Saving
there sends it back for review, so the email's button and the thing they
have to do are the same click. The edit email's button said "Edit the
offer" and opened the public page.

## What the reviewer does

Both reject dialogs ask for the cause before there is anything to confirm:
the button is disabled until one is chosen, the dialog shows the exact
sentence the business will read, and the note box is required for "something
else". Turning down a change to a live offer used to be a bare button in the
edits tab; it is a dialog like the others now.

The reason is read back **off the row** when the email and the notification
are built, never passed from the browser — the function has already checked
there is one.

## The guards

In `review_business`, `review_offer` and `apply_offer_edit`:

- a decision of `rejected` with no reason raises `Say why it was not approved`;
- `other` with an empty note raises `Write what to tell them`;
- approving **clears** the reason and the note, so a decline cannot sit on a
  live offer's page a month later;
- the reason and the note go into `audit_logs.metadata`;
- the old two-argument functions are kept so a page served before the deploy
  keeps working, and they can approve or suspend but no longer decline.

The set of codes is deliberately **not** a check constraint — it is copy, it
will grow, and a migration per wording change is how wording stops being
improved. The column constrains the shape (`^[a-z][a-z-]{1,39}$`) and
`tests/unit/review-reasons.test.ts` holds every code to it.

## The help centre

Two articles, `#business-declined` and `#offer-declined`, built from the same
two lists the reviewer picks from, so the reasons on the page and the reasons
in the dialog cannot disagree. Both are what the decline emails link to, and
`components/help-centre.tsx` opens the article a hash names — the link used to
scroll to a closed accordion. "Check why an offer is not public" said "read
any feedback we sent", which was feedback that did not exist; it now points at
the offer itself.

## Not in this

**Suspension.** `review_business` and `review_offer` both accept
`'suspended'`, the audit trigger logs it and the dashboard has a banner for
it, but there is no control for it in `/admin` and nothing is sent when it
happens — it is reachable only by hand in SQL. Either it gets a control and a
message or it should come off the admin surface. Said here so it is a decision
rather than an oversight.

**A rejected change on the offers page.** A declined edit is covered by its
email and its notification, and the offer itself stays live, so there is no
broken state on the page to explain. Showing the last rejected wording there
would mean deciding how long it stays relevant.
