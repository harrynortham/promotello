# CLAUDE.md

Product roadmap and priorities: docs/ROADMAP.md (read when planning a feature)

How Promotello works in more than one city: docs/MULTI-CITY.md (read before
touching anything that groups, counts or links by area, or copy that names a
place)

What Wallet passes will need from the loyalty card: docs/WALLET-PASSES.md (read
before changing how a card is stamped, finished or handed over)

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Start dev server (Next.js with Turbopack)
npm run build        # Production build
npm run lint         # ESLint
npm run test:unit    # Pure-logic tests (node --test, no browser, no database)
npm run test:e2e     # Playwright E2E tests (requires SUPABASE_SERVICE_ROLE_KEY in .env.local)
npm run test:e2e:ui  # Same with the Playwright interactive UI
```

E2E tests seed isolated test users and data via the Supabase admin API, then tear them down after the run. Requires `SUPABASE_SERVICE_ROLE_KEY` in `.env.local`.

`tests/e2e/billing.spec.ts` also needs a Stripe listener running, with the
`whsec_…` it prints as `STRIPE_WEBHOOK_SECRET`. Without it Checkout is paid but
nothing tells the app, and the test fails waiting for a plan.

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook \
  --events checkout.session.completed,customer.subscription.created,customer.subscription.updated,customer.subscription.deleted,invoice.paid,invoice.payment_failed,charge.refunded,charge.dispute.created,radar.early_fraud_warning.created
```

The events are the ones `app/api/stripe/webhook/route.ts` switches on; the CLI
refuses to listen without being told which. It also has to be in test mode,
since `.env.local` holds an `sk_test_` key: `stripe switch` to a sandbox once,
or pass the key for one run with `STRIPE_API_KEY=$(grep '^STRIPE_SECRET_KEY='
.env.local | cut -d= -f2-) stripe listen …`, which leaves the CLI's own mode
alone. "You're in live mode" means neither has happened.

## Architecture

**Promotello** is a Next.js 16 app (React 19, TypeScript, Tailwind CSS v4) backed by Supabase. It is a two-sided marketplace: businesses publish discount offers, customers browse and redeem them.

### Route groups

| Group                                                   | Path prefix                                                | Purpose                                                           |
| ------------------------------------------------------- | ---------------------------------------------------------- | ----------------------------------------------------------------- |
| `(auth)`                                                | `/login`, `/signup`, `/forgot-password`, `/reset-password` | Shared login/signup pages for both user types                     |
| `(customer-marketing)`                                  | `/`, `/offers`, `/businesses`, `/explore`, etc.            | Public consumer-facing marketing and browsing                     |
| `(business)/business/(business-marketing)`              | `/business`                                                | Marketing site for businesses considering the platform            |
| `(business)/business/(business-dashboard)/[businessId]` | `/business/[businessId]/*`                                 | Authenticated per-business management dashboard                   |
| `app/dashboard`                                         | `/dashboard`                                               | Authenticated customer area (saved offers, redemptions)           |
| `app/notifications`                                     | `/notifications`                                           | One in-app notification list per user account, both sides         |
| `app/account`                                           | `/account`                                                 | User account settings (profile, notifications, privacy, security) |
| `app/admin`                                             | `/admin`                                                   | Platform admin (business/offer approval, audit logs)              |

The `/login` page detects `?next=/business/dashboard` to decide whether to route a user to the customer dashboard or the business dashboard after authentication.

### Supabase integration

Three client factories in `utils/supabase/`:

- `server.ts` — async Server Component / Route Handler client (reads cookies via `next/headers`)
- `client.ts` — browser client for Client Components (`createBrowserClient`)
- `middleware.ts` — middleware client that propagates cookie mutations to the response

Auth guards are enforced inside layout files using `await connection()` + `supabase.auth.getUser()` + `redirect()`.

### Database schema

Migrations live in `supabase/migrations/`. Key tables and their RLS model:

- **`businesses`** — approval_status: `pending | approved | rejected | suspended`. Created exclusively via `create_business_with_owner()` (SECURITY DEFINER) to atomically assign ownership.
- **`business_members`** — roles: `owner | admin | member`. `is_business_member(business_id, minimum_role)` is the SECURITY DEFINER helper used inside all business-scoped RLS policies.
- **`offers`** — approval_status mirrors businesses. `review_offer()` is the only approved path to change approval status; a trigger enforces this. `kind`, `kind_value`, `kind_quantity` and `kind_item` say what kind of offer it is; `discount` is the headline built from them, and `lib/offer-kinds.ts` is the only place that builds one. `available_days`, `available_from`, `available_until` and `audience` say when it can be used and who for; `availability` is the line built from them by `availabilityLine()` in `lib/schedule.ts`, the only place that builds one. `schedule_days/start/end` are a different thing — the window the till enforces, which is part of Growth — and are written from the availability columns only when the business ticks the box.
- **`offer_redemptions`** — one per `(offer_id, user_id)` pair. Created via `redeem_offer()` (SECURITY DEFINER) which validates offer eligibility atomically.
- **`platform_admins`** — `is_platform_admin()` gates all admin-side mutations and reads.
- **`business_invitations`** — token-based team invites resolved at `/invite/[token]`.
- **`notifications`** — one in-app list per **user account**, never per business
  (`business_id` is context only). No insert policy: rows are written with the
  service role by `lib/notify.ts`, whose words all come from `lib/notifications.ts`.
  A person may select their own, update only `read_at` (column grant) and delete
  their own. Deleted after 90 days by the daily cron.

### UI component conventions

- `components/ui/` — shadcn/ui primitives (Button, Input, Card, etc.) based on `@base-ui/react`
- `components/` root — app-specific navigation and layout components, one per context (e.g. `business-dashboard-nav`, `dashboard-nav`, `marketing-nav`)
- `lib/offers.ts` — shared `Offer` TypeScript type
- `lib/utils.ts` — `cn()` utility for class merging

### Styling

Tailwind CSS v4 with Turbopack. Brand colours used directly in classnames: `#17233B` (dark navy), `#FFF8F0` (warm off-white), `#FF593F` (coral/primary). No CSS variables for brand colours — they are hardcoded inline.

### Environment variables

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
```

The Supabase project hostname is `owdxoarqivpoplpqiylt.supabase.co` (also allowlisted in `next.config.ts` for `next/image`).

## Key notes from README

- Data-entry forms use react-hook-form + Zod (shared rules in `lib/validation.ts`, field errors via `components/field-error.tsx`); one-button actions stay plain server-action forms.
