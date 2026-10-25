# Promotello

Loyalty cards, offers and QR posters for independent businesses, with a local directory customers browse to find them. Launching in Bristol first.

- **Businesses** sign up, post offers, run a digital stamp card, print QR posters, and see who follows them. Paid plans (Pro, Growth) add unlimited offers, automations, quiet-hours offers and monthly reports.
- **Customers** browse by city, area and category, claim vouchers, collect stamps and follow businesses for new-offer emails.
- **Admins** approve businesses and offers, manage cities and areas, build previews for businesses they're approaching, and watch platform metrics.

Product plan and priorities: [docs/ROADMAP.md](docs/ROADMAP.md). Taking payments live: [docs/STRIPE_GO_LIVE.md](docs/STRIPE_GO_LIVE.md).

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
| `RESEND_API_KEY`, `EMAIL_FROM`                                                 | Sending email. Without them nothing is sent, which keeps development safe                                                                        |
| `CRON_SECRET`                                                                  | The daily job at `/api/cron/daily`                                                                                                               |
| `NEXT_PUBLIC_AUTH_PROVIDERS`                                                   | Which "Continue with…" buttons to show: `google` for now (`google,apple` once Apple is set up). See [docs/SOCIAL_LOGIN.md](docs/SOCIAL_LOGIN.md) |
| `NEXT_PUBLIC_SENTRY_DSN`                                                      | Optional: overrides the Sentry project in `lib/sentry.ts` (error reports are on for Vercel deployments, off locally) |
| `NEXT_PUBLIC_GA_MEASUREMENT_ID`                                                | Optional: Google Analytics outside production (it's on in production by default, behind cookie consent)                                          |

Stripe prices are found by lookup key (`pro_monthly`, `growth_monthly` and so on), so the same code works in test and live mode.

## How it's organised

| Path                                                         | What's there                                                                      |
| ------------------------------------------------------------ | --------------------------------------------------------------------------------- |
| `app/(customer-marketing)/`                                  | Public site: home, offers, businesses, explore, categories, city and area pages   |
| `app/(business)/business/(business-marketing)/`              | Pages for businesses: features, pricing, demo, waitlist, previews                 |
| `app/(business)/business/(business-dashboard)/[businessId]/` | A business's dashboard                                                            |
| `app/dashboard`, `app/account`                               | A customer's vouchers, loyalty cards and settings                                 |
| `app/admin`                                                  | Platform admin                                                                    |
| `app/api/cron/daily`                                         | Daily job: automations, setup and trial emails, monthly reports, preview clean-up |
| `components/`                                                | App components; `components/ui/` are shadcn primitives                            |
| `lib/`                                                       | Data loading, emails, billing, validation and other shared code                   |
| `supabase/migrations/`                                       | Database schema, one file per change                                              |
| `tests/e2e/`                                                 | Playwright tests; `tests/global-setup.ts` seeds test users and data               |

### Addresses

- Businesses: `/businesses/harbour-grind-harbourside-bristol-5d6ki4` (name, area, city, short id). Offers: `/offers/<business>-<title>-<id>`. The database sets these; old addresses (including `/businesses/<uuid>`) redirect permanently from `proxy.ts`.
- Listing pages show every live city, or one when the city is in the address: `/offers/bristol`, `/explore/bristol/gloucester-road`, `/categories/bakeries/bristol`. Without one, visitors see the city they chose or the one they're in.

### Conventions

- **Database changes** are new files in `supabase/migrations/`; never edit one that has run. Every table has RLS. Writes that need more than RLS (creating a business, redeeming, approving) go through `SECURITY DEFINER` functions.
- **Forms** where people type data use react-hook-form with a Zod schema, showing errors under each field (`components/field-error.tsx`). Shared rules live in `lib/validation.ts`. One-button actions (approve, delete, stamp) are plain forms posting to server actions.
- **Brand colours** are used directly in class names: `#17233B` navy, `#FFF8F0` off-white, `#FF593F` coral.
- **Copy** is UK English.

## Emails

Sent with Resend from `lib/email.ts`, using `brandedEmail()` for the layout. Customer emails from a business show as "_Business_ via Promotello". Every marketing email has an unsubscribe link. The contact form uses the `send-contact-message` Supabase edge function.

## Tests

`npm run test:e2e` starts the dev server if it isn't running. The setup creates test users and businesses through the Supabase admin API and removes them afterwards. Test email addresses end in `@test.internal`, which `sendEmails` never sends to. Skip the Stripe portal test with `--grep-invert "billing portal"` if you're not logged in to Stripe test mode.

## Still to do

- Take Stripe live: [docs/STRIPE_GO_LIVE.md](docs/STRIPE_GO_LIVE.md)
- - Supabase paid plan (about $25 a month): it gives daily backups. Today, one bad mistake could lose every account with no way back.
- Set up BIMI so the logo shows in mail apps
- A blog (in the app or a CMS)
- Events: built, and hidden until there are enough customers (`lib/features.ts`)
- Apple and Google Wallet passes
- Register company name and bank account for Stripe
- Add styling to edge function emails, should these move locally to nextjs?
- Add apple logins to register and login page, quicker than verifiying email
- Find out why businesses or offer urls in sitemap?
- Email authentication: add SPF, DKIM and DMARC records for promotello.com in Resend and your DNS, so welcome and offer emails don't land in spam. I can walk you through it.
- Fix sending domains in resend so make sense to user
- Remove confirm password field from sign up email
- Register the company with the ICO straight away, before you start signing up real Go to ico.org.uk/for-organisations/data-protection-fee and choose Register.
- Add ICO number and companny number to privacy policy and other legal pages
- Setup google workspace to have email signature and profile photo
- Add Instagram, TikTok, X and YouTube to google search console
- Move analytics to hello@promotello.com account
- Not receiving welcome emails, tested new account creation via google auth
- Change Vercel from hobby to paid plan
- Secure all platform emails with unique strong passwords
