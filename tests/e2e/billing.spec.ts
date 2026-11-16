import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";
import fs from "fs";
import { STATE_PATH, BUSINESS_AUTH } from "../global-setup";

test.use({ storageState: BUSINESS_AUTH });

// Requires `stripe listen --forward-to localhost:3000/api/stripe/webhook`
// so the subscription created in Checkout reaches the webhook. Without
// it the test pays, lands back on the billing page and then waits for a
// plan that nothing told us about — which is what the message on the
// assertion below says, because a red test nobody can explain is one
// everybody learns to ignore.
test("business owner can start a founding member trial and open the billing portal", async ({
    page,
}) => {
    test.setTimeout(120_000);

    const { billingBusinessId: businessId } = JSON.parse(
        fs.readFileSync(STATE_PATH, "utf8"),
    );

    // On Free, the second offer is paused.
    await page.goto(`/business/${businessId}/offers`);
    await expect(page.getByText("Paused · Free plan limit")).toHaveCount(1);

    await page.goto(`/business/${businessId}/billing`);
    await expect(page.getByRole("heading", { name: "Choose a plan" })).toBeVisible();

    // The founding price is offered. The count beside it is deliberately
    // withheld until some places have gone — "50 of 50 left" tells a
    // business nobody has taken it — so this asserts the price rather
    // than the number, which on a freshly reset database is all fifty.
    await expect(page.getByText("Locked for life.")).toBeVisible();

    // The founding member card is listed first.
    await page.getByRole("button", { name: "Start free trial" }).first().click();
    await page.waitForURL(/checkout\.stripe\.com/, { timeout: 30_000 });

    // Stripe-hosted Checkout. A founding-member trial asks for no card
    // at all — the session is created with payment_method_collection
    // "if_required" (billing/actions.ts) so that starting a trial costs
    // nobody their card details, and Checkout then renders none of these
    // fields. Each one is filled only if it is actually on the page, so
    // this passes whether or not a card is being collected rather than
    // waiting out a timeout on a field that will never appear.
    // Two different Checkouts, and the difference is not only the
    // wording. One collecting a card puts its fields and a
    // hosted-payment-submit-button in the top-level page. The card-less
    // trial — payment_method_collection "if_required" in
    // billing/actions.ts, so starting a trial costs nobody their card
    // details — renders the form inside an iframe, with a plain "Start
    // trial" button and no testid. getByRole does not cross frames, so
    // the button has to be looked for in every frame.
    const findSubmit = async () => {
        const top = page.getByTestId("hosted-payment-submit-button");

        if (await top.count()) {
            return top.first();
        }

        for (const frame of page.frames()) {
            const button = frame.getByRole("button", { name: /^(Start trial|Subscribe|Pay)/ });

            if (await button.count()) {
                return button.first();
            }
        }

        return null;
    };

    let submit: NonNullable<Awaited<ReturnType<typeof findSubmit>>> | null = null;

    await expect(async () => {
        submit = await findSubmit();
        expect(submit, "no way to submit Stripe Checkout was found in any frame").not.toBeNull();
        await expect(submit!).toBeVisible();
    }).toPass({ timeout: 60_000 });

    const fillIfPresent = async (selector: string, value: string) => {
        const field = page.locator(selector);

        if (await field.isVisible()) {
            await field.fill(value);
        }
    };

    await fillIfPresent("#cardNumber", "4242 4242 4242 4242");
    await fillIfPresent("#cardExpiry", "12 / 34");
    await fillIfPresent("#cardCvc", "123");
    await fillIfPresent("#billingName", "E2E Test Owner");
    await fillIfPresent("#billingPostalCode", "BS7 8AA");

    await submit!.click();

    await page.waitForURL(`**/business/${businessId}/billing?checkout=success`, {
        timeout: 60_000,
    });

    // The webhook may land a moment after the redirect.
    await expect(async () => {
        await page.reload();
        await expect(
            page.getByText("Free trial", { exact: true }),
            "Checkout was paid but no plan appeared. Is `stripe listen --forward-to localhost:3000/api/stripe/webhook` running, with the whsec_ it prints in STRIPE_WEBHOOK_SECRET?",
        ).toBeVisible({ timeout: 2_000 });
    }).toPass({ timeout: 30_000 });

    await expect(page.getByText("Pro · founding member")).toBeVisible();
    await expect(page.getByText(/Your free trial ends on/)).toBeVisible();

    // Upgrading restores paused offers and removes the Free plan banner.
    await page.goto(`/business/${businessId}/offers`);
    await expect(page.getByText("Paused · Free plan limit")).toHaveCount(0);
    await expect(page.getByText(/Free plan ·/)).toHaveCount(0);

    await page.goto(`/business/${businessId}/billing`);

    // The trial took no card, so the page should say what happens on the
    // day rather than promise a payment.
    await expect(page.getByText(/There's no card on this yet/)).toBeVisible({ timeout: 30_000 });

    // Now the business adds one in the portal. Stripe tells us with
    // payment_method.attached and customer.updated and leaves every
    // subscription event alone, so without those two the record never
    // learns and we go on warning somebody who has already acted.
    const admin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { autoRefreshToken: false, persistSession: false } },
    );

    const { data: row } = await admin
        .from("subscriptions")
        .select("stripe_customer_id")
        .eq("business_id", businessId)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
    const method = await stripe.paymentMethods.create({
        type: "card",
        // Stripe's own test token: the raw numbers are never handled here.
        card: { token: "tok_visa" },
    });

    await stripe.paymentMethods.attach(method.id, { customer: row!.stripe_customer_id });
    await stripe.customers.update(row!.stripe_customer_id, {
        invoice_settings: { default_payment_method: method.id },
    });

    await expect(async () => {
        await page.reload();
        await expect(
            page.getByText("when your first payment is taken"),
            "a card was added but the record never heard: is payment_method.attached in the listener's --events?",
        ).toBeVisible({ timeout: 2_000 });
    }).toPass({ timeout: 60_000 });

    await expect(page.getByRole("button", { name: "Add a card to keep Pro" })).toHaveCount(0);

    await page.getByRole("button", { name: "Manage billing" }).click();
    await page.waitForURL(/billing\.stripe\.com/, { timeout: 30_000 });
});

