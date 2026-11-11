# In-app notifications: the spec

**Not built yet.** When it is, change this line to "Built." as the other
specs do, and correct anything below that turned out differently.

## The problem

Everything Promotello tells a person, it tells them by email: your
business was approved, your offer is live, an offer has run out, a
business you follow has something new. Somebody who is already on the
site has no way to see any of it there, and somebody who turned an email
off never hears at all.

## The outcome

1. Each signed-in person has one list of notifications, at
   `/notifications`.
2. It belongs to the **user account**, not to a business. Somebody who
   is a customer and also runs a business has one list, and sees the same
   list and the same dot whether they are on customer pages or in the
   business dashboard.
3. The avatar in the header shows a dot while anything is unread, and
   the avatar menu has a "Notifications" link with the unread count.
4. Server code can notify a person, or everybody who manages a business,
   with one function call.

## What is deliberately not in this version

- No Realtime subscription. Nothing in the app uses Supabase Realtime
  yet; the dot refreshes on navigation and on window focus (below).
- No push, SMS or wallet messages.
- No per-type "in-app" preferences. `/account/notifications` and the
  business's Settings → Notifications stay as they are: they decide
  **email** only.
- No notifications for marketing, tips, lifecycle nudges, the daily
  summary or the monthly report. Those stay email-only.
- Nothing for guests. Notifications need an account.

## The data

One new migration in `supabase/migrations/`, timestamped after the
latest one there and named in the same sentence style as the others.

### `public.notifications`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` pk, `gen_random_uuid()` | |
| `user_id` | `uuid` not null → `auth.users (id)` on delete cascade | Who it is for. The only owner. |
| `type` | `text` not null | One of the types in `lib/notifications.ts`. No check constraint, so adding a type needs no migration. |
| `title` | `text` not null | One line, written when the notification is made. |
| `body` | `text` | Optional second line. |
| `href` | `text` | Where clicking goes. In-app path only: `check (href is null or href ~ '^/[^/]')`. |
| `business_id` | `uuid` → `businesses (id)` on delete cascade | Context only ("which of my businesses is this about"). Never used for access. |
| `dedupe_key` | `text` | Stops the same event notifying twice. |
| `read_at` | `timestamptz` | Null means unread. |
| `created_at` | `timestamptz` not null default `now()` | |

The title and body are stored as written rather than rebuilt from the
type on each read, so an old notification still reads correctly after
the offer or business it mentions is renamed or deleted.

Indexes:

- `(user_id, created_at desc)` for the list.
- `(user_id) where read_at is null` for the count behind the dot.
- unique `(user_id, dedupe_key) where dedupe_key is not null`.

### Row level security

RLS on. For `authenticated` only:

- **select** where `user_id = (select auth.uid())`.
- **update** where `user_id = (select auth.uid())`, and
  `grant update (read_at)` only, so a person can mark their own as read
  and change nothing else (the pattern `business_followers` uses for
  `emails_enabled`).
- **delete** where `user_id = (select auth.uid())`.
- **No insert policy.** Nobody creates a notification from the browser.
  Rows are written with the service role, from server code that has
  already checked who is asking.

`anon` gets nothing.

### Who manages a business

`business_manager_emails(business_id)` already returns owners' and
admins' emails. Add its twin, `business_manager_ids(business_id)
returns uuid[]`, SECURITY DEFINER, `search_path = public`, execute
granted to `service_role` only.

### Tidying up

Notifications older than 90 days are deleted by the existing daily job
(`app/api/cron/daily/route.ts`). Account deletion removes them through
the cascade; check `account_deletion_check` and the privacy pages
(`app/account/privacy`, `app/legal/privacy`) and add a line where they
list what is stored.

## The code that sends them

### `lib/notifications.ts` — what they say

The only place that writes a notification's words, in the way
`lib/offer-kinds.ts` is the only place that builds a headline. Pure
functions with no database or Next imports, so `npm run test:unit` can
cover them:

```ts
export type NotificationType = "business_approved" | "business_rejected" | ...;

