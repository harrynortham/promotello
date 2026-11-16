import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import { STATE_PATH, BUSINESS_AUTH, CUSTOMER_AUTH } from "../global-setup";

test.use({ storageState: BUSINESS_AUTH });

test("free business at its live offer limit is asked to upgrade", async ({ page }) => {
    const { freeBusinessId } = JSON.parse(fs.readFileSync(STATE_PATH, "utf8"));

    await page.goto(`/business/${freeBusinessId}/offers`);
    await expect(page.getByText("Free plan · 1 of 1 live offer used")).toBeVisible();

    await page.goto(`/business/${freeBusinessId}/offers/new`);
    await expect(
        page.getByRole("heading", { name: "You've reached your live offer limit" }),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Upgrade to Pro" })).toBeVisible();
});

test("the database rejects a second live offer on the Free plan", async () => {
    const state = JSON.parse(fs.readFileSync(STATE_PATH, "utf8"));

    // Bypass the UI and insert directly as the signed-in owner.
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
        { auth: { autoRefreshToken: false, persistSession: false } },
    );
    const { error: signInError } = await supabase.auth.signInWithPassword({
        email: state.businessEmail,
        password: state.testPassword,
    });
    expect(signInError).toBeNull();

    const { error } = await supabase.from("offers").insert({
        business_id: state.freeBusinessId,
        created_by: state.businessUserId,
        slug: `e2e-over-limit-${Date.now()}`,
        title: "Over the limit",
        category: "Testing",
        discount: "1% off",
        description: "Should be rejected by the plan limit trigger.",
        availability: "Available now",
        expires_at: "2030-12-31",
        terms: "For automated tests only.",
        approval_status: "pending",
    });

    expect(error?.code).toBe("P0004");
});

// The way to make another offer leads the grid rather than trailing it,
// and there is one of it: the button that used to sit above the list
// said the same thing with no reason attached.
test("making another offer is the first thing in the list", async ({ page }) => {
    const { businessId } = JSON.parse(fs.readFileSync(STATE_PATH, "utf8"));

    await page.goto(`/business/${businessId}/offers`);
    await expect(page.getByText("Add another offer")).toBeVisible({ timeout: 20_000 });

    const first = await page.evaluate(() => {
        const grid = document.querySelector("section .grid");
        return (grid?.firstElementChild?.textContent ?? "").trim();
    });
    expect(first).toContain("Add another offer");

    // One way in, inside the card, not a button above the grid as well.
    await expect(page.getByRole("button", { name: "Create offer" })).toHaveCount(1);
});

// A stamp card is the half of Pro that does the selling, and until
// 20270120090000 the Free plan gave it away: starting a card was
// blocked, joining one was not. So a business whose trial lapsed kept a
// fully working card and went on collecting new members for nothing.
//
// The line is drawn where it costs a customer nothing: somebody already
// holding a card keeps it and keeps collecting, and only a new joiner is
// turned away.
test("a card on the Free plan keeps its holders and takes nobody new", async () => {
    const state = JSON.parse(fs.readFileSync(STATE_PATH, "utf8"));

    const admin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { autoRefreshToken: false, persistSession: false } },
    );

    // Exactly how a lapsed trial leaves one standing: the card is started
    // while the business is on Pro, and then the plan goes away. It can't
    // be faked by flipping is_active, because enforce_loyalty_plan fires
    // on the update too.
    const subscription = `sub_e2e_lapse_${Date.now()}`;

    await admin.from("subscriptions").insert({
        business_id: state.freeBusinessId,
        stripe_subscription_id: subscription,
        stripe_customer_id: `cus_e2e_lapse_${Date.now()}`,
        status: "active",
        tier: "pro",
    });

    const { data: program, error: madeIt } = await admin
        .from("loyalty_programs")
        .insert({
            business_id: state.freeBusinessId,
            name: `E2E Lapsed card ${Date.now()}`,
            stamps_required: 6,
            reward: "a free coffee",
            is_active: true,
        })
        .select("id")
        .single();
    expect(madeIt, "a card can be started on Pro").toBeNull();

    // And now the plan ends.
    await admin.from("subscriptions").delete().eq("stripe_subscription_id", subscription);

    const customer = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
        { auth: { autoRefreshToken: false, persistSession: false } },
    );

    try {
        const { error: signInError } = await customer.auth.signInWithPassword({
            email: state.customerEmail,
            password: state.testPassword,
        });
        expect(signInError).toBeNull();

        // Nobody new.
        const { error: refused } = await customer.rpc("join_loyalty_program", {
            requested_program_id: program!.id,
        });
        expect(refused?.code, "a new joiner is turned away").toBe("P0010");

        // Somebody already holding one is untouched: their card comes
        // back, and a stamp still goes on it.
        const { data: held } = await admin
            .from("loyalty_cards")
            .insert({ program_id: program!.id, user_id: state.customerUserId })
            .select("id, card_code, stamps")
            .single();

        const { error: handedBack } = await customer.rpc("join_loyalty_program", {
            requested_program_id: program!.id,
        });
        expect(handedBack, "a holder gets their own card back").toBeNull();

        const business = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
            { auth: { autoRefreshToken: false, persistSession: false } },
        );
        await business.auth.signInWithPassword({
            email: state.businessEmail,
            password: state.testPassword,
        });

        const { error: stamped } = await business.rpc("add_loyalty_stamp", {
            requested_code: held!.card_code,
        });
        expect(stamped, "and staff can still stamp it").toBeNull();

        const { data: after } = await admin
            .from("loyalty_cards")
            .select("stamps")
            .eq("id", held!.id)
            .single();
        expect(after!.stamps).toBe(held!.stamps + 1);
    } finally {
        await admin.from("loyalty_programs").delete().eq("id", program!.id);
        await admin.from("subscriptions").delete().eq("stripe_subscription_id", subscription);
    }
});

