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
   every nearby independent in it, not a pass per shop. Every business that signs
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

## Stack

- Next.js 16 (App Router, `cacheComponents`, React Compiler), React 19, TypeScript
- Tailwind CSS 4, shadcn/ui components on Base UI (`components/ui/`)
- Supabase: Postgres with row-level security, Auth, Storage
- Stripe Billing (Checkout, Customer Portal, webhooks)
- Resend for email; Vercel for hosting and the daily cron
- react-hook-form and Zod for forms
- Playwright end-to-end tests, and `node --test` for pure logic

## Getting started

```bash
npm install
cp .env.example .env.local   # or create it; see Environment variables
npm run dev                  # http://localhost:3000
```

| Command               | What it does                                         |
| --------------------- | ---------------------------------------------------- |
| `npm run dev`         | Dev server (Turbopack)                               |
| `npm run build`       | Production build                                     |
| `npm run lint`        | ESLint                                               |
| `npm run test:unit`   | Pure-logic tests (no browser, no database)           |
| `npm run test:e2e`    | Playwright tests (needs `SUPABASE_SERVICE_ROLE_KEY`) |
| `npm run test:e2e:ui` | The same, in Playwright's UI                         |

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
| `NEXT_PUBLIC_KEYSTATIC_STORAGE` and `KEYSTATIC_*`                              | Editing the blog on the live site through GitHub. See [docs/BLOG.md](docs/BLOG.md)                                                               |
| `NEXT_PUBLIC_SENTRY_DSN`                                                       | Optional: overrides the Sentry project in `lib/sentry.ts` (error reports are on for Vercel deployments, off locally)                             |

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

## Tests

`npm run test:e2e` starts the dev server if it isn't running. The setup creates test users and businesses through the Supabase admin API and removes them afterwards. Test email addresses end in `@test.internal`, which `sendEmails` never sends to. Skip the Stripe portal test with `--grep-invert "billing portal"` if you're not logged in to Stripe test mode.

## Still to do

Five stages, in order. Stage 1 can change what everything below it says, so it
goes first, and nothing in a later stage starts while an earlier one is open.
Only stage 4 is a feature build. Things get deleted when they're done rather
than ticked.

The ordering rule, from [docs/ROADMAP.md](docs/ROADMAP.md): _the biggest risk is
building too long before selling._ With 487 commits in the last 30 days and no
paying business yet, the product is not what's behind.

Harry's own: upgrade to Claude Max.

### Stage 1 — Prove the chain works. No new features.

None of this is a build. It's a day or two with a phone, and any of it can
invalidate the rest of the list, which is why nothing else starts first. The
real-phone scan is done: a printed code with the brand badge at error
correction H scans.

1. **Walk the whole flow, start to finish, and take notes on the onboarding.**
   Send the preview email, claim the business profile, update the profile,
   create a QR code for the business page, create a QR code for an offer, claim
   the offer and scan the QR, create a voucher and a QR code for it, scan that,
   then sign in as the business and redeem both by scanning. Then do it again
   as a business that never got a preview email, and once more with Google
   sign-in.
2. **The loyalty card, end to end.** Rebuilt in #164 and #165, so the old "all
   broken and wrong" note is stale, but it has not been through a real till:
   join by scanning, stamp, stamp to the reward, and what a customer sees when
   the card is full.
3. **Admin approval and decline.** Approve and decline both a business and an
   offer, and write down exactly what the business receives at each step. That
   note becomes the work in stage 3.

### Stage 2 — True before you email a single business

Each of these is an afternoon or a form, and each one is painful to discover
after outreach has started.

- **ICO registration.** A UK data controller processing names, emails,
  birthdays and visit history. A fee and a form, not a project, but not
  optional: ico.org.uk/for-organisations/data-protection-fee, then add the
  number to the privacy policy and the other legal pages (company number is
  already in `lib/legal.ts`).
- **Resend's limits.** The free plan is 3,000 a month _and_ 100 a day, and the
  daily cap goes first: daily summaries alone are about 75 a day at 50 active
  businesses, one offer announced to 150 followers is 150 in a burst, and the
  1st of the month adds every monthly report. Supabase's sign-in emails come
  out of the same quota. Move to Pro ($20/mo) before daily sends reach ~70, or
  before the first business with more than ~80 followers announces an offer.
- **A second Supabase project for development**, so tests stop running against
  the live database. One accidental e2e run during launch week is worse than
  the day this costs.
- **Decide the email volume.** A business that signs up and does nothing gets 7
  emails in 21 days (welcome, setup nudge, loyalty pitch, second nudge,
  founding places, results, check-in). All verified working, there are just a
  lot of them. Related: do we prompt a customer to follow the business when
  they claim an offer, and does a business with a lot of followers become
  expensive to email?
- **Apply for the Apple Developer and Google Wallet issuer accounts.** The
  build is post-launch (app improvements, 1), but approval takes weeks, so the
  applications go in now.

### Stage 3 — The gaps that lose a customer

These are the places the product breaks in front of someone. Small builds,
each tied to a moment in stage 1's walkthrough.

- **Decide whether editing a business page needs review**, the way an offer
  edit does ([docs/OFFER-EDIT-REVIEW.md](docs/OFFER-EDIT-REVIEW.md)). If it
  does, reuse that flow so the page never goes offline while it's reviewed.
- **Decline messages, and a history.** A set of polite, helpful, ready-to-send
  messages for declining a business or an offer, with matching help-centre
  wording, plus a log of approval reasons and resubmissions so there's a
  history when a business asks.