export type NotificationContent = {
    type: NotificationType;
    title: string;
    body?: string;
    href?: string;          // in-app path
    businessId?: string;
    dedupeKey?: string;
};

// One builder per type, e.g.
export function offerApproved(offer: { id: string; title: string; slug: string; businessId: string }): NotificationContent
```

Copy follows the emails that already exist for the same events: plain
British English, the business or offer named, no exclamation marks. No
place names in the copy (see `docs/MULTI-CITY.md`).

### `lib/notify.ts` — sending

Server only. Uses `createAdminClient()`.

```ts
notifyUsers(userIds: string[], content: NotificationContent): Promise<void>
notifyBusinessManagers(businessId: string, content: NotificationContent): Promise<void>
```

- Inserts one row per user, `on conflict do nothing` on the dedupe index.
- **Never throws and never blocks the action that caused it.** A failed
  insert is logged with `console.error`, as the email senders do, and
  the approval, claim or follow that triggered it carries on.
- Independent of email: it runs whether or not the email is sent or
  switched off, and is not undone if the email fails.
- As with `lib/business-review-emails.ts`: these use the service role,
  so only call them after checking who is asking.

### The events in this version

Each is added beside the email that already goes out for the same
event. Find the call site, don't invent a new one.

| Type | Who is told | When | Goes to | Dedupe key |
| --- | --- | --- | --- | --- |
| `business_approved` / `business_rejected` | The business's owners and admins | An admin reviews the business (`emailBusinessReviewed`) | Approved: `/business/[id]`. Rejected: `/business/contact` | `business:{id}:{decision}` |
| `offer_approved` / `offer_rejected` | Owners and admins | An admin reviews an offer (`emailOfferReviewed`) | `/business/[id]/offers` | `offer:{id}:{decision}` |
| `offer_edit_approved` / `offer_edit_rejected` | Owners and admins | An admin answers a change to a live offer (`emailOfferEditReviewed`) | `/business/[id]/offers` | `offer-edit:{editId}` |
| `offer_fully_claimed` / `offer_low_stock` | Owners and admins | After a claim, when `claim_offer_stock_alert` says so (`sendOfferStockAlert`) | `/business/[id]/offers` | `offer:{id}:{kind}` |
| `team_member_joined` | Owners and admins, except the person who joined | An invitation is accepted (`accept_business_invitation`) | `/business/[id]/team` | `team:{businessId}:{userId}` |
| `new_offer_from_followed` | Everybody who follows the business, whether or not they take its emails | An offer is approved (`emailFollowersAboutOffer`) | `/offers/[slug]` | `new-offer:{offerId}` |
| `voucher_issued` | The customer | An automation gives them a voucher (`issue_automation_vouchers`: welcome, birthday, win-back) | `/dashboard/redemptions` | `voucher:{redemptionId}` |

The stock alerts follow the business's existing settings for now,
because `claim_offer_stock_alert` returns nothing when they are off.
Leave that function alone.

If one of these call sites turns out not to fit (no user id to hand, or
the event fires somewhere awkward), say so and leave that type out
rather than restructuring the feature around it.

## What people see

### The avatar

In `components/site/user-menu.tsx`, which every header uses through
`SiteHeader`, so customer pages, the business dashboard and `/account`
all get it at once.

- A new hook beside `use-runs-a-business.ts`:
  `components/site/use-unread-notifications.ts`. A `count: "exact", head:
  true` query on `notifications` where `read_at is null`, through the
  browser client; RLS makes it this person's own. It starts at 0 and
  re-runs on mount, when the pathname changes, and when the window
  regains focus.
- While the count is above 0, a coral (`#FF593F`) dot sits on the top
  right of the avatar in the trigger, with a ring in the header's
  background colour so it reads against a photo. No number on the dot.
