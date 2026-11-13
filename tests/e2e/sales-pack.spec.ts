import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import fs from "fs";

import { BUSINESS_AUTH, CUSTOMER_AUTH, STATE_PATH } from "../global-setup";

// A business only we can see, and the six sheets printed off it
// (20270102090000_a_business_only_we_can_see.sql).

const needsMigration =
    "apply supabase/migrations/20270102090000_a_business_only_we_can_see.sql first";

const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
);

const state = () => JSON.parse(fs.readFileSync(STATE_PATH, "utf8"));

const asVisitor = () =>
    createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
        { auth: { autoRefreshToken: false, persistSession: false } },
    );

async function signedIn() {
    const { businessEmail, testPassword } = state();
    const client = asVisitor();
    await client.auth.signInWithPassword({ email: businessEmail, password: testPassword });
    return client;
}

// A hidden business of this test's own, so nothing here ever touches
// the real demo business. Built with the service role, which is how
// every other spec seeds.
async function hiddenBusiness(ownerId: string) {
    const { data: category } = await admin
        .from("categories")
        .select("id")
        .eq("slug", "cafes-coffee")
        .single();

    const { data: business, error } = await admin
        .from("businesses")
        .insert({
            name: `E2E Hidden Coffee ${Date.now()}`,
            category_id: category!.id,
            category: "Cafés & coffee",
            description: "A hidden business, for a test.",
            approval_status: "approved",
            demo_at: new Date().toISOString(),
            created_by: ownerId,
        })
        .select("id, slug, name")
        .single();

    expect(error, needsMigration).toBeNull();

    await admin.from("business_members").insert({
        business_id: business!.id,
        user_id: ownerId,
        role: "owner",
    });

    await admin.from("offers").insert({
        business_id: business!.id,
        category_id: category!.id,
        title: "Free pastry with any hot drink",
        description: "A hidden offer, for a test.",
        discount: "Free pastry",
        availability: "Any time",
        terms: "For automated tests only.",
        expires_at: new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10),
        approval_status: "approved",
        created_by: ownerId,
        kind: "freebie",
        kind_item: "pastry",
    });

    return business!;
}

test("a business with demo_at set is ours alone, in the API and on the page", async ({ browser }) => {
    test.setTimeout(240_000);
    const { businessUserId } = state();
    const business = await hiddenBusiness(businessUserId);

    try {
        // Nobody signed in can read the row…
        const stranger = asVisitor();
        const { data: unseen } = await stranger
            .from("businesses")
            .select("id")
            .eq("id", business.id);

        expect(unseen, needsMigration).toEqual([]);

        // …and its page is not there either. A streamed page has
        // already sent its 200 by the time the server calls
        // notFound(), so what it says is the test, not the status.
        const anon = await (await browser.newContext()).newPage();
        await anon.goto(`/businesses/${business.slug}`, { timeout: 90_000 });
        await expect(
            anon.getByRole("heading", { level: 1, name: /couldn.t find/i }),
        ).toBeVisible({ timeout: 60_000 });

        // Nor is it in the directory.
        await anon.goto("/businesses", { timeout: 90_000 });
        await expect(anon.getByText(business.name)).toHaveCount(0);

        // We can see all of it.
        await admin.from("platform_admins").insert({ user_id: businessUserId });

        const us = await signedIn();
        const { data: seen } = await us.from("businesses").select("id").eq("id", business.id);
        expect(seen).toHaveLength(1);

        const ours = await (await browser.newContext({ storageState: BUSINESS_AUTH })).newPage();
        await ours.goto(`/businesses/${business.slug}`, { timeout: 90_000 });
        await expect(ours.getByRole("heading", { name: business.name, level: 1 })).toBeVisible({
            timeout: 60_000,
        });
    } finally {
        await admin.from("platform_admins").delete().eq("user_id", businessUserId);
        await admin.from("businesses").delete().eq("id", business.id);
    }
});

