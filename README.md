# Promotello

**A local network that turns first-time visitors into regulars.** A directory customers browse, offers they claim on their phone, a stamp card that brings them back, and QR posters in the window tying the shop to all three. Launching in Bristol first.

Promotello is **not a digital loyalty card app**, and that difference is the whole business — see [How we sell it](#how-we-sell-it).

- **Businesses** sign up, post offers, run a digital stamp card, print QR posters, and see who follows them. Paid plans (Pro, Growth) add unlimited offers, automations, quiet-hours offers and monthly reports.
- **Customers** browse by city, area and category, claim vouchers, collect stamps and follow businesses for new-offer emails.
- **Admins** approve businesses and offers, manage cities and areas, build previews for businesses they're approaching, and watch platform metrics.

Product plan and priorities: [docs/ROADMAP.md](docs/ROADMAP.md). More than one city: [docs/MULTI-CITY.md](docs/MULTI-CITY.md). How Stripe billing is set up: [docs/STRIPE_GO_LIVE.md](docs/STRIPE_GO_LIVE.md). Finding businesses and writing to them: [docs/OUTREACH.md](docs/OUTREACH.md). Making videos for social: [docs/SOCIAL-VIDEO.md](docs/SOCIAL-VIDEO.md).

## How we sell it

The strategy and the build order are in [docs/ROADMAP.md](docs/ROADMAP.md), who
to write to and what to send in [docs/OUTREACH.md](docs/OUTREACH.md). This is the
short version, and every page of copy, email and sales sheet should agree with
it.

### The sentence

> Promotello brings you customers from your own high street, gives you the card
> and the posters that turn them into regulars, and then shows you how many came
> back.

### Who we are not

Searching "digital loyalty card" returns a dozen vendors — Stamp Me, Loopy
Loyalty, Square Loyalty, LoyBee, TapStamp, Loyaltify, Passcard, UpCard, Inkmark,
Lovely Loyalty, Oappso — several of them under £15 a month and some free. Every
one of them sells software to **one shop**, and the card only ever reaches people
who already walked in: the shop brings its own customers, the software counts
them.

Promotello has the other half. A directory customers browse by city, area and
category, followers, new-offer emails, SEO pages for every business and offer,
and a customer wallet that holds the lot. That is the part a loyalty app can't
copy quickly, because it is local density rather than code.

**So never sell on card features.** Sell the network, with the card included. A
conversation about stamps per reward is a conversation we lose on price.

### The three claims only we can make

1. **A card people join before they have ever been in.** Every rival's card is
   invisible to anyone who isn't already a customer. Ours is on a public business
   page, on the area and category pages, and on a poster in the window — so "5
   stamps, then a free coffee" is a reason to try the place, not only a reason to
   return. _Live: the card and join button on the business page, the loyalty
   poster. Planned: cards on the listing pages and a filter for them._
2. **One wallet for the whole street.** Customers keep one Promotello wallet with
   every nearby business in it, not a pass per shop. Every business that signs
   up makes the customer side better for the rest, which is why the pitch to the
   twentieth business on a street is stronger than the pitch to the first. _Live:
   `/dashboard` holding vouchers and cards. Planned: grouping by area, and the
   Bristol passport trail._
3. **We can tell a business who came back.** No loyalty app can report a first
   visit, because it was never part of one. _Live: views, claims, redemptions,
   stamps, QR scans, plus repeat visit rate and cross-visits in admin. Planned:
   the per-business report attributing first visits to Promotello and following
   them to regulars._

Claims 1 and 3 are the ones that close deals. Claim 2 gets stronger with every
business signed on the same street, and is worth nothing until a street has ten
of them — which is the real reason density beats reach.

### What to show, in this order

| Show them                                                      | Why it lands                                                | Where it is                        |
| -------------------------------------------------------------- | ----------------------------------------------------------- | ---------------------------------- |
| Their own profile, pre-built from public information           | It already exists; they only have to claim it               | Admin previews                     |
| The QR poster with their logo on it                            | Something physical, on day one, no hardware                 | `/poster/<code>`                   |
| A customer scanning it: page, then claim or join in seconds    | No app to download, nothing to install at the till          | Any phone                          |
| Staff scanning a voucher or a card with their own phone camera | Proves it survives a queue                                  | Dashboard → redemptions, loyalty   |
| The directory page for their street                            | The part no loyalty app has, and their neighbours are on it | `/explore/bristol/gloucester-road` |
| The numbers after a fortnight                                  | Turns a trial into a renewal                                | Dashboard → analytics              |

### Words to use, and words to drop

| Say this                                | Not this                                                         |
| --------------------------------------- | ---------------------------------------------------------------- |
| local network, your high street         | loyalty platform, rewards programme                              |
| customers we send you                   | footfall uplift, engagement                                      |
| a stamp card comes with it              | our loyalty features                                             |
| free to start, live in about 15 minutes | 30-day free trial (lead with free, not trial)                    |
| £24 a month, everything included        | per-location pricing, per-visit pricing                          |
| your street, Gloucester Road, Bristol   | your area (never — see [docs/MULTI-CITY.md](docs/MULTI-CITY.md)) |

Two more lines worth keeping word for word:

- **"A card is a promise."** Once a customer holds a card, the deal on it can't
  be edited — change the offer by starting a new card and the old one keeps
  working. In a market of configurators, that is a trust claim, not a missing
  feature.
- **"No app, no hardware, no contract."** True of us, and not true of most of
  the list above. It is already the line in the hero and on the one-pager.

### Where this copy lives

Changing the positioning means changing these, together, or the site drifts back
to selling stamp cards:

| What                                              | Where                                                                  |
| ------------------------------------------------- | ---------------------------------------------------------------------- |
| Hero, the loop, the feature sections, pricing FAQ | `app/(business)/business/(business-marketing)/page.tsx`                |
| The printable one-pager for outreach              | `app/(business)/business/(business-marketing)/why-promotello/page.tsx` |
| Plan names and what each tier is for              | `planSummaries` in `components/business-marketing.tsx`                 |
| Page titles and descriptions                      | `metadata` in each marketing page                                      |
| Footer tagline, blog header                       | `components/site/footers.tsx`, `components/blog/blog-listing.tsx`      |
| Setup checklist and lifecycle emails              | `lib/business-lifecycle.ts`                                            |
| What AI crawlers are told                         | `app/llms.txt/route.ts`                                                |

### The price, in one line

£24 a month for the network, with loyalty, offers, posters, follower emails and
the directory included. The loyalty-only tools run £25 to £49 and bring nobody
through the door. Compare Promotello with a week of ads, not with a stamp-card
app.

### What each plan is for

Set 24 November 2026. One rule decides which plan a feature goes in, so it
isn't argued again each time.

- **Free spreads Promotello.** Anything that puts our QR code or our link in
  front of more shoppers is free. It is our marketing as much as theirs.
- **Pro earns or saves the business money.** Anything that brings a customer
  back, brings a new one in or saves the owner time.
- **Growth runs without them.** Anything that keeps working when nobody at the
  business is thinking about it.

| Plan   | Has today                                                                                                                                                                              | Planned                                                                                                  |
| ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Free   | Page in the directory, 1 live offer, scan-to-redeem vouchers, 1 QR poster with scan counts, team members, share links and Instagram images, a link-in-bio page they arrange, 30-day analytics, the short monthly report | The review poster, the print kit, offer templates, a Wi-Fi poster, refer a neighbour |
| Pro    | Unlimited live offers, the loyalty card, a poster for every spot with scans compared, followers emailed every new offer, review prompts after a visit                                  | Bring a friend, a private feedback option, the staff board                                               |
| Growth | Welcome, birthday and win-back emails, quiet hours, the full monthly report, first-timers month by month                                                                               | Offers that relaunch themselves, a weekly post ready to share, a second location, the customer list and export, joint offers with a neighbour, events (built, hidden) |

`planComparison` in `lib/plan-features.ts` is what the site prints, and it is
the source for "Has today". The "Planned" column is intent. Move a feature into
that file in the same commit that ships it, never ahead of it.

**Why this matters now.** Pro today is a loyalty card with the limits taken
off, which is what a loyalty app sells. Bring a friend is the first Pro feature
no loyalty app has, and the free column is what puts our code in a window
whether or not the business ever pays. The order they get built in is in
[Still to do](#still-to-do).

## Stack

- Next.js 16 (App Router, `cacheComponents`, React Compiler), React 19, TypeScript
- Tailwind CSS 4, shadcn/ui components on Base UI (`components/ui/`)
- Supabase: Postgres with row-level security, Auth, Storage
- Stripe Billing (Checkout, Customer Portal, webhooks)
- Resend for email; Vercel for hosting and the daily cron
- react-hook-form and Zod for forms
- Playwright end-to-end tests, and `node --test` for pure logic

## Getting started

The database runs on your machine, so Docker Desktop has to be running first.

```bash
npm install
npm run db:start             # the local database, in Docker
npm run db:reset             # build it from the migrations, then seed it
npm run db:env               # prints the local values for .env.local
npm run dev                  # http://localhost:3000
```

`cp .env.example .env.local` first if you have no `.env.local` yet, then put the
three values `db:env` prints into it. [docs/ENVIRONMENTS.md](docs/ENVIRONMENTS.md)
is the longer version, including what you can and cannot break.

### What you run

| Command               | What it does                                 |
| --------------------- | -------------------------------------------- |
| `npm run dev`         | Dev server (Turbopack)                       |
| `npm run build`       | Production build                             |
| `npm run lint`        | ESLint                                       |
| `npm run test:unit`   | Pure-logic tests (no browser, no database)   |
| `npm run test:e2e`    | Playwright tests, against the local database |
| `npm run test:e2e:ui` | The same, in Playwright's UI                 |

### The database

| Command             | What it does                                                          |
| ------------------- | --------------------------------------------------------------------- |
| `npm run db:start`  | Start the local database (needs Docker running)                       |
| `npm run db:stop`   | Stop it                                                               |
| `npm run db:reset`  | Rebuild from the migration files, then reseed. Do this freely         |
| `npm run db:seed`   | Put the sample Bristol businesses back without rebuilding             |
| `npm run db:status` | The URLs and keys the local stack is serving                          |
| `npm run db:env`    | The three `.env.local` lines for the local database                   |
| `npm run db:ship`   | **The only command that writes to the live database.** Confirms first |

`db:reset` is always safe — the local copy is a throwaway and rebuilds in about
a minute. It also re-proves that the migration files can build a working
database from nothing, which is the only place they are tested as a sequence.

The local stack runs on **553xx** rather than the usual 543xx, because another
Supabase project on this machine holds those ports. Studio is at
<http://127.0.0.1:55323> and every email the app sends lands at
<http://127.0.0.1:55324> instead of a real inbox.

**Never type `--remote` on a reset.** `npm run db:reset` rebuilds your laptop's
copy; `supabase db reset --remote` would wipe the live project.

`npm run build` and `npm run dev` share the `.next` folder, so restart the dev server after a build.

## Environment variables

Set these in `.env.local`, and in Vercel for **both Production and Preview** (the build needs the Supabase ones).

| Variable                                                                       | Needed for                                                                                                                                       |
| ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`             | Everything                                                                                                                                       |
| `SUPABASE_SERVICE_ROLE_KEY`                                                    | Server jobs (emails, webhooks, cron) and the tests                                                                                               |
| `NEXT_PUBLIC_SITE_URL`                                                         | Canonical links, sitemap and emails (default `https://www.promotello.com`)                                                                       |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PORTAL_CONFIGURATION_ID` | Billing                                                                                                                                          |
| `RESEND_API_KEY`, `EMAIL_FROM`, `EMAIL_REPLY_TO`                               | Sending email. Without them nothing is sent, which keeps development safe                                                                        |
| `CONTACT_EMAIL`                                                                | Where contact form messages go (default support@promotello.com)                                                                                  |
| `CRON_SECRET`                                                                  | The daily job at `/api/cron/daily`                                                                                                               |
| `NEXT_PUBLIC_AUTH_PROVIDERS`                                                   | Which "Continue with…" buttons to show: `google` for now (`google,apple` once Apple is set up). See [docs/SOCIAL_LOGIN.md](docs/SOCIAL_LOGIN.md) |
| `NEXT_PUBLIC_KEYSTATIC_STORAGE`, `NEXT_PUBLIC_KEYSTATIC_GITHUB_APP_SLUG`       | Editing the blog on the live site through GitHub. Left empty the editor runs against local files. See [docs/BLOG.md](docs/BLOG.md)               |
| `NEXT_PUBLIC_SENTRY_DSN`                                                       | Optional: overrides the Sentry project in `lib/sentry.ts` (error reports are on for Vercel deployments, off locally)                             |

Two more are read only by the tests, and both have working defaults:
`PLAYWRIGHT_BASE_URL` (where Playwright points, default
`http://localhost:3000`) and `E2E_REAL_EMAIL` (set to `1` to include the one
spec that sends a genuine email, which also needs `RESEND_API_KEY`).

`PROD_DB_URL` belongs in **`.env.production.local`**, not `.env.local`. It is
the live database's connection string, read only by `npm run db:ship`, and
keeping it out of the file the app loads is the point. Dashboard → Settings →
Database → Connection string → URI.

`NODE_ENV`, `CI` and `NEXT_PUBLIC_VERCEL_ENV` are set by Next.js, CI and Vercel
— never by hand.

Stripe prices are found by lookup key (`pro_monthly`, `growth_monthly` and so on), so the same code works in test and live mode.

## How it's organised

| Path                                                         | What's there                                                                                    |
| ------------------------------------------------------------ | ----------------------------------------------------------------------------------------------- |
| `app/(customer-marketing)/`                                  | Public site: home, offers, businesses, explore, categories, city and area pages                 |
| `app/(business)/business/(business-marketing)/`              | Pages for businesses: features, pricing, demo, waitlist, previews                               |
| `app/(business)/business/(business-dashboard)/[businessId]/` | A business's dashboard                                                                          |
| `app/dashboard`, `app/account`                               | A customer's vouchers, loyalty cards and settings                                               |
| `app/admin`                                                  | Platform admin                                                                                  |
| `app/api/cron/daily`                                         | Daily job: automations, setup and trial emails, monthly reports, preview clean-up               |
| `components/`                                                | App components; `components/ui/` are shadcn primitives                                          |
| `lib/`                                                       | Data loading, emails, billing, validation and other shared code                                 |
| `content/blog/`, `keystatic.config.ts`                       | Blog posts (Markdoc) and the Keystatic editor at `/keystatic`; see [docs/BLOG.md](docs/BLOG.md) |
| `supabase/migrations/`                                       | Database schema, one file per change                                                            |
| `tests/e2e/`                                                 | Playwright tests; `tests/global-setup.ts` seeds test users and data                             |

### Addresses

- Bio links: `/@harbourgrind`, one per business, arranged by them at `/business/<id>/bio`. A handle they change keeps resolving, because it has been in a bio and on a poster.
- Businesses: `/businesses/harbour-grind-harbourside-bristol-5d6ki4` (name, area, city, short id). Offers: `/offers/<business>-<title>-<id>`. The database sets these; old addresses (including `/businesses/<uuid>`) redirect permanently from `proxy.ts`.
- Listing pages show every live city, or one when the city is in the address: `/offers/bristol`, `/explore/bristol/gloucester-road`, `/categories/bakeries/bristol`. Without one, visitors see the city they chose or the one they're in.

### Conventions

- **Database changes** are new files in `supabase/migrations/`; never edit one that has run. Every table has RLS. Writes that need more than RLS (creating a business, redeeming, approving) go through `SECURITY DEFINER` functions.
- **Forms** where people type data use react-hook-form with a Zod schema, showing errors under each field (`components/field-error.tsx`). Shared rules live in `lib/validation.ts`. One-button actions (approve, delete, stamp) are plain forms posting to server actions.
- **Brand colours** are used directly in class names: `#17233B` navy, `#FFF8F0` off-white, `#FF593F` coral.
- **Copy** is UK English.

## How a business starts

Two ways in, one flow after it.

- **We build the page** from the outside and email a preview link; somebody
  claims it (`lib/claim-preview.ts`).
- **They sign up** and give a name, a category and an address (`/onboarding`).

Either way they land on **`/business/setup/[businessId]`**: the same seven
steps in the same order, beside a picture of the page filling in as they go.
Nothing is in the approval queue until the business sends it from there —
`review_requested_at` is written by `request_business_review()` and by
nothing else, whoever wrote the words on the page.

The one thing that differs is a sentence: on a page we built, the fields we
guessed at say so ("We wrote this from the outside, so read it over"). That
is about whose words those are, and it is said on the field being edited.
Everything else — the dashboard, the checklist, the queue, the emails — is
the same for both, deliberately, so a new feature never has to ask which
kind of business it is looking at.

### How one stops

Four ways, and only one of them is permanent.

|             | Who       | What happens                                                                                   |
| ----------- | --------- | ---------------------------------------------------------------------------------------------- |
| **Reject**  | Admin     | Never goes public. The owner is told why.                                                      |
| **Suspend** | Admin     | Comes off the directory with its offers. Nothing is deleted, and claimed vouchers still work.  |
| **Close**   | The owner | Their own decision, from Settings. Invisible, and the subscription is cancelled at period end. |
| **Delete**  | Admin     | Permanent. Everything goes, including vouchers and stamp cards their customers hold.           |

Delete exists for test businesses and for a business that asks to be erased,
not for a decision that could be a suspension. The name has to be typed back,
checked in `admin_delete_business()` rather than only in the browser, Stripe is
cancelled outright first, and what was destroyed is counted into the audit log
before the row goes — with no `business_id`, because `audit_logs` cascades and
the record would otherwise delete itself.

## Signing in

There are no passwords. Somebody types their email address, Supabase emails
them a six-digit code, and they type it in — customers and businesses alike.
Google sign-in still works alongside it.

- `components/email-code-form.tsx` is both forms: the address, then the code.
  `mode="sign-up"` is the only difference, and it decides whether an address
  nobody has used makes an account or an apology.
- The browser verifies the code, so the session exists before the server sees
  it. `/auth/signed-in` is the server's half: the welcome email, a business
  marked as one, a claimed preview, and where they land
  (`lib/after-sign-in.ts`, shared with the Google callback).
- `/forgot-password` and `/reset-password` are gone, redirected to `/login` in
  `next.config.ts`. There is nothing to reset.

### What Supabase has to be set to

| Where                                                         | Setting                                    | Why                                                                                                                                                                        |
| ------------------------------------------------------------- | ------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Authentication → Email Templates → **Magic Link**             | must contain `{{ .Token }}`                | This is the template that carries the code for anyone who already has an account. Without the token it sends a link instead, and the form asks for a code nobody was sent. |
| Authentication → Email Templates → **Confirm signup**         | must contain `{{ .Token }}`                | A brand-new address gets this one, not Magic Link. Miss it and signing up breaks while signing in works.                                                                   |
| Authentication → Providers → Email → **Email OTP Expiration** | 3600 (an hour)                             | What the form tells people. Supabase refuses anything over 86400.                                                                                                          |
| Authentication → Providers → Email → **Email OTP Length**     | 6                                          | The forms say "6-digit" and `lib/sign-in-code.ts` checks for six.                                                                                                          |
| Authentication → Providers → Email → **Confirm email**        | on                                         | Typing the code is the confirmation.                                                                                                                                       |
| Authentication → Rate Limits → **emails sent per hour**       | well above a day's sign-ins                | Every sign-in is an email now. The built-in SMTP allows 2 an hour, which is why custom SMTP is not optional here.                                                          |
| Authentication → SMTP                                         | the Resend sender on `auth.promotello.com` | Already set; see [Emails](#emails).                                                                                                                                        |

Email and password sign-in is still enabled at the Supabase end, which is how
the test suite signs in through the API. Nothing in the product offers it, and
turning it off is a one-switch decision once the tests are converted.

## Emails

Two sending subdomains in Resend, so sign-in emails keep their own reputation:

- `auth.promotello.com`: Supabase's sign-in emails only (the six-digit codes people sign in with, and email-change confirmations), from `no-reply@auth.promotello.com`, set in Supabase's SMTP settings. Every sign-in sends one, so the rate limits in Supabase matter: see [Signing in](#signing-in).
- `mail.promotello.com`: everything the app sends, from `EMAIL_FROM` (`Promotello <offers@mail.promotello.com>`). Replies go to `EMAIL_REPLY_TO` (default hello@promotello.com).

Mail apps that support BIMI show the Promotello logo next to emails: the logo is `public/bimi/logo.svg` (SVG Tiny PS, don't edit it casually) and the DNS record is `default._bimi.promotello.com`. Gmail and Apple Mail also need a mark certificate (VMC or CMC).

Sent with Resend from `lib/email.ts`, using `brandedEmail()` for the layout. Customer emails from a business show as "_Business_ via Promotello". Every marketing email has an unsubscribe link. Contact form messages go to `CONTACT_EMAIL` (default support@promotello.com) with the sender as reply-to. Every email is sent from the app; there are no Supabase edge functions. Business notifications (daily summary, fully claimed and low inventory alerts) are in `lib/business-notifications.ts`.

## In-app notifications

Everything Promotello emails about an account, it also writes to that person's
notification list at `/notifications`. Somebody who turned an email off still
sees what happened; somebody already on the site doesn't have to go to their
inbox.

The list belongs to the **user account**, not to a business, so a person who is
a customer and also runs a shop has one list and one dot on their avatar
wherever they are. `notifications.business_id` only says which of their
businesses a line is about.

- `lib/notifications.ts` writes the words — one builder per event, pure, covered
  by `npm run test:unit`. Titles are stored as written, so an old line still
  reads correctly after the offer is renamed or deleted.
- `lib/notify.ts` sends them: `notifyUsers()` and `notifyBusinessManagers()`,
  with the service role, beside the email that already goes out for the same
  event. Neither throws, and a failure never blocks the approval or claim that
  caused it. A `dedupe_key` stops the same event telling somebody twice.
- Nobody inserts from the browser: there is no insert policy. A person can mark
  their own as read (a column grant on `read_at` only) and delete them.
- The avatar's coral dot comes from `components/site/use-unread-notifications.ts`,
  which recounts on navigation and on window focus. There is no Realtime
  subscription.
- `/account/notifications` is **Email preferences** and decides email only.
  There are no in-app preferences yet.

Spec: [docs/NOTIFICATIONS-SPEC.md](docs/NOTIFICATIONS-SPEC.md).

## Tests

`npm run test:e2e` runs against **the database on your machine**, so a full run
is safe and a test that crashes before tidying up cannot leave anything in the
real directory. It used to write to the live database, which is how nine fake
businesses once ended up there. Check `.env.local` points at `127.0.0.1` before
a run; [docs/ENVIRONMENTS.md](docs/ENVIRONMENTS.md) covers it.

It starts the dev server if it isn't running. The setup creates test users and businesses through the Supabase admin API and removes them afterwards. Test email addresses end in `@test.internal`, which `sendEmails` never sends to. Skip the Stripe portal test with `--grep-invert "billing portal"` if you're not logged in to Stripe test mode.

## Still to do

Re-cut 24 November 2026, against the state of the live database rather than
from memory. The tracks referred to are the ones in
[docs/ROADMAP.md](docs/ROADMAP.md).

Things get deleted when they're done rather than ticked.

**Where it actually stands.** 1,156 commits since October. 113 leads, 56 of
them cleared to email, 1 written to. 19 sample businesses, **one real
customer** (Quayside Coffee) and Dublin Pub closed. 2 claims ever, 1 of them
used. 2 followers. 14 loyalty cards, 12 of them held by someone with no
account.

Nothing is in the way of the next email. The two test businesses that were
sitting in the public directory are deleted, `OUTREACH_EMAIL_FROM` is set, and
both pending migrations are live.

**The ordering rule has not changed:** the biggest risk is building too long
before selling. The product is not what's behind.

### Stage 1 — Send the first batch

Not a build. Nothing below stage 2 is worth another commit until this is
underway.

- **Send them**, per [docs/OUTREACH.md](docs/OUTREACH.md). 56 leads are cleared
  and waiting. A handful a day from the outbox, each one read before it goes.
- **Watch the first ten before sending the next forty.** Opened and not
  claimed means the preview is not convincing; nobody opening means the subject
  is wrong. The previews page tells those apart, and they need different fixes.

### Alongside stage 1 — More than a loyalty card

Added 24 November 2026. Indistamp has sold a loyalty card to Bristol's local
businesses since 2024, so a pitch that reads as "a loyalty card with a
directory attached" loses to the name they already know. These are the
features that make the difference visible, ranked by how much work each is.
Where each one sits follows [What each plan is for](#what-each-plan-is-for).

**This does not pause stage 1.** Sending carries on while these are built, and
the first replies decide whether the order is right. The sizes are estimates
from reading the code, not from building anything.

|     | What                           | Plan   | Work                    | What is there already, and what is left                                                                                                                                                                                          |
| --- | ------------------------------ | ------ | ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Print kit**                  | Free   | Nearly done             | A4, A5 and two per sheet are live. Four per sheet and the review poster are on `feat/a-poster-that-asks-for-a-review`. Left: merge that, then name the set a print kit on the QR page and the features page                     |
| 2   | **Offer templates**            | Free   | Small, 1 to 2 days      | `lib/offer-kinds.ts` has the kinds and `lib/starter.ts` already carries an offer line into the form. Left: a short list of seasonal presets in front of it, so the one free offer doesn't go stale                              |
| 3   | ~~**Link-in-bio page**~~ **Built** | Free | Shipped 25 November 2026 | `/@handle` is the page and `/business/<id>/bio` arranges it: order, what is switched on, their own links, a notice, WhatsApp, opening hours, a photo strip, and taps counted per row. Left: a live preview and their own accent colour. See [The bio page is theirs](docs/ROADMAP.md#the-bio-page-is-theirs) |
| 4   | **Private feedback option**    | Pro    | Small, 2 to 3 days      | `/review/<business_id>` counts the click and forwards to Google. Left: a "tell us directly" choice beside it that emails the owner. Every customer sees both: choosing who gets asked for a review breaks Google's rules         |
| 5   | **Wi-Fi poster**               | Free   | Small, 2 to 3 days      | The poster designer. Left: a new layout. One code can't both join a network and open a page, so it is two codes on one sheet: Wi-Fi and the offer                                                                                |
| 6   | **Staff board**                | Pro    | Medium, about a week    | A search found nothing recording which team member scanned a voucher or added a stamp. That comes first, then the board: who brought the most scans and stamps this month                                                        |
| 7   | **Refer a neighbour**          | Free   | Medium, about a week    | Nothing. An invite link, and a month of Pro for both when the shop next door claims its page. It touches Stripe, which is why it isn't small                                                                                     |
| 8   | **Bring a friend**             | Pro    | Medium, 1 to 2 weeks    | Automations already issue a voucher to a person, and share links exist. Left: following the friend's first redemption back to who sent them, the reward for both, and limits against abuse                                       |
| 9   | **Joint offers with a neighbour** | Growth | Large                | Nothing, and worth nothing below ten businesses on a street. Behind stage 3                                                                                                                                                      |
| 10  | **Wallet passes**              | Pro    | Large, weeks            | [docs/WALLET-PASSES.md](docs/WALLET-PASSES.md). Stays in stage 5, for the reasons given there                                                                                                                                    |

**The cut before the next fifty emails:** 1, 2 and 3. About a week between
them, all free, and each one is something a business can be shown on day one.

**Then 8, bring a friend.** It is the answer to "how is this different from a
stamp card", and a friend who redeems is a customer we can prove we sent, so it
feeds stage 4 as well.

**Considered and left where it is: win-back in Pro.** Moving it is a small
change, but it is most of what Growth has, and it can't reach the people it is
for until the consent decision in stage 3 is made.

#### Growth, so it is worth moving up to

Added 24 November 2026. Growth's rule is that it runs without them. The full
table, with what each one builds on, is
[What Growth gets](docs/ROADMAP.md#what-growth-gets) in the roadmap. Sizes are
rough.

**Build first**

- **G1 · Offers that run themselves again.** Small. An offer already carries
  its days and hours. What is missing is the relaunch: when one expires or is
  fully claimed, a new run starts, so the page never sits empty.
- **G2 · A weekly post, ready to share.** Small. Every Monday the owner is
  emailed an Instagram image and caption for the current offer. The image and
  caption exist on every plan; Growth is not having to remember.
- **G8 · A second location included.** Medium to large. The reason to pay for
  Growth that isn't more emails. Needs the multi-location decisions in stage 5
  first: how the page, the offers and the loyalty card split between two shops.

**Then, as they are wanted**

- **G5 · Quiet-day suggestions.** Medium. The monthly report names the slowest
  day and offers a one-tap offer for it.
- **G7 · Customer list, groups and export.** Medium. Already promised to
  Growth, and it answers "what if I leave?".

**Held by the consent decision in stage 3.** These email customers, and most
cards are held by guests with no account, so they mostly can't fire yet.

- **G3 · "Nearly there" reminders.** Small. One or two stamps from the reward.
- **G4 · The claim that never became a visit.** Small. The same nudge as in
  stage 3, as an automation the business can see running.
- **G6 · Regulars' reward.** Medium. A thank-you voucher each quarter for the
  ten most frequent customers.

**Behind their gates:** G9 street benchmarks and G10 joint offers need a street
with enough businesses on it. G11 events is built and switched off
(`lib/features.ts`) until there are customers to see them.

### Stage 2 — What happens when one says yes

Nothing here is built for a queue of one. It is built for the week after the
first business claims its page, which is the first time any of it is used in
anger.

- **Build instagram page** make it look active and enticing
- **Instagram DM** follow ups

- **Walk a claim end to end on the live site, as them.** Claim the preview,
  finish the page, publish an offer, print a poster, add a stamp. It has been
  walked in pieces and not as one sitting.
- **Watch the approval queue daily** while the numbers are small enough that a
  business waiting a day is a business that goes quiet.
- **Resend's limits.** Free is 3,000 a month _and_ 100 a day, and the daily cap
  goes first: daily summaries alone are ~75 a day at 50 active businesses, one
  offer announced to 150 followers is 150 in a burst, and the 1st adds every
  monthly report. Supabase's sign-in emails come out of the same quota. Move to
  Pro ($20/mo) before daily sends reach ~70.

### Stage 3 — The half that doesn't exist

Track B, and the largest hole in the product. Two followers and two claims is
not a cold start, it is an empty room — and the pitch, the pricing and three of
our own claims all assume customers browsing a directory.

- **Decide the consumer acquisition plan.** Not a build and not a feature:
  local Instagram, press, the businesses' own channels, or paid. Everything
  else in this stage is worth less until this is answered, because there is no
  point building a weekly email with nobody to send it to.
- **Guest cards do not become followers.** 12 of the 14 cards held are guest
  cards with no account, and following needs a user — so those people cannot be
  reached by anything, ever, and no number of follow buttons changes it. The
  guest card page already asks them to make an account. Measure that step before
  building anything else here.
- **Win-back cannot reach the people it is for.** It targets customers who have
  visited before, and only emails followers. Either it reaches people with a
  card or a past redemption, with its own unsubscribe, or it stays a feature
  that mostly cannot fire. This is a consent decision, not a build.
- **Take the example businesses down.** Nineteen of the twenty-two live
  businesses are samples — `is_sample = true`, already out of the sitemap and
  noindexed, removed by `node scripts/sample-data.mjs remove`. They are
  scaffolding for showing the site to a business, which is exactly the wrong
  thing for a customer to browse: an offer that cannot be claimed anywhere. So
  they come down before customers are invited, not before businesses are.
  Decide the threshold, and check what removal leaves behind
  (`node scripts/remove-unused-images.mjs`).
- **A reason to come back.** A weekly "new near you" by area, from the offers
  that went live that week. The per-business follower email already does the
  hard half.
- **Open now, and near me.** Hours are stored; the listings don't use them. The
  one filter that makes a directory worth opening at six o'clock.
- **The claim that never became a visit.** Half the claims here have never been
  used, and each one is the cheapest attributed visit available. A nudge a
  couple of days after claiming, not just before expiry.
- **One wallet for the street** — group the customer's vouchers and cards by
  area rather than by business. Claim 2 of the three in "How we sell it", still
  unbuilt, and cheap.
- **Search** — make it more intelligent.

### Stage 4 — Make the number real

Track A. It is what we sell, what the guarantee is written against, and it is
thinner than the pitch implies.

- **Harden what counts as sent by us.** `sentByPromotello` only counts a claim
  or join an hour before the first visit, so a stranger who scans a window
  poster and walks straight in counts as nothing — the poster working, recorded
  as the poster not working.
- **A first visit without a claim.** Most people who find a business through us
  never claim anything. Decide what we will and won't claim as ours, and say it
  on the analytics page where the number is read.
- **A walk-in a member of staff can attribute.** One tap on the staff screen.
  The only way a barber or a salon ever shows a number.

### Stage 5 — Not before launch

Kept, not forgotten. Nothing here stops a business paying.

**Sales and sourcing**

- Pull the Bristol food hygiene data into a spreadsheet, sorted by type then
  street: https://ratings.food.gov.uk/api/open-data-files/FHRS855en-GB.xml
- Join Visit West: https://www.visitwest.co.uk/membership/about-membership/
- Printed QR stickers posted to businesses — find a supplier and work out costs.
- Design the post page in Stannp.
- Reword the sales pack title and description on the Sales page.
- Three real names on `/business/testimonials`, which redirects until they
  exist. The guarantee in the outreach email stands in for them meanwhile.

**Product**

- **Stronger Growth features** moved up: see "Growth, so it is worth moving up
  to" above.
- **Multi-location businesses.** One business on Gloucester Road may not want
  the same offer at both shops. Needs a view on how the profile page, offers
  and the loyalty card split.
- **Discounted subscription for two or more businesses.**
- **Wallet passes (Apple and Google), and the developer accounts for them.**
  Track C2: weeks of work for parity on a comparison we refuse, and it moves
  nothing in track A. Apply for the accounts when C2 is next, not before.
- **Apple sign-in** on login and register: quicker than verifying email. Needs
  an Apple Developer account.
- **The wheel.** A spin at the counter, one per device per day, prizes set by
  the business, a branded poster beside the till. Belongs to stage 3's problem,
  not to loyalty. Needs a view on whether a prize draw is a lottery under the
  Gambling Act before any of it is built.
- Card design and multi-stamp, then the switching kit (import members and paper
  balances). Cheap, and they close deals once there are deals to close.
- Customer list, segments and CSV export.
- The passport trail and group/BID accounts — behind stage 3's gate. A trail
  across businesses nobody visits has no users.
- Business profiles: photo gallery and social links.
- The "Promotello isn't in your area yet" bar with an email field, as a
  waitlist rather than a dead end. Note
  [docs/MULTI-CITY.md](docs/MULTI-CITY.md): the IP lookup names the wrong town
  often enough that it was removed on purpose, so this belongs in the location
  search where someone names their own town. Needs a decision on how a waitlist
  is told when its city opens.
- Events: built and hidden until there are enough customers (`lib/features.ts`).
- Android and iOS apps with notifications.

**Housekeeping**

- Test signing up with Google: does the claim happen automatically and land on
  the dashboard?
- Custom Supabase domain.
- Secure every social account with keychain passwords and the right phone
  numbers and email addresses.
- 3 December: transfer the YouTube channel to harry@promotello.com (not
  possible until the Google account is out of trial — set up YouTube for the
  user, make them a manager, wait 7 days), then add YouTube to Search Console.
- A BIMI mark certificate (VMC or CMC) so Gmail and Apple Mail show the logo.
  The logo and the DNS record are already in place.
- Stripe Managed Payments needs a VAT ID we won't have until the £90k
  threshold. At that point registering for VAT and turning on Stripe Tax is far
  cheaper than Managed Payments' extra ~3.5%. Nothing to do now.
- Security and email preference guides in both help centres are still in the
  older formal voice. Left that way on purpose.
- Social icons in email footers, once there's a following worth sending anyone
  to. The artwork, the links and the test are all still there — `social` in
  `emailShell()` turns them back on.