- The trigger's `aria-label` gains the count: "Open account menu for
  Harry, 3 unread notifications". The dot itself is `aria-hidden`.
- The dot does not flash on load: nothing is shown until the count
  arrives.

### The menu

A "Notifications" item (`FiBell`, href `/notifications`) in **both**
`accountLinks.customer` and `accountLinks.business`, in the last group,
above "Account settings". When anything is unread, the count shows at
the right of the row in a small coral pill ("3", or "9+").

### `/notifications`

A new top-level route, `app/notifications/`, signed-in only, guarded the
way `app/account` is (`await connection()` + `getUser()` + `redirect`
inside a Suspense boundary; `cacheComponents` is on). It uses the same
header and shell as `/account`, since it belongs to neither side.

- Heading "Notifications", and a "Mark all as read" button, shown only
  while something is unread.
- Newest first, 30 at a time, with "Show more" under the list.
- Each row: title, body if there is one, when ("5 minutes ago",
  "Yesterday", then a date, UK time via `lib/uk-time.ts`), and the
  business's name where `business_id` is set and the person belongs to
  more than one business.
- **Unread** rows have the title in bold and a coral dot at the left
  edge, with visually hidden text "Unread" so it is not colour alone.
  Read rows are regular weight with no dot.
- The whole row is a link to `href`. Following it marks that one as
  read. A row with no `href` is not a link and has a "Mark as read"
  button instead.
- A notification stays unread until it is clicked or marked. Opening the
  page does not mark everything as read, or nothing would ever be seen
  in bold.
- Each row has a delete button (bin icon, `aria-label="Delete
  notification: {title}"`). It deletes straight away with no confirm
  dialog; a notification is not worth one. Deleting is permanent.
- Empty: "Nothing yet. We'll tell you here when something happens with
  your offers, vouchers and the businesses you follow."
- Mark as read, mark all as read and delete are server actions in
  `app/notifications/actions.ts`, using the person's own session (not
  the service role) so RLS is what stops one person touching another's.
  They are one-button actions, so plain server-action forms, with
  optimistic updates so the row changes at once. After each, the header
  dot must agree with the list without a reload.

### The other "Notifications"

`/account/notifications` is the email preferences page and is labelled
"Notifications" in `components/account-settings-nav.tsx`. Two things
with one name will confuse people. Relabel that nav item and the page's
heading to "Email preferences" (URL unchanged), and add a quiet link
from `/notifications` to it: "Choose which emails you get". Update any
test or help page that looks for the old label.

## Tests

`npm run test:unit`

- Each builder in `lib/notifications.ts`: title, href and dedupe key for
  a known input; every `href` starts with a single `/`.

`npm run test:e2e` — new `tests/e2e/notifications.spec.ts`, seeding rows
with the admin API as the other specs do:

- No unread: no dot, no pill. One unread: the dot is on the avatar, and
  the menu shows "Notifications" with "1".
- The same person sees the same dot on `/dashboard` and on
  `/business/dashboard`.
- The page lists newest first; the unread one is bold and marked.
- Clicking a notification goes to its `href`, and it is no longer
  unread when they come back; the dot goes when the last one is read.
- "Mark all as read" clears the lot.
- Delete removes the row, and it stays gone after a reload.
- One end-to-end event: an admin approves an offer and the business
  owner has a notification that links to their offers.

In `tests/e2e/security.spec.ts`:

- One person cannot select, update or delete another's notifications.
- An authenticated browser client cannot insert a notification.
- `update` cannot change `title`, `href` or `user_id`.

`tests/e2e/accessibility.spec.ts` covers `/notifications` too.

## Docs to update when it is built

- `CLAUDE.md`: a `notifications` bullet under the database schema, and
  `/notifications` in the route table.
- `README.md`: a short section beside the one about emails.
- `docs/ROADMAP.md`: mark it done if it is listed, and note Realtime and
  in-app preferences as the follow-ups.
- The customer and business help pages, if they describe where to find
  things.
