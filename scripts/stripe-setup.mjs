// Creates the Stripe objects Promotello billing needs, in whichever account
// and mode STRIPE_SECRET_KEY belongs to. Safe to re-run: anything that
// already exists is reused, not duplicated.
//
//   node --env-file=.env.production.local scripts/stripe-setup.mjs \
//     [--webhook-url https://www.promotello.com/api/stripe/webhook]
//
// Prints the IDs and secrets to put in your environment variables.

import Stripe from "stripe";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.promotello.com";

// Keep in sync with plans in lib/billing.ts.
const PRODUCTS = {
    pro: {
        name: "Promotello Pro",
        description: "Unlimited offers, loyalty, QR posters, follower emails and team access.",
    },
    growth: {
        name: "Promotello Growth",
        description: "Everything in Pro plus automations, quiet-hours offers, the monthly value report and events.",
    },
};

const PRICES = [
    { product: "pro", lookupKey: "pro_founding_monthly", amount: 1900, interval: "month", nickname: "Pro founding member monthly" },
    { product: "pro", lookupKey: "pro_monthly", amount: 2400, interval: "month", nickname: "Pro monthly" },
    { product: "pro", lookupKey: "pro_yearly", amount: 24000, interval: "year", nickname: "Pro yearly" },
    { product: "growth", lookupKey: "growth_monthly", amount: 3900, interval: "month", nickname: "Growth monthly" },
    { product: "growth", lookupKey: "growth_yearly", amount: 39000, interval: "year", nickname: "Growth yearly" },
];

// Keep in sync with handleEvent in app/api/stripe/webhook/route.ts.
export const WEBHOOK_EVENTS = [
    "checkout.session.completed",
    "customer.subscription.created",
    "customer.subscription.updated",
    "customer.subscription.deleted",
    "invoice.paid",
    "invoice.payment_failed",
    "charge.refunded",
    "charge.dispute.created",
    "radar.early_fraud_warning.created",
];

const API_VERSION = "2026-09-30.endive";

function argValue(name) {
    const index = process.argv.indexOf(name);
    return index === -1 ? null : process.argv[index + 1];
}

async function main() {
    if (!process.env.STRIPE_SECRET_KEY) {
        throw new Error("Set STRIPE_SECRET_KEY to the key for the account and mode to set up.");
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: API_VERSION });
    const account = await stripe.accounts.retrieve();
    const livemode = process.env.STRIPE_SECRET_KEY.includes("_live_");

    console.log(`Stripe account ${account.id} (${livemode ? "LIVE" : "test"} mode)\n`);

    // Products, found by metadata.plan
    const products = await stripe.products.list({ active: true, limit: 100 });
    const productIds = {};

    for (const [plan, details] of Object.entries(PRODUCTS)) {
        let product = products.data.find((item) => item.metadata.plan === plan);

        if (product) {
            console.log(`✓ Product ${plan} exists: ${product.id}`);
        } else {
            product = await stripe.products.create({ ...details, metadata: { plan } });
            console.log(`+ Created product ${plan}: ${product.id}`);
        }

        productIds[plan] = product.id;
    }

    // Prices, found by lookup key
    const existing = await stripe.prices.list({
        lookup_keys: PRICES.map((price) => price.lookupKey),
        active: true,
    });

    for (const price of PRICES) {
        const match = existing.data.find((item) => item.lookup_key === price.lookupKey);

        if (match) {
            console.log(`✓ Price ${price.lookupKey} exists: ${match.id}`);
            continue;
        }

        const created = await stripe.prices.create({
            product: productIds[price.product],
            currency: "gbp",
            unit_amount: price.amount,
            recurring: { interval: price.interval },
            lookup_key: price.lookupKey,
            nickname: price.nickname,
        });
        console.log(`+ Created price ${price.lookupKey}: ${created.id}`);
    }

    // Customer Portal configuration
    let portalId = process.env.STRIPE_PORTAL_CONFIGURATION_ID;

    if (portalId && portalId !== "") {
        try {
            await stripe.billingPortal.configurations.retrieve(portalId);
            console.log(`✓ Portal configuration exists: ${portalId}`);
        } catch {
            console.log(`! STRIPE_PORTAL_CONFIGURATION_ID ${portalId} not found in this account; creating a new one.`);
            portalId = null;
        }
    }

    if (!portalId) {
        const portal = await stripe.billingPortal.configurations.create({
            business_profile: {
                headline: "Manage your Promotello subscription",
                privacy_policy_url: `${SITE_URL}/legal/privacy`,
                terms_of_service_url: `${SITE_URL}/legal/terms`,
            },
            features: {
                invoice_history: { enabled: true },
                payment_method_update: { enabled: true },
                customer_update: { enabled: true, allowed_updates: ["email", "name", "address"] },
                subscription_cancel: { enabled: true, mode: "at_period_end" },
                // Off so founding members can't switch away from their price.
                subscription_update: { enabled: false },
            },
        });
        portalId = portal.id;
        console.log(`+ Created portal configuration: ${portalId}`);
    }

    // Webhook endpoint (optional)
    const webhookUrl = argValue("--webhook-url");
    let webhookSecret = null;

    if (webhookUrl) {
        const endpoints = await stripe.webhookEndpoints.list({ limit: 100 });
        const endpoint = endpoints.data.find((item) => item.url === webhookUrl);

        if (endpoint) {
            const missing = WEBHOOK_EVENTS.filter((event) => !endpoint.enabled_events.includes(event));

            if (missing.length > 0) {
                await stripe.webhookEndpoints.update(endpoint.id, { enabled_events: WEBHOOK_EVENTS });
                console.log(`~ Updated webhook ${endpoint.id}: added ${missing.join(", ")}`);
            } else {
                console.log(`✓ Webhook exists: ${endpoint.id} (signing secret is in the Dashboard)`);
            }
        } else {
            const created = await stripe.webhookEndpoints.create({
                url: webhookUrl,
                enabled_events: WEBHOOK_EVENTS,
                api_version: API_VERSION,
                description: "Promotello subscriptions",
            });
            webhookSecret = created.secret;
            console.log(`+ Created webhook ${created.id} for ${webhookUrl}`);
        }
    }

    console.log("\nEnvironment variables for this mode:");
    console.log(`  STRIPE_PORTAL_CONFIGURATION_ID=${portalId}`);

    if (webhookSecret) {
        console.log(`  STRIPE_WEBHOOK_SECRET=${webhookSecret}   (shown once; copy it now)`);
    }
}

main().catch((error) => {
    console.error(`\nSetup failed: ${error.message}`);
    process.exit(1);
});
