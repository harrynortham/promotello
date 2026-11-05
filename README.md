# Promotello

Loyalty cards, offers and QR posters for independent businesses, with a local directory customers browse to find them. Launching in Bristol first.

- **Businesses** sign up, post offers, run a digital stamp card, print QR posters, and see who follows them. Paid plans (Pro, Growth) add unlimited offers, automations, quiet-hours offers and monthly reports.
- **Customers** browse by city, area and category, claim vouchers, collect stamps and follow businesses for new-offer emails.
- **Admins** approve businesses and offers, manage cities and areas, build previews for businesses they're approaching, and watch platform metrics.

Product plan and priorities: [docs/ROADMAP.md](docs/ROADMAP.md). More than one city: [docs/MULTI-CITY.md](docs/MULTI-CITY.md). How Stripe billing is set up: [docs/STRIPE_GO_LIVE.md](docs/STRIPE_GO_LIVE.md). Finding businesses and writing to them: [docs/OUTREACH.md](docs/OUTREACH.md). Making videos for social: [docs/SOCIAL-VIDEO.md](docs/SOCIAL-VIDEO.md).

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
| `NEXT_PUBLIC_GA_MEASUREMENT_ID`                                                | Optional: Google Analytics outside production (it's on in production by default, behind cookie consent)                                          |

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

## Emails

Two sending subdomains in Resend, so sign-in emails keep their own reputation:

- `auth.promotello.com`: Supabase's sign-in emails only (confirmations, password resets, sign-in links), from `no-reply@auth.promotello.com`, set in Supabase's SMTP settings.
- `mail.promotello.com`: everything the app sends, from `EMAIL_FROM` (`Promotello <offers@mail.promotello.com>`). Replies go to `EMAIL_REPLY_TO` (default hello@promotello.com).

Mail apps that support BIMI show the Promotello logo next to emails: the logo is `public/bimi/logo.svg` (SVG Tiny PS, don't edit it casually) and the DNS record is `default._bimi.promotello.com`. Gmail and Apple Mail also need a mark certificate (VMC or CMC).

Sent with Resend from `lib/email.ts`, using `brandedEmail()` for the layout. Customer emails from a business show as "_Business_ via Promotello". Every marketing email has an unsubscribe link. Contact form messages go to `CONTACT_EMAIL` (default support@promotello.com) with the sender as reply-to. Every email is sent from the app; there are no Supabase edge functions. Business notifications (daily summary, fully claimed and low inventory alerts) are in `lib/business-notifications.ts`.

## Tests

`npm run test:e2e` starts the dev server if it isn't running. The setup creates test users and businesses through the Supabase admin API and removes them afterwards. Test email addresses end in `@test.internal`, which `sendEmails` never sends to. Skip the Stripe portal test with `--grep-invert "billing portal"` if you're not logged in to Stripe test mode.

## Still to do

Roughly in the order it matters. Everything here is still open; things get
deleted when they're done rather than ticked.

### Blocking launch

1. **Scan a QR code with a real phone.** Flagged four or five times and still
   open. It's the product's first physical touchpoint — poster in a window,
   customer scans, card appears. The brand badge sits in the middle at error
   correction H, which should be fine, but "should" is doing a lot of work for
   the one interaction the whole pitch rests on. Five minutes settles it.
2. **ICO registration.** A UK data controller processing names, emails,
   birthdays and visit history. A fee and a form, not a project, but not
   optional: ico.org.uk/for-organisations/data-protection-fee, then add the
   number to the privacy policy and the other legal pages (company number is
   already in `lib/legal.ts`).
3. **Offline sales pack.** Sales sheets showing a live QR code for a loyalty
   card, how it looks in the customer's wallet, the offers, the directory page
   and the pricing.
4. **Staff documentation on redemptions**, for the people behind the counter.

### Product gaps to close before or around launch

- Bring back the "Promotello isn't in your area yet" bar, with an email field
  so people can be told when it arrives — a waitlist rather than a dead end.
- What happens at onboarding when a business doesn't fit any category.
- What a customer sees after scanning an offer QR: ideally a standalone page
  with just that offer, no scrolling.
- Test what happens when a loyalty card is full.
- Joining a loyalty card without an account takes a name and an email. Phone
  needs an SMS sender first, or a guest who gives only a number has no way back
  to their card.
- A QR image a business can download on its own, not only inside a poster.
- Decide the email volume before outreach: a business that signs up and does
  nothing gets 7 emails in 21 days (welcome, setup nudge, loyalty pitch, second
  nudge, founding places, results, check-in). All verified working, there are
  just a lot of them.
- The trial terms sentence repeats word for word in the loyalty pitch, founding
  places and results emails, and again in the loyalty setup step.
- Lifecycle emails need product imagery, and a read-through against the job
  they're doing: converting a Free business to Pro.
- Conversion emails should carry the signature from the marketing folder.

### Admin tools

- `/admin/businesses` doesn't show everything needed to approve. Either show it
  all, or keep the list short and link to the preview page.
- `/admin/offers`: a list for approval with a button to see the full offer,
  perhaps in a modal.
- Can an offer still be edited once it's been sent for approval?
- List everything, approved and not, with filtering — both pages.

### Accounts and infrastructure

- A second Supabase project for development, so tests stop running against the
  live database.
- **Move Resend to Pro ($20/mo) before the daily cap bites.** The free plan is
  3,000 emails a month *and* 100 a day, and the daily one goes first: daily
  summaries alone are about 75 a day at 50 active businesses, one offer
  announced to 150 followers is 150 in a burst, and the 1st of the month adds
  every monthly report. Supabase's sign-in emails come out of the same quota,
  since `auth.promotello.com` sends through Resend. Upgrade when daily sends
  reach ~70, or before the first business with more than ~80 followers
  announces an offer — whichever comes first, and both before business 50.
- Secure every social account with keychain passwords and the right phone
  numbers and email addresses.
- 3 December: transfer the YouTube channel to harry@promotello.com (not
  possible until the Google account is out of trial — set up YouTube for the
  user, make them a manager, wait 7 days), then add YouTube to Search Console.
- A BIMI mark certificate (VMC or CMC) so Gmail and Apple Mail show the logo.
  The logo and the DNS record are already in place.
- Apple sign-in on the login and register pages: quicker than verifying email.

### Later

- More poster sizes, including something smaller than the two we offer.
- Generate a window poster for every business that signs up, printed and posted
  through an API (Printful: documented REST API, kiss-cut stickers, printed in
  the UK), and let businesses buy sticker sheets of their own code.
- Stripe Managed Payments needs a VAT ID we won't have until the £90k
  threshold. At that point registering for VAT and turning on Stripe Tax is far
  cheaper than Managed Payments' extra ~3.5%, and Stripe doesn't have to become
  the seller. Nothing to do now.
- Events: built and hidden until there are enough customers (`lib/features.ts`).
- Security, password and email preference guides in both help centres are still
  in the older formal voice. Left that way on purpose.

### App improvements

From [docs/ROADMAP.md](docs/ROADMAP.md), in the order to build them. Joining without an account is built, by email. A guest card should go straight into the Wallet once passes exist, so 1 finishes that thought.

1. Apple and Google Wallet passes. Apply for an Apple Developer account and a Google Wallet issuer account first, as approval takes time
2. Switching kit: CSV import of members and stamp balances, and a one-time starting balance from a paper card
3. Customer list, segments (lapsed, VIP) and CSV export with consent flags
4. Multiple cards and reward ladders (5 stamps = pastry, 10 = coffee)
5. Double-stamp days, reusing the quiet-hours schedules
6. Surprise rewards and scratch-to-win
7. Customer refer-a-friend
8. Wallet push messages and location alerts (needs 1)
9. QR poster sizes and designs + sticker request through AP

Smaller gaps:

- Business profiles: photo gallery and social links
- Offer types beyond a discount
- Admin dashboard: check it shows weekly active businesses, trial-to-paid and repeat visit rate
