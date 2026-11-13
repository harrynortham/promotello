# Editing a business page after it is approved

**Decided, and built.** This was the open question in the README's stage 3;
it now describes what is there.

Every business is read by a person before it appears in the directory. The
question was what happens to the page afterwards: an approved business could
change its name, its description and both pictures, and the change went
straight onto the row. No review, no record, nothing to read later.
`audit_logs` knew a business had been created, approved, rejected or
suspended, and nothing about the week it spent quietly becoming a different
business.

## The decision: record, don't gate

An edit goes live immediately, exactly as it did, **and leaves a trace**.

Gating was the obvious other answer — reuse the offer-edit queue
([OFFER-EDIT-REVIEW.md](OFFER-EDIT-REVIEW.md)), hold the new words, keep
serving the approved ones. It was turned down for two reasons:

- **A business fixing its own typo should not wait for us.** Blocking a save
  is friction at exactly the moment somebody is working on their page, and
  most edits are an opening line reworded or a better photograph.
- **The page never went down anyway.** The reason the offer queue exists is
  that an edited offer *disappeared* from the site while it waited. A business
  page has never had that problem, so the uptime argument that justified the
  offer queue does not apply here. What was missing was only the reading.

The risk this accepts: a bad edit is live until somebody looks. With a handful
of businesses and one person reviewing, that is a smaller cost than making
every business wait. It is a volume decision, and it can be reversed —
see below.

## What is recorded

Four fields, because they are what the reviewer actually judged:

| Field | Why |
| --- | --- |
| `name` | What the business is called, and what the directory says it is |
| `description` | The prose a person read before saying yes |
| `logo_url` | A picture, which is the thing a spot check catches |
| `cover_image_url` | The same |

Hours, address, website, contact email, Google review URL and category save
silently, as they always have. The review URL is already validated to Google;
the rest are facts a business should be able to correct at four on a Saturday.

## How

`20261230090000_an_edit_leaves_a_trace.sql`:

- `business_edits` — one row per field changed in one save (`was`, `became`,
  who, when), which is the diff.
- A trigger on `businesses`, firing on those four columns and only once the
  business is approved. Before approval the whole page is being read anyway.
- RLS: us, and the business's own admins. It is their page, and knowing what
  changed is worth as much to them. No insert policy: only the trigger writes.
- `mark_business_edits_seen(business_id)`, admin only.

`/admin/businesses/edits` reads it: grouped by business, newest first,
**Approved** beside **Now live** for each field, images as links rather than
rendered, and one button to mark a business read. `/admin/businesses` carries
the count.

## If this ever needs to become a gate

The shape is already right. Hold the row instead of applying it, the way an
offer edit waits: the trigger becomes a `before update` that reverts the
column and keeps the row, and approving it writes the value on. Nothing else —
the table, the diff, the admin page — has to change.

That switch is a policy change, and the sign it is needed is one bad edit
found late, or more businesses than one person can read.
