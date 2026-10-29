# Stripe go-live checklist

Billing is built and tested in the Stripe sandbox (branch `feature/stripe-billing`). These steps switch it to live payments. They need a Stripe account with live payments activated, which needs a business and bank account.

1. **Activate live payments** in the Stripe Dashboard: business details and bank account.
2. **Billing settings** (live mode, Settings → Billing → Subscriptions and emails): turn on Smart Retries, failed-payment emails, successful-payment receipts and trial-ending reminder emails. Add your logo and colours in Settings → Branding. The app sends its own trial emails too (see below), so a business gets both Stripe's reminder and ours before a trial ends; that's intended.
3. **Run the setup script once with the live secret key.** Put `STRIPE_SECRET_KEY=sk_live_…` in `.env.production.local` (gitignored), then:

   ```bash
   node --env-file=.env.production.local scripts/stripe-setup.mjs --webhook-url https://www.promotello.com/api/stripe/webhook
   ```

   It creates the Pro product, the three prices (`pro_founding_monthly`, `pro_monthly`, `pro_yearly`), the Customer Portal configuration and the webhook endpoint with all 9 events. It prints `STRIPE_PORTAL_CONFIGURATION_ID` and `STRIPE_WEBHOOK_SECRET`. The secret is shown once, so copy it straight away. Safe to re-run.
4. **Create a restricted live key** (`rk_live_…`) for the app: write access to Customers, Checkout Sessions and Customer Portal; read access to Products, Prices, Subscriptions, Invoices, Invoice Payments and Charges.
5. **Vercel, Production environment:** `STRIPE_SECRET_KEY` (the restricted key), `STRIPE_WEBHOOK_SECRET`, `STRIPE_PORTAL_CONFIGURATION_ID`, plus `SUPABASE_SERVICE_ROLE_KEY`. Keep the sandbox values on Preview. Redeploy.
6. **Merge** `feature/stripe-billing` into `main`, then `feature/seo-and-pricing`. Database migrations are already applied.
7. **Smoke test:** start a trial on your own business with a real card, check the "Your Pro trial has started" email arrives, then cancel in the billing portal before it ends. No charge, but it uses one founding place.
8. **Backup alerts:** turn on dispute email notifications in Stripe (Settings → Communication preferences). Refunds, disputes and fraud warnings also appear at `/admin/billing`.

## Who sends which billing email

Stripe sends the payment emails; the app sends the ones about the trial and getting set up. Both come from Promotello, so a business sees one sequence.

| Email | Sent by | When |
|---|---|---|
| "Your Pro trial has started" (or Growth) | App, from the `customer.subscription.created` webhook | A trial starts |
| Trial ending, with what the business has achieved | App, daily job (`lib/business-lifecycle.ts`) | 5 days before the trial ends |
| Trial-ending reminder | Stripe | Before the trial ends (Stripe's setting) |
| Receipts | Stripe | Each successful payment |
| Failed payment | Stripe | A payment fails; Smart Retries try again |

Before a trial, free businesses get the app's conversion emails (loyalty card pitch, founding places, results), which link to Billing to start the trial. If the webhook isn't set up, the trial-started email never sends, so check it in the smoke test.