- **Staff documentation on redemptions**, for the people behind the counter.
  One printable page. The till is where this product fails quietly.
- **A manual stamp**, for when scanning fails and the customer's phone is dead
  or the camera won't open. Staff need a way through that doesn't send the
  customer away.
- **Onboarding when a business fits no category.**

### Stage 4 — The one build that earns month two

**The attributed repeat-visit report.** First visits Promotello sent, how many
came back, how many became regulars, per business. It is the only number a
loyalty app can't print, the reason a business renews rather than cancels in
month two, and the thing that makes £24 a month read as cheap rather than
expensive — see [Positioning](docs/ROADMAP.md#positioning-what-a-loyalty-app-cant-copy).
Everything it needs is already tracked: views, claims, redemptions, stamps, QR
scans, repeat visit rate and cross-visits. This is a reporting job, not new
instrumentation. Covers the old note about tracking conversion per business and
wanting a profile for each customer.

With it done: **the offline sales pack.** Sales sheets showing a live QR code
for a loyalty card, how it looks on a customer's phone, the offers, the
directory page, the pricing — and a page of the report, which is the part no
competitor's sheet can show.

### Stage 5 — Not before launch

Kept, not forgotten. Nothing here stops a business paying.

- Add custom URL as a premium feature
- What a customer or owner sees when a voucher offer is claimed, and whether an
  animation belongs there.
- The "Promotello isn't in your area yet" bar with an email field, as a
  waitlist rather than a dead end. Note [docs/MULTI-CITY.md](docs/MULTI-CITY.md):
  the IP lookup names the wrong town often enough that it was removed on
  purpose, so this belongs in the location search where someone names their own
  town, not in a bar that guesses. Needs a decision on how a waitlist is told
  when its city opens, and a VPN test either way.
- Joining a loyalty card by phone number. Needs an SMS sender first, or a guest
  who gives only a number has no way back to their card.
- A hint and a link to the offer QR code, with a prompt someone can paste into
  ChatGPT to make their own poster.
- Custom Supabase domain.
- Secure every social account with keychain passwords and the right phone
  numbers and email addresses.
- 3 December: transfer the YouTube channel to harry@promotello.com (not
  possible until the Google account is out of trial — set up YouTube for the
  user, make them a manager, wait 7 days), then add YouTube to Search Console.
- A BIMI mark certificate (VMC or CMC) so Gmail and Apple Mail show the logo.
  The logo and the DNS record are already in place.
- Apple sign-in on the login and register pages: quicker than verifying email.
- More poster sizes, including something smaller than the two we offer.
- Generate a window poster for every business that signs up, printed and posted
  through an API (Printful: documented REST API, kiss-cut stickers, printed in
  the UK), and let businesses buy sticker sheets of their own code.
- Stripe Managed Payments needs a VAT ID we won't have until the £90k
  threshold. At that point registering for VAT and turning on Stripe Tax is far
  cheaper than Managed Payments' extra ~3.5%, and Stripe doesn't have to become
  the seller. Nothing to do now.
- Events: built and hidden until there are enough customers (`lib/features.ts`).
- Security and email preference guides in both help centres are still in the
  older formal voice. Left that way on purpose.
- Android and iOS apps with notifications.

### App improvements

From [docs/ROADMAP.md](docs/ROADMAP.md), in the order to build them, re-cut on 9 November 2026 against [Positioning](docs/ROADMAP.md#positioning-what-a-loyalty-app-cant-copy). Joining without an account is built, by email. A guest card should go straight into the Wallet once passes exist, so 1 finishes that thought.

Create own wallet apps instead of being tied to apple and google. use our own push and scanning

1. Apple and Google Wallet passes. Apply for an Apple Developer account and a Google Wallet issuer account first, as approval takes time
2. Switching kit: CSV import of members and stamp balances, and a one-time starting balance from a paper card
3. The attributed repeat-visit report: first visits Promotello sent, how many came back, how many became regulars. The one number no loyalty app can print, and the reason a business renews
4. Loyalty in discovery: cards on the offers and businesses listings with a filter for them, so a card is seen by people who have never been in
5. One wallet for the street, then the Bristol passport trail: every nearby independent in one place, then stamps collected across members
6. Customer list, segments (lapsed, VIP) and CSV export with consent flags
7. Customer refer-a-friend
8. Wallet push messages and location alerts (needs 1)
9. QR poster sizes and designs + sticker request through AP

Parked on purpose, as feature depth that only invites a comparison with a £10 stamp-card app. Build one when a paying business asks twice:

- Multiple cards and reward ladders (5 stamps = pastry, 10 = coffee)
- Double-stamp days, reusing the quiet-hours schedules
- Surprise rewards and scratch-to-win / wheel spin daily - check if prize to claim. business lists prizes and quantities, spin without account, claim needs created account. Is it gambling? Create nice branded wheel poster to put next to bar, 1 spin per device per day? (your note, kept: the wheel is the one parked idea with a poster behind it, which makes it the first to unpark)
- SMS credits, NFC stamp tags, spend-based points, VIP tiers, Zapier

Smaller gaps:

- Business profiles: photo gallery and social links
- Offer types beyond a discount — scoped in [docs/OFFER-TYPES.md](docs/OFFER-TYPES.md)
- Admin dashboard: check it shows weekly active businesses, trial-to-paid and repeat visit rate
