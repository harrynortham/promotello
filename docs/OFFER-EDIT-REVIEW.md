# Reviewing an edit without taking the offer down

**Built.** This was the scope; it now describes what is there.

Every offer is read by a person before customers see it, and that stays.
The trouble was what happened to an offer that is **already live** when
its business edited it: it went back to `pending`, and pending means
invisible.

`20261206130000_review_what_changed.sql` narrowed what sends an offer back
— a new photograph or availability line no longer does — which removed
most of the pain. `20261206140000_offer_edits.sql` is the rest of it:
reviewing the **change** while the published version stays up.

## What used to happen

A business with a live offer changes its wording at 9am:

1. `require_review_of_edited_offer` sets `approval_status = 'pending'`.
2. The public policy on `offers` hides it: gone from `/offers`, gone from
   the category and area pages, gone from its own page, which 404s for
   everyone except the business's own team.
3. `record_qr_scan` can no longer resolve a code pointed at it, so the QR
   poster in the window sends people to the business page instead. The
   scan is still counted and the page still loads, so nothing looks
   broken — the customer simply doesn't find the deal the sheet
   advertised.
4. Reprinting that poster in the meantime prints the business's own words,
   because `/poster/[codeId]` only reads an approved offer.
5. It comes back when an admin approves it. Until then the business is
   paying for a listing that isn't listed.

The business cannot tell any of this from the dashboard. The offer says
"Pending approval", which reads like "nearly there", not "your poster
stopped working".

## What happens now

The published offer keeps serving customers. The edit waits in a queue of
its own, we read the difference, and approving it swaps the words over in
one go.

## The model

A pending edit is a copy of the fields that are being changed, not a
second offer:

```sql
create table offer_edits (
  id            uuid primary key default gen_random_uuid(),
  offer_id      uuid not null references offers (id) on delete cascade,
  title         text not null,
  description   text not null,
  discount      text not null,
  terms         text not null,
  submitted_by  uuid references auth.users (id),
  submitted_at  timestamptz not null default now(),
  decided_at    timestamptz,
  decision      text check (decision in ('approved', 'rejected')),
  -- One waiting edit per offer: a second one replaces it.
  unique (offer_id) where decided_at is null
);
```

Only the four fields that `require_review_of_edited_offer` still guards.
That trigger stayed in place as a backstop: the dashboard never writes
those fields on a live offer, so it should never fire, but anything that
writes to an offer directly still meets the old rule.
Everything else — photo, availability, expiry, claim limit, schedule —
keeps saving straight to the offer, as it does now.

Writing it:

- The edit form writes to `offer_edits` instead of `offers` when the offer
  is approved **and** one of the four fields changed. Everything else in
  the same save goes straight onto the offer.
- `apply_offer_edit(edit_id, decision)`, SECURITY DEFINER, admin only:
  copies the four fields onto the offer, stamps `decided_at`, and leaves
  `approval_status` alone. The offer never stops being approved.
- A rejected edit keeps its row so the business can be told why.

Reading it:

- Customers read `offers` and see the published words. Nothing changes.
- The business dashboard shows "Waiting for review: your new wording" with
  both versions, so they know which one is on the site.
- `/admin/offers` grows a third tab — **Edits** — next to Waiting and All,
  showing old and new side by side with the four fields diffed.

## What changes, and where

| Area | Change |
| --- | --- |
| `supabase/migrations` | `offer_edits`, `apply_offer_edit()`, drop `require_review_of_edited_offer` |
| `offers/[offerId]/edit` | Route the four guarded fields to `offer_edits`; show a waiting-edit banner |
| `/admin/offers` | Edits tab, a diff view, approve and reject |
| `lib/business-review-emails.ts` | Alert us about a waiting edit; tell the business when it lands |
| `app/(business)/.../offers/page.tsx` | "Edit waiting" badge on the card |

## What it is worth

- A live offer stays live and a printed poster keeps working, which is the
  whole point.
- Reviewing is quicker for us: four fields side by side beats rereading a
  whole offer to find what moved.
- It is honest. Today the business is told their offer is "pending" when
  what is actually pending is a sentence they changed.

## The decision still worth making

**Does an edit need reviewing at all, once the offer has been approved
once?** The four fields are exactly where a business could rewrite "20%
off a coffee" into "free iPad", so the check has a point. But the same
business can already write anything it likes in a *new* offer and have it
read within the day, so the gap an edit opens is narrow.

Nothing above depends on the answer being yes. If it turns out to be no,
`submit_offer_edit` becomes an immediate write and the queue empties — the
offer never leaves the site either way, which was the part that mattered.

## What I would not do

- **Versioning every field.** A full revision history is a bigger idea than
  this problem and would have to be read by a person who only wants to
  know what changed since yesterday.
- **Letting the edit go live and reviewing afterwards.** That is the
  "publish and spot-check" model, and it is a policy change, not this.
- **Selling instant edits as a Pro feature.** Plans buy volume and reach;
  charging to skip a safety check reads badly the first time an offer
  goes wrong.