test("the pack prints seven sheets off a business's own card, offer and report", async ({ browser }) => {
    test.setTimeout(300_000);
    const { businessUserId, businessId } = state();

    await admin.from("platform_admins").insert({ user_id: businessUserId });

    const page = await (await browser.newContext({ storageState: BUSINESS_AUTH })).newPage();

    try {
        // The link is ours: a business owner is not shown a page of our
        // prices inside their own dashboard.
        await page.goto(`/business/${businessId}`, { timeout: 120_000 });
        await expect(page.getByRole("button", { name: "Sales pack" })).toBeVisible({
            timeout: 90_000,
        });

        await page.emulateMedia({ media: "print" });
        await page.goto(`/sales-pack/${businessId}`, { timeout: 120_000 });

        await expect(page).toHaveTitle(/Promotello$/, { timeout: 60_000 });

        for (const heading of [
            "A poster in your window, and who scanned it",
            "The card they keep on their phone",
            "An offer that puts somebody through the door this week",
            "Where people find you",
            "What you get, and what it costs",
            "The number nobody else can print",
        ]) {
            await expect(page.getByRole("heading", { name: heading })).toBeVisible();
        }

        // Seven sheets, each with its own footer, in the order the
        // README sells in: an offer puts somebody through the door, the
        // card brings them back.
        await expect(page.getByText("of 7 · promotello.com")).toHaveCount(7);

        const sheets = await page.locator("main > section").evaluateAll((all) =>
            all.map((sheet) => sheet.getAttribute("aria-label")),
        );
        expect(sheets).toEqual([
            "What this does",
            "The directory",
            "The poster",
            "The offers",
            "The card",
            "What you get",
            "The numbers",
        ]);

        // It is a leave-behind, so it has to come off a printer
        // looking like the thing it is selling. Browsers drop every
        // background when printing unless they are told not to, and
        // the sheets used to throw their own colour away on top of
        // that.
        const quote = page.locator("blockquote").first();
        const printed = await quote.evaluate((element) => {
            const style = getComputedStyle(element);
            return {
                background: style.backgroundColor,
                adjust: style.printColorAdjust,
            };
        });

        expect(printed.background, "the navy block is still navy on paper").toBe("rgb(23, 35, 59)");
        expect(printed.adjust, "and the browser is told to print it").toBe("exact");

        // The features and the prices are read from the product, not
        // typed onto the sheet.
        await expect(page.getByText("Monthly value report by email")).toBeVisible();
        await expect(page.getByText("£39/mo")).toBeVisible();

        // The seeded business has no loyalty card, so that sheet says
        // so rather than printing an empty box.
        await expect(page.getByText("An example, until yours has one").first()).toBeVisible();
    } finally {
        await admin.from("platform_admins").delete().eq("user_id", businessUserId);
    }
});

test("the pack is not for strangers, and the link is not for owners", async ({ browser }) => {
    test.setTimeout(180_000);
    const { businessId } = state();

    // A customer with no business of their own.
    const customer = await (await browser.newContext({ storageState: CUSTOMER_AUTH })).newPage();
    await customer.goto(`/sales-pack/${businessId}`, { timeout: 120_000 });
    // The site-wide not-found, which is a different page from the one
    // the directory shows for a business (and worded differently).
    await expect(customer.getByText(/Error 404/)).toBeVisible({ timeout: 90_000 });

    // The owner, with nobody's admin hat on: no link to it.
    const owner = await (await browser.newContext({ storageState: BUSINESS_AUTH })).newPage();
    await owner.goto(`/business/${businessId}`, { timeout: 120_000 });
    await expect(owner.getByRole("button", { name: "View analytics" })).toBeVisible({
        timeout: 90_000,
    });
    await expect(owner.getByRole("button", { name: "Sales pack" })).toHaveCount(0);
});

test("only an admin builds the demo business", async () => {
    const us = await signedIn();

    const { error } = await us.rpc("refresh_demo_business");

    expect(error, needsMigration).not.toBeNull();
    expect(error!.code).toBe("42501");
});