// A poster in a window points straight at the card, and the QR page
// promises the business "nobody hits a dead end: a scan lands on your
// business page instead". Hiding the card on Free made that a lie: a
// customer scanned a stamp-card poster and landed on a page with no
// mention of one. So it is shown and said to be closed instead.
test("scanning a card poster on Free lands on the card, closed rather than missing", async ({ browser }) => {
    const state = JSON.parse(fs.readFileSync(STATE_PATH, "utf8"));

    const admin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { autoRefreshToken: false, persistSession: false } },
    );

    const stamp = Date.now();
    const subscription = `sub_e2e_poster_${stamp}`;

    // Started on Pro, like every card on a lapsed business.
    await admin.from("subscriptions").insert({
        business_id: state.freeBusinessId,
        stripe_subscription_id: subscription,
        stripe_customer_id: `cus_e2e_poster_${stamp}`,
        status: "active",
        tier: "pro",
    });

    const { data: program } = await admin
        .from("loyalty_programs")
        .insert({
            business_id: state.freeBusinessId,
            name: `E2E Poster card ${stamp}`,
            stamps_required: 8,
            reward: "a free flat white",
            is_active: true,
        })
        .select("id")
        .single();

    const code = `e2eqr${String(stamp).slice(-7)}`;
    await admin.from("qr_codes").insert({
        business_id: state.freeBusinessId,
        label: "E2E window",
        loyalty_program_id: program!.id,
        code,
    });

    await admin.from("subscriptions").delete().eq("stripe_subscription_id", subscription);

    const customer = await (await browser.newContext({ storageState: CUSTOMER_AUTH })).newPage();

    try {
        await customer.goto(`/q/${code}`, { timeout: 120_000 });

        // The card itself, not a page that has forgotten about it.
        const panel = customer.locator(`#loyalty-${program!.id}`);
        await expect(panel, "the scan finds the card").toBeVisible({ timeout: 60_000 });
        await expect(panel).toContainText("Collect 8 stamps");
        await expect(panel.getByText("Not taking new members")).toBeVisible();

        // And no door that leads nowhere.
        await expect(panel.getByRole("button", { name: "Join the loyalty card" })).toHaveCount(0);
    } finally {
        await admin.from("qr_codes").delete().eq("code", code);
        await admin.from("loyalty_programs").delete().eq("id", program!.id);
        await admin.from("subscriptions").delete().eq("stripe_subscription_id", subscription);
    }
});

// One free trial per business (billing/actions.ts: trialEligible is
// existing.length === 0). Every place that offers Pro inside the
// dashboard has to know that, or it promises "free for 30 days and no
// card to start" to somebody who will meet a card form one click later.
test("the loyalty publish gate offers a trial only to a business that can have one", async ({ page }) => {
    const state = JSON.parse(fs.readFileSync(STATE_PATH, "utf8"));

    const admin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { autoRefreshToken: false, persistSession: false } },
    );

    const build = `/business/${state.freeBusinessId}/loyalty/new`;

    // Never subscribed: the trial is real and worth saying.
    await page.goto(build, { timeout: 120_000 });
    await expect(page.getByRole("button", { name: "Start free trial to publish" })).toBeVisible({
        timeout: 60_000,
    });
    await expect(page.getByText("free for 30 days and no card to start")).toBeVisible();

    const subscription = `sub_e2e_spent_${Date.now()}`;

    try {
        // Had one, and let it go: Pro now starts with a card form.
        await admin.from("subscriptions").insert({
            business_id: state.freeBusinessId,
            stripe_subscription_id: subscription,
            stripe_customer_id: `cus_e2e_spent_${Date.now()}`,
            status: "canceled",
            tier: "pro",
        });

        await page.goto(build, { timeout: 120_000 });
        await expect(page.getByRole("button", { name: "Go Pro to publish" })).toBeVisible({
            timeout: 60_000,
        });
        await expect(page.getByText("free for 30 days and no card to start")).toHaveCount(0);
    } finally {
        await admin.from("subscriptions").delete().eq("stripe_subscription_id", subscription);
    }
});
