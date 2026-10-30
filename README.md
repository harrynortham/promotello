# Promotello

Loyalty cards, offers and QR posters for independent businesses, with a local directory customers browse to find them. Launching in Bristol first.

- **Businesses** sign up, post offers, run a digital stamp card, print QR posters, and see who follows them. Paid plans (Pro, Growth) add unlimited offers, automations, quiet-hours offers and monthly reports.
- **Customers** browse by city, area and category, claim vouchers, collect stamps and follow businesses for new-offer emails.
- **Admins** approve businesses and offers, manage cities and areas, build previews for businesses they're approaching, and watch platform metrics.

Product plan and priorities: [docs/ROADMAP.md](docs/ROADMAP.md). How Stripe billing is set up: [docs/STRIPE_GO_LIVE.md](docs/STRIPE_GO_LIVE.md).

## Stack

- Next.js 16 (App Router, `cacheComponents`, React Compiler), React 19, TypeScript
- Tailwind CSS 4, shadcn/ui components on Base UI (`components/ui/`)
- Supabase: Postgres with row-level security, Auth, Storage
- Stripe Billing (Checkout, Customer Portal, webhooks)
- Resend for email; Vercel for hosting and the daily cron
- react-hook-form and Zod for forms
- Playwright end-to-end tests

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

- Secure all platform emails with unique strong passwords, add all to apple keychain
- need way to generate poster to stick in window, sent to each sign up business using that website with the API printing
- add social icons to email signature
- Transfer youtube channel to hello@promotello.com / cant transfer until google account out of trial. Setup youtube for user and then make manager, wait 7 days
- Add social media posts as per marketing launch POSTS.md / once business accounts are all set up and tested
- Fix login / register pages on mobile for all to be above the fold (buttons for example)
- Add YouTube to google search console
- Move analytics to hello@promotello.com account
- Learn keystatic for blog posts, create three more posts and add image to each
- Remove for business from header

- make business dashboard more visual when creating business or promotion. Currently user sees nothing but a form
- image cropping tool component to be shared wherever user needs to add an image.
- Update UI on login and register on mobile, button below the fold.

- Change Vercel from hobby to paid plan, payment from wise account

- Test onboarding flow and conversion emails before launch

- Create preview companies and test claiming them. Generate cold email template to send to businesses.

- Check resend limits that its ok for launch

- Stripe managed payments requires VAT ID which we dont have and wont have until over 85k threshold, then we can enable. We may do sooner but not needed for now the VAT. You're unlikely to want it back. If you pass the £90k VAT threshold, the usual route is to register for VAT yourself and turn on Stripe Tax, which is far cheaper than Managed. Payments' extra fee of about 3.5%. Stripe wouldn't need to become the seller.
- Set up BIMI so the logo shows in mail apps
- Events: built, and hidden until there are enough customers (`lib/features.ts`)
- Add apple logins to register and login page, quicker than verifiying email
- Do we need it? Register the company with the ICO straight away, before you start signing up real Go to ico.org.uk/for-organisations/data-protection-fee and choose Register. Add ICO number to privacy policy and other legal pages (company number done: `lib/legal.ts`)
- Add API so that users can generate and buy stickers of their QR codes like Printful: a well-documented REST API, kiss-cut stickers, and printing in the UK. It’s probably the quickest to get working.
- Do we have QR code download image that business can display to get loyalty card / user signs up and is in their account

### App improvements

From [docs/ROADMAP.md](docs/ROADMAP.md), in the order to build them. Start with 1 and 2 together: a guest card goes straight into the Wallet.

1. Apple and Google Wallet passes. Apply for an Apple Developer account and a Google Wallet issuer account first, as approval takes time
2. Join a loyalty card without an account: name plus email or phone creates a guest card, claimed into a full account later
3. Card design (colours, logo, stamp icon) and multi-stamp (several stamps in one scan, with a cap)
4. Switching kit: CSV import of members and stamp balances, and a one-time starting balance from a paper card
5. Customer list, segments (lapsed, VIP) and CSV export with consent flags
6. Multiple cards and reward ladders (5 stamps = pastry, 10 = coffee)
7. Double-stamp days, reusing the quiet-hours schedules
8. Surprise rewards and scratch-to-win
9. Customer refer-a-friend
10. Wallet push messages and location alerts (needs 1)

Smaller gaps:

- Business profiles: photo gallery and social links
- Offer types beyond a discount
- Admin dashboard: check it shows weekly active businesses, trial-to-paid and repeat visit rate
