# Stripe billing

Billing has been live since 29 October 2026 on Promotello Ltd's UK Stripe account. The account's sandbox is used locally (`.env.local`) and on Vercel Preview; the live keys are on Vercel Production. Both were set up with `scripts/stripe-setup.mjs`.

The first account was set up with Gibraltar as the business location, and an account's country can't be changed, which is why billing moved to a new UK account. The Gibraltar account isn't used any more.

## Still to do

1. **Emails from billing.promotello.com.** Stripe can send receipts and payment emails from your own domain instead of stripe.com. In the UK account: Settings → Emails → Your email domain, add `billing.promotello.com`, and add the DNS records it shows (a TXT record, a Mail-From CNAME and the DKIM CNAMEs). The existing DMARC record on promotello.com already allows it. Send a test email, and set the support email in Public details to support@promotello.com.
2. **Close the Gibraltar account** once nothing uses its keys.

## Things to know

- **Managed Payments is off** in both live and sandbox. Stripe turns it on by default for new accounts, and it breaks checkout. It can only be turned back on per Checkout Session in code.
- **The restricted live key** (`rk_live_…`) needs write access to Customers, Checkout Sessions, Customer Portal and Subscriptions (switching between Pro and Growth updates the subscription), and read access to Products, Prices, Invoices and Charges. Invoice Payments has no separate permission; Invoices covers it. If Stripe calls fail in production with permission errors, check the key first.
- **Cancelling in the billing portal** sets `cancel_at` on the subscription, not `cancel_at_period_end`. The webhook handles both.
- **Webhooks locally:** run `stripe listen --api-key <sandbox secret key> --forward-to localhost:3000/api/stripe/webhook` and use the `whsec_…` it prints as `STRIPE_WEBHOOK_SECRET`.
- **Alerts:** turn on dispute email notifications in Stripe (Settings → Communication preferences). Refunds, disputes and fraud warnings also appear at `/admin/billing`.

## Setting up an account

`scripts/stripe-setup.mjs` creates the Pro and Growth products, the five prices (`pro_founding_monthly`, `pro_monthly`, `pro_yearly`, `growth_monthly`, `growth_yearly`) and the Customer Portal configuration, and prints `STRIPE_PORTAL_CONFIGURATION_ID`. It's safe to re-run.

For a sandbox, put its secret key in `.env.local` as `STRIPE_SECRET_KEY`, then:

```bash
node --env-file=.env.local scripts/stripe-setup.mjs
```

For live, put `STRIPE_SECRET_KEY=sk_live_…` in `.env.production.local` (gitignored) and pass the webhook URL:

```bash
node --env-file=.env.production.local scripts/stripe-setup.mjs --webhook-url https://www.promotello.com/api/stripe/webhook
```

This also creates the webhook endpoint with all 9 events and prints `STRIPE_WEBHOOK_SECRET`. The secret is shown once, so copy it straight away.

Then, in live mode:

1. **Billing settings** (Settings → Billing → Subscriptions and emails): turn on Smart Retries, failed-payment emails, successful-payment receipts and trial-ending reminder emails. Add the logo and colours in Settings → Branding.
2. **Vercel, Production environment:** `STRIPE_SECRET_KEY` (the restricted key), `STRIPE_WEBHOOK_SECRET`, `STRIPE_PORTAL_CONFIGURATION_ID`, plus `SUPABASE_SERVICE_ROLE_KEY`. Keep the sandbox values on Preview. Redeploy.
3. **Smoke test:** start a trial on your own business with a real card, check the "Your Pro trial has started" email arrives, then cancel in the billing portal before it ends. There's no charge, but it uses one founding place, so delete the test subscription row afterwards to free it.

## Who sends which billing email

Stripe sends the payment emails; the app sends the ones about the trial and getting set up. Both come from Promotello, so a business sees one sequence. A business gets both Stripe's trial-ending reminder and the app's before a trial ends; that's intended.

| Email | Sent by | When |
|---|---|---|
| "Your Pro trial has started" (or Growth) | App, from the `customer.subscription.created` webhook | A trial starts |
| Trial ending, with what the business has achieved | App, daily job (`lib/business-lifecycle.ts`) | 5 days before the trial ends |
| Trial-ending reminder | Stripe | Before the trial ends (Stripe's setting) |
| Receipts | Stripe | Each successful payment |
| Failed payment | Stripe | A payment fails; Smart Retries try again |

Before a trial, free businesses get the app's conversion emails (loyalty card pitch, founding places, results), which link to Billing to start the trial. If the webhook isn't set up, the trial-started email never sends, so check it in the smoke test.
