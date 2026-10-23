# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start dev server (Next.js with Turbopack)
npm run build    # Production build
npm run lint     # ESLint
```

There are no automated tests. Verification is done by running the app.

## Architecture

**Promotello** is a Next.js 16 app (React 19, TypeScript, Tailwind CSS v4) backed by Supabase. It is a two-sided marketplace: businesses publish discount offers, customers browse and redeem them.

### Route groups

| Group | Path prefix | Purpose |
|---|---|---|
| `(auth)` | `/login`, `/signup`, `/forgot-password`, `/reset-password` | Shared login/signup pages for both user types |
| `(customer-marketing)` | `/`, `/offers`, `/businesses`, `/explore`, etc. | Public consumer-facing marketing and browsing |
| `(business)/business/(business-marketing)` | `/business` | Marketing site for businesses considering the platform |
| `(business)/business/(business-dashboard)/[businessId]` | `/business/[businessId]/*` | Authenticated per-business management dashboard |
| `app/dashboard` | `/dashboard` | Authenticated customer area (saved offers, redemptions) |
| `app/account` | `/account` | User account settings (profile, notifications, privacy, security) |
| `app/admin` | `/admin` | Platform admin (business/offer approval, audit logs) |

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
- **`offers`** — approval_status mirrors businesses. `review_offer()` is the only approved path to change approval status; a trigger enforces this.
- **`offer_redemptions`** — one per `(offer_id, user_id)` pair. Created via `redeem_offer()` (SECURITY DEFINER) which validates offer eligibility atomically.
- **`platform_admins`** — `is_platform_admin()` gates all admin-side mutations and reads.
- **`business_invitations`** — token-based team invites resolved at `/invite/[token]`.

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

- In production, update the Supabase edge function for emails to use `www.promotello.com`.
- Forms should eventually migrate to react-hook-form + Zod validation for consistency.