// The billing page is not where a business spends its time. The one
// thing a card-less trial has to do belongs where they already are.
test("the dashboard says when a trial has no card, and stops when it has one", async ({ page }) => {
    test.setTimeout(120_000);
    const { businessId } = JSON.parse(fs.readFileSync(STATE_PATH, "utf8"));

    const admin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { autoRefreshToken: false, persistSession: false } },
    );

    const { data: before } = await admin
        .from("subscriptions")
        .select("stripe_subscription_id, status, trial_end, has_payment_method")
        .eq("business_id", businessId)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

    const move = (fields: Record<string, unknown>) =>
        admin.from("subscriptions").update(fields).eq("stripe_subscription_id", before!.stripe_subscription_id);

    try {
        // Early in the trial the useful fact is that nothing is owed.
        await move({
            status: "trialing",
            trial_end: new Date(Date.now() + 20 * 86_400_000).toISOString(),
            has_payment_method: false,
        });

        await page.goto(`/business/${businessId}`, { timeout: 120_000 });
        await expect(page.getByText(/^Pro is free until /), "says it is free, and until when").toBeVisible({
            timeout: 60_000,
        });
        await expect(page.getByRole("link", { name: "Add a card" })).toBeVisible();

        // In the last week the useful fact is the date.
        await move({ trial_end: new Date(Date.now() + 3 * 86_400_000).toISOString() });
        await page.reload({ timeout: 120_000 });
        await expect(page.getByText(/^Add a card to keep Pro past /), "and then it is the date").toBeVisible({
            timeout: 60_000,
        });

        // Once there is a card there is nothing to say.
        await move({ has_payment_method: true });
        await page.reload({ timeout: 120_000 });
        await expect(page.getByText(/Pro is free until |Add a card to keep Pro past /)).toHaveCount(0);
    } finally {
        await move({
            status: before!.status,
            trial_end: before!.trial_end,
            has_payment_method: before!.has_payment_method,
        });
    }
});