test("building it stocks a business nobody else can see", async () => {
    test.setTimeout(120_000);
    const { businessUserId } = state();

    // Never touch the real one: once it has been built from /admin/demo
    // this is somebody's sales kit, and rebuilding it is their button
    // to press, not a test's.
    const { data: already } = await admin
        .from("businesses")
        .select("id")
        .not("demo_at", "is", null)
        .limit(1);

    test.skip((already ?? []).length > 0, "the demo business is already built");

    await admin.from("platform_admins").insert({ user_id: businessUserId });
    let demoId: string | null = null;

    try {
        const us = await signedIn();
        const { data, error } = await us.rpc("refresh_demo_business");

        expect(error, needsMigration).toBeNull();
        demoId = data as string;
        expect(demoId).toBeTruthy();

        const { data: business } = await admin
            .from("businesses")
            .select("name, approval_status, demo_at, category")
            .eq("id", demoId!)
            .single();

        expect(business?.approval_status).toBe("approved");
        expect(business?.demo_at).not.toBeNull();
        expect(business?.category).toBe("Cafés & coffee");

        // Whoever pressed the button owns it.
        const { data: member } = await admin
            .from("business_members")
            .select("role")
            .eq("business_id", demoId!)
            .eq("user_id", businessUserId)
            .single();
        expect(member?.role).toBe("owner");

        // Growth, so the card and the report are switched on.
        const { data: plan } = await admin
            .from("subscriptions")
            .select("tier, status, price_id")
            .eq("business_id", demoId!)
            .single();
        expect(plan?.tier).toBe("growth");
        expect(plan?.status).toBe("active");
        expect(plan?.price_id, "never one of the founding places").toBeNull();

        const { count: offers } = await admin
            .from("offers")
            .select("id", { count: "exact", head: true })
            .eq("business_id", demoId!);
        expect(offers).toBe(3);

        const { data: program } = await admin
            .from("loyalty_programs")
            .select("id, stamps_required")
            .eq("business_id", demoId!)
            .single();
        expect(program?.stamps_required).toBe(6);

        const { data: cards } = await admin
            .from("loyalty_cards")
            .select("id, stamps, guest_token, guest_name, created_at")
            .eq("program_id", program!.id);

        expect(cards).toHaveLength(12);
        expect(
            cards!.every((card) => card.guest_token !== null),
            "guests, so nothing can ever email a made-up person",
        ).toBe(true);

        // The stamps are real events, and every one of them lands after
        // the card was joined — which is the whole claim the report
        // makes about who we sent.
        const { data: events } = await admin
            .from("loyalty_events")
            .select("card_id, created_at")
            .in("card_id", cards!.map((card) => card.id));

        const stamps = cards!.reduce((total, card) => total + card.stamps, 0);
        expect(events).toHaveLength(stamps);

        const joined = new Map(cards!.map((card) => [card.id, card.created_at]));
        expect(
            events!.every((event) => new Date(event.created_at) > new Date(joined.get(event.card_id)!)),
            "joined first, came in afterwards",
        ).toBe(true);

        // And the report counts them.
        const { data: report } = await admin.rpc("business_repeat_visits", {
            requested_business_id: demoId!,
            months: 3,
        });

        expect(report.sent_by_promotello).toBeGreaterThan(0);
        expect(report.sent_returned).toBeGreaterThan(0);

        // Pressing it twice is how a sales call ends, so it must not
        // pile up a second set of everything.
        const { data: again } = await us.rpc("refresh_demo_business");
        expect(again).toBe(demoId);

        const { count: offersAgain } = await admin
            .from("offers")
            .select("id", { count: "exact", head: true })
            .eq("business_id", demoId!);
        expect(offersAgain).toBe(3);
    } finally {
        if (demoId) {
            await admin.from("businesses").delete().eq("id", demoId);
        }
        await admin.from("platform_admins").delete().eq("user_id", businessUserId);
    }
});