// A trial now starts without a card (payment_method_collection:
// "if_required", with missing_payment_method: "cancel"). So on the day
// it ends nothing is charged — the plan stops. The page said "when your
// first payment is taken" to everybody, which told the one business
// that had something to do that it was already done, and contradicted
// the trial-ending email we send five days earlier.
//
// Nothing here goes near Stripe: the row is what the page reads.
test("a trial with no card is told it stops, and given the way to keep it", async ({ page }) => {
    test.setTimeout(120_000);
    // The seeded business already has a subscription row so it has Pro's
    // features, so this moves that row rather than adding a second one the
    // page would have to choose between.
    const { businessId } = JSON.parse(fs.readFileSync(STATE_PATH, "utf8"));

    const admin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { autoRefreshToken: false, persistSession: false } },
    );

    const { data: before } = await admin
        .from("subscriptions")
        .select("stripe_subscription_id, status, trial_end, has_payment_method")
        .eq("business_id", businessId)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

    const trialEnd = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString();
    const move = (fields: Record<string, unknown>) =>
        admin.from("subscriptions").update(fields).eq("stripe_subscription_id", before!.stripe_subscription_id);

    try {
        await move({ status: "trialing", trial_end: trialEnd, has_payment_method: false });

        await page.goto(`/business/${businessId}/billing`, { timeout: 120_000 });
        await expect(page.getByText(/There's no card on this yet/), "says what will happen").toBeVisible({
            timeout: 60_000,
        });
        await expect(page.getByText("when your first payment is taken")).toHaveCount(0);

        // Where the trial-ending email's "Add a card and keep it" lands.
        await expect(
            page.getByRole("button", { name: "Add a card to keep Pro" }),
            "and the way to do it",
        ).toBeVisible();

        // With a card there is nothing to do, and saying so would be noise.
        await move({ has_payment_method: true });
        await page.reload({ timeout: 120_000 });

        await expect(page.getByText("when your first payment is taken")).toBeVisible({ timeout: 60_000 });
        await expect(page.getByRole("button", { name: "Add a card to keep Pro" })).toHaveCount(0);
    } finally {
        await move({
            status: before!.status,
            trial_end: before!.trial_end,
            has_payment_method: before!.has_payment_method,
        });
    }
});

// The banner listed offers and followers and said nothing about the
// stamp card unless somebody was already holding one — so the business
// most worth telling, the one whose card has not been joined yet, heard
// nothing about the thing Free had just stopped taking people for.
test("the lapsed banner names the stamp card, joined or not", async ({ page }) => {
    test.setTimeout(120_000);
    const { businessId } = JSON.parse(fs.readFileSync(STATE_PATH, "utf8"));

    const admin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { autoRefreshToken: false, persistSession: false } },
    );

    const { data: before } = await admin
        .from("subscriptions")
        .select("stripe_subscription_id, status")
        .eq("business_id", businessId)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

    const move = (status: string) =>
        admin.from("subscriptions").update({ status }).eq("stripe_subscription_id", before!.stripe_subscription_id);

    // A card of its own, started while the business is still on Pro —
    // enforce_loyalty_plan would refuse it afterwards, which is the
    // point. Nobody joins it: the empty card is the case that was
    // getting no mention at all.
    const { data: program, error: started } = await admin
        .from("loyalty_programs")
        .insert({
            business_id: businessId,
            name: `E2E Banner card ${Date.now()}`,
            stamps_required: 6,
            reward: "a free coffee",
            is_active: true,
        })
        .select("id")
        .single();
    expect(started, "a card can be started while on Pro").toBeNull();

    try {
        await move("canceled");

        await page.goto(`/business/${businessId}`, { timeout: 120_000 });
        await expect(page.getByText("Pro is off"), "the banner is up").toBeVisible({ timeout: 60_000 });

        // Named in the opening line whatever the holder count.
        await expect(page.getByText(/lets new customers join your stamp card/)).toBeVisible();

        // And a line of its own about who can join.
        await expect(page.getByText(/can join .*on Free|can join your stamp card on Free/)).toBeVisible();
    } finally {
        await admin.from("loyalty_programs").delete().eq("id", program!.id);
        await move(before!.status);
    }
});
