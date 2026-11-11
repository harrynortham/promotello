import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import { STATE_PATH, BUSINESS_AUTH, CUSTOMER_AUTH } from "../global-setup";

const admin = () =>
    createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
        auth: { autoRefreshToken: false, persistSession: false },
    });

test("platform admins see the overview and admin navigation", async ({ browser }) => {
    const { businessUserId } = JSON.parse(fs.readFileSync(STATE_PATH, "utf8"));

    // Make the test business user a platform admin for this test only.
    await admin().from("platform_admins").insert({ user_id: businessUserId });

    try {
        const page = await (await browser.newContext({ storageState: BUSINESS_AUTH })).newPage();
        await page.goto("/admin");

        await expect(page.getByRole("heading", { name: "Overview", level: 1 })).toBeVisible();
        await expect(page.getByRole("heading", { name: "Revenue" })).toBeVisible();
        await expect(page.getByRole("group", { name: "Weekly active businesses" })).toBeVisible();

        // Same sidebar on every admin page.
        const nav = page.getByRole("navigation", { name: "Platform admin" });
        await nav.getByRole("button", { name: /Audit log/ }).click();
        await expect(page.getByRole("heading", { name: "Audit log", level: 1 })).toBeVisible();
        await expect(nav.getByRole("button", { name: /Audit log/ })).toHaveAttribute("aria-current", "page");

        // The account menu links admins to /admin.
        await page.getByRole("button", { name: /Open account menu/ }).click();
        await expect(page.getByRole("menuitem", { name: "Platform admin" })).toBeVisible();
    } finally {
        await admin().from("platform_admins").delete().eq("user_id", businessUserId);
    }
});

test("customers can't open admin pages or metrics", async ({ browser }) => {
    const page = await (await browser.newContext({ storageState: CUSTOMER_AUTH })).newPage();
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/dashboard/);

    const { customerEmail, testPassword } = JSON.parse(fs.readFileSync(STATE_PATH, "utf8"));
    const customer = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
        auth: { autoRefreshToken: false, persistSession: false },
    });
    await customer.auth.signInWithPassword({ email: customerEmail, password: testPassword });
    const { error } = await customer.rpc("platform_metrics");
    expect(error?.code).toBe("42501");
});

// The directory as well as the queue: every business, filterable, and one
// page per business with its billing and everything we have emailed it.
test("admins can browse every business and open one", async ({ browser }) => {
    const { businessUserId, businessId } = JSON.parse(fs.readFileSync(STATE_PATH, "utf8"));

    await admin().from("platform_admins").insert({ user_id: businessUserId });
    // An email history to read.
    await admin().from("business_lifecycle_sends").upsert([
        { business_id: businessId, kind: "welcome", sent_at: "2026-10-01T09:00:00Z" },
        { business_id: businessId, kind: "loyalty_pitch", sent_at: "2026-10-08T09:00:00Z" },
    ]);

    try {
        const page = await (await browser.newContext({ storageState: BUSINESS_AUTH })).newPage();
        await page.goto("/admin/businesses");

        // The queue first, because that is the job with a deadline.
        await expect(page.getByRole("heading", { name: "Businesses", level: 1 })).toBeVisible();
        await expect(page.getByText("waiting to join Promotello")).toBeVisible();

        await page.getByRole("button", { name: "All businesses" }).click();
        await expect(page.getByText("Every business on Promotello")).toBeVisible();
        await expect(page.getByLabel("Status")).toBeVisible();
        await expect(page.getByRole("button", { name: "Open" }).first()).toBeVisible();

        // Filtering by a status nobody has leaves nothing behind.
        await page.getByLabel("Status").selectOption("rejected");
        await expect(
            page.getByText("No businesses found").or(page.getByRole("button", { name: "Open" }).first()),
        ).toBeVisible();

        // Back to every business: the filter above may have left none on
        // screen, which is the point of that assertion.
        await page.getByLabel("Status").selectOption("all");
        await expect(page.getByRole("button", { name: "Open", exact: true }).first()).toBeVisible();

        // A reviewer has to be able to see what they are approving, and a
        // business waiting for review has no public page yet — an admin
        // sees it as a preview.
        // Rendered as a link styled as a button, which Base UI gives
        // role="button".
        const profile = page.getByRole("button", { name: /View full profile/ }).first();
        await expect(profile).toHaveAttribute("href", /^\/businesses\//);

        await page.goto(`/admin/businesses/${businessId}`);
        await expect(page.getByRole("heading", { name: "E2E Test Business", level: 1 })).toBeVisible();

        // Not their dashboard: an admin isn't a member, so that link only
        // ever bounced to /business/dashboard.
        await expect(page.getByRole("button", { name: /Their dashboard/i })).toHaveCount(0);
        await expect(page.getByRole("button", { name: /Public page|Preview their page/ })).toBeVisible();

        for (const section of ["Contact", "Billing", "Activity", "Emails we have sent"]) {
            await expect(page.getByRole("heading", { name: section })).toBeVisible();
        }

        // Every email we have sent it, newest first.
        const history = page.locator("main ol li");
        await expect(history.first()).toContainText("Loyalty card pitch");
        await expect(history.nth(1)).toContainText("Welcome");

        // A count of none is a fact, not a blank.
        await expect(page.getByText("Vouchers claimed").locator("..")).not.toContainText("—");
    } finally {
        await admin().from("business_lifecycle_sends").delete().eq("business_id", businessId);
        await admin().from("platform_admins").delete().eq("user_id", businessUserId);
    }
});

test("a business owner can't read another business's billing or emails", async ({ browser }) => {
    const { businessId } = JSON.parse(fs.readFileSync(STATE_PATH, "utf8"));

    // Signed in, but not a platform admin: the overview reads with the
    // service key, so it checks for itself rather than trusting the layout.
    const page = await (await browser.newContext({ storageState: BUSINESS_AUTH })).newPage();
    await page.goto(`/admin/businesses/${businessId}`);

    await expect(page).toHaveURL(/\/dashboard/);
});

// An offer only reaches customers once its business is approved, so the
// queue reviews them in that order — and says so rather than letting an
// approval land somewhere no one can see it.
test("an offer can't be approved before its business", async ({ browser }) => {
    const state = JSON.parse(fs.readFileSync(STATE_PATH, "utf8"));
    const client = admin();
    let businessId: string | undefined;

    await client.from("platform_admins").insert({ user_id: state.businessUserId });

    try {
        const name = `E2E Waiting Business ${Date.now()}`;
        const { data: business } = await client
            .from("businesses")
            .insert({
                name,
                category: "Testing",
                description: "Automated test business — safe to delete.",
                approval_status: "pending",
                created_by: state.businessUserId,
            })
            .select("id")
            .single();
        businessId = business!.id;

        const title = `E2E Early Offer ${Date.now()}`;
        const { data: offer } = await client
            .from("offers")
            .insert({
                business_id: businessId,
                created_by: state.businessUserId,
                slug: `e2e-early-${Date.now()}`,
                title,
                category: "Testing",
                discount: "5% off",
                description: "An offer whose business is still being checked.",
                availability: "Available now",
                expires_at: "2030-12-31",
                terms: "For automated tests only.",
                approval_status: "pending",
                redemption_count: 0,
            })
            .select("id")
            .single();

        // The queue says where the business has got to, and doesn't
        // offer an approval the database would refuse.
        const page = await (await browser.newContext({ storageState: BUSINESS_AUTH })).newPage();
        await page.goto("/admin/offers");
        const card = page.locator('[data-slot="card"]', { hasText: title });
        await expect(card.getByText("Approve the business first")).toBeVisible({ timeout: 15_000 });
        await expect(card.getByRole("button", { name: "Approve" })).toBeDisabled();
        // Turning it down never needs the business approved first.
        await expect(card.getByRole("button", { name: "Reject" })).toBeEnabled();

        // And the rule holds under the UI.
        const asAdmin = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
            { auth: { autoRefreshToken: false, persistSession: false } },
        );
        await asAdmin.auth.signInWithPassword({ email: state.businessEmail, password: state.testPassword });

        const refused = await asAdmin.rpc("review_offer", { offer_id: offer!.id, decision: "approved" });
        expect(
            refused.error?.message,
            "supabase/migrations/20261206110000_review_offer_needs_approved_business.sql isn't applied",
        ).toContain("Approve the business first");

        // Rejecting is allowed whatever the business's status.
        const rejected = await asAdmin.rpc("review_offer", { offer_id: offer!.id, decision: "rejected" });
        expect(rejected.error).toBeNull();
    } finally {
        if (businessId) await client.from("businesses").delete().eq("id", businessId);
        await client.from("platform_admins").delete().eq("user_id", state.businessUserId);
    }
});

// The other half of the same rule: until the business is approved, its
// offers are not on the site, however the offer itself is marked.
test("an approved offer stays hidden while its business waits", async ({ page }) => {
    const state = JSON.parse(fs.readFileSync(STATE_PATH, "utf8"));
    const client = admin();
    let businessId: string | undefined;

    try {
        const { data: business } = await client
            .from("businesses")
            .insert({
                name: `E2E Hidden Business ${Date.now()}`,
                category: "Testing",
                description: "Automated test business — safe to delete.",
                approval_status: "pending",
                created_by: state.businessUserId,
            })
            .select("id, slug")
            .single();
        businessId = business!.id;

        const slug = `e2e-hidden-${Date.now()}`;
        const title = `E2E Hidden Offer ${Date.now()}`;
        await client.from("offers").insert({
            business_id: businessId,
            created_by: state.businessUserId,
            slug,
            title,
            category: "Testing",
            discount: "5% off",
            description: "Approved, but its business is still being checked.",
            availability: "Available now",
            expires_at: "2030-12-31",
            terms: "For automated tests only.",
            approval_status: "approved",
            redemption_count: 0,
        });

        // Not in the listing, and not on a page of its own.
        const anon = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
            { auth: { persistSession: false } },
        );
        const { data: visible } = await anon.from("offers").select("id").eq("slug", slug);
        expect(visible, "an anonymous visitor cannot read it").toEqual([]);

        await page.goto(`/offers/${slug}`);
        await expect(page.getByRole("heading", { name: /couldn.t find that deal/ })).toBeVisible();
    } finally {
        if (businessId) await client.from("businesses").delete().eq("id", businessId);
    }
});

// The offer queue: a row to decide from, the whole offer in a dialog,
// and a page of everything we hold for when a business asks.
test("the offer queue opens an offer in full, and a page of its history", async ({ browser }) => {
    // Three admin pages in one walk, each reading several tables.
    test.setTimeout(90_000);

    const state = JSON.parse(fs.readFileSync(STATE_PATH, "utf8"));
    const client = admin();
    let offerId: string | undefined;

    await client.from("platform_admins").insert({ user_id: state.businessUserId });

    try {
        const { data: picture } = await client
            .from("offers")
            .select("image_url")
            .not("image_url", "is", null)
            .limit(1)
            .single();

        const title = `E2E Queue Offer ${Date.now()}`;
        const { data: offer } = await client
            .from("offers")
            .insert({
                business_id: state.businessId,
                created_by: state.businessUserId,
                slug: `e2e-queue-${Date.now()}`,
                title,
                category: "Testing",
                discount: "2 for 1 on cocktails",
                description: "Every cocktail on the list, Monday to Thursday.",
                availability: "Monday to Thursday, 5pm-close",
                expires_at: "2030-12-31",
                terms: "One per customer.",
                approval_status: "pending",
                redemption_count: 0,
                image_url: picture!.image_url,
            })
            .select("id")
            .single();
        offerId = offer!.id;

        const page = await (await browser.newContext({ storageState: BUSINESS_AUTH })).newPage();
        await page.goto("/admin/offers");

        const card = page.locator('[data-slot="card"]', { hasText: title });
        await expect(card).toBeVisible({ timeout: 15_000 });

        // A row is for choosing which offer to open: no photographs in it.
        await expect(card.locator("img")).toHaveCount(0);

        // The whole offer, without leaving the queue.
        await card.getByRole("button", { name: "View offer" }).click();
        const dialog = page.getByRole("dialog");
        await expect(dialog.getByRole("heading", { name: title })).toBeVisible();
        await expect(dialog.getByText("Every cocktail on the list, Monday to Thursday.")).toBeVisible();
        await expect(dialog.getByText("One per customer.")).toBeVisible();
        await expect(dialog.locator("img")).toHaveCount(1);
        // Wait for it to actually go: its backdrop swallows the click
        // underneath while it is still closing.
        await page.keyboard.press("Escape");
        await expect(dialog).toBeHidden();

        // And everything we hold about it.
        // A Button rendering a Link is an <a role="button">, not a link.
        await card.getByRole("button", { name: "Open", exact: true }).click();
        await page.waitForURL(`**/admin/offers/${offerId}`);
        await expect(page.getByRole("heading", { name: title })).toBeVisible();
        await expect(page.getByText("Claimed", { exact: true })).toBeVisible();
        await expect(page.getByText("Page views", { exact: true })).toBeVisible();
        // The audit trail: it was created a moment ago.
        await expect(page.getByText("Submitted", { exact: true }).first()).toBeVisible();
    } finally {
        if (offerId) await client.from("offers").delete().eq("id", offerId);
        await client.from("platform_admins").delete().eq("user_id", state.businessUserId);
    }
});

// The other tab is the catalogue: every offer, filtered, for looking one
// up rather than deciding on it.
test("the offer catalogue filters by status", async ({ browser }) => {
    const state = JSON.parse(fs.readFileSync(STATE_PATH, "utf8"));
    const client = admin();

    await client.from("platform_admins").insert({ user_id: state.businessUserId });

    try {
        const page = await (await browser.newContext({ storageState: BUSINESS_AUTH })).newPage();
        await page.goto("/admin/offers");
        await expect(page.getByRole("heading", { name: "Offers", level: 1 })).toBeVisible({ timeout: 15_000 });

        await page.getByRole("button", { name: "All offers" }).click();
        await expect(page.getByText("Every offer on Promotello, newest first.")).toBeVisible();

        await page.locator("#status").selectOption("approved");

        // The rows themselves: the filter panel above them is a card
        // too, and its status menu lists every word we are checking for.
        const rows = page.locator('section [data-slot="card"]');
        await expect(rows.filter({ hasText: "Live" }).first()).toBeVisible({ timeout: 15_000 });
        await expect(rows.filter({ hasText: "Waiting" })).toHaveCount(0);
    } finally {
        await client.from("platform_admins").delete().eq("user_id", state.businessUserId);
    }
});

// An edit goes back for review when it changes what the offer promises,
// and not when it changes the picture. A live offer is invisible while it
// waits, so every needless trip back took the offer off the site and left
// the QR poster in the window pointing at a page without it.
test("an edit only goes back for review when it changes what is promised", async () => {
    const state = JSON.parse(fs.readFileSync(STATE_PATH, "utf8"));
    const client = admin();

    const { data: picture } = await client
        .from("offers")
        .select("image_url")
        .not("image_url", "is", null)
        .limit(1)
        .single();

    const { data: offer } = await client
        .from("offers")
        .insert({
            business_id: state.businessId,
            created_by: state.businessUserId,
            slug: `e2e-editrule-${Date.now()}`,
            title: "E2E Edit Rule",
            category: "Testing",
            discount: "10% off",
            description: "An offer for the edit rule test.",
            availability: "Available now",
            expires_at: "2030-12-31",
            terms: "For automated tests only.",
            approval_status: "approved",
            redemption_count: 0,
            image_url: picture!.image_url,
        })
        .select("id")
        .single();

    try {
        const owner = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
            { auth: { autoRefreshToken: false, persistSession: false } },
        );
        await owner.auth.signInWithPassword({
            email: state.businessEmail,
            password: state.testPassword,
        });

        const statusNow = async () => {
            const { data } = await client
                .from("offers")
                .select("approval_status")
                .eq("id", offer!.id)
                .single();
            return data!.approval_status;
        };

        // A different photograph, a different availability line, a later
        // expiry: none of them change the deal.
        await owner.from("offers").update({ image_url: "https://example.com/new.jpg" }).eq("id", offer!.id);
        expect(
            await statusNow(),
            "supabase/migrations/20261206130000_review_what_changed.sql isn't applied",
        ).toBe("approved");

        await owner.from("offers").update({ availability: "Weekends only" }).eq("id", offer!.id);
        expect(await statusNow(), "an availability line is not a promise").toBe("approved");

        await owner.from("offers").update({ expires_at: "2031-12-31" }).eq("id", offer!.id);
        expect(await statusNow(), "a later expiry is not a promise").toBe("approved");

        // The headline is.
        await owner.from("offers").update({ discount: "90% off" }).eq("id", offer!.id);
        expect(await statusNow(), "a rewritten headline is read by a person").toBe("pending");
    } finally {
        await client.from("offers").delete().eq("id", offer!.id);
    }
});

// A change to a live offer waits in its own queue: the offer keeps
// serving customers with the words we approved, and we read the
// difference rather than the whole offer.
test("a change to a live offer is reviewed without taking it down", async ({ browser }) => {
    test.setTimeout(120_000);

    const state = JSON.parse(fs.readFileSync(STATE_PATH, "utf8"));
    const client = admin();
    let offerId: string | undefined;

    await client.from("platform_admins").insert({ user_id: state.businessUserId });

    try {
        const { data: picture } = await client
            .from("offers")
            .select("image_url")
            .not("image_url", "is", null)
            .limit(1)
            .single();

        const { data: category } = await client
            .from("categories")
            .select("id")
            .not("parent_id", "is", null)
            .eq("is_active", true)
            .limit(1)
            .single();

        const slug = `e2e-liveedit-${Date.now()}`;
        const { data: offer } = await client
            .from("offers")
            .insert({
                business_id: state.businessId,
                created_by: state.businessUserId,
                slug,
                title: "E2E Live Offer",
                category_id: category!.id,
                discount: "10% off",
                // As the form would have saved it, so the edit form opens
                // on "Percentage off" with 10 in the box.
                kind: "percent_off",
                kind_value: 10,
                description: "The wording customers see today.",
                availability: "Available now",
                expires_at: "2030-12-31",
                terms: "For automated tests only.",
                approval_status: "approved",
                redemption_count: 0,
                image_url: picture!.image_url,
            })
            .select("id, slug")
            .single();
        offerId = offer!.id;

        // The business rewrites it.
        const page = await (await browser.newContext({ storageState: BUSINESS_AUTH })).newPage();
        await page.goto(`/business/${state.businessId}/offers/${offerId}/edit`);
        await expect(page.locator("#title")).toHaveValue("E2E Live Offer", { timeout: 20_000 });

        await page.locator("#kindValue").fill("25");
        await page.locator("#description").fill("The wording that is waiting to be read.");
        await page.getByRole("button", { name: "Save changes" }).click();
        await page.waitForURL(`**/business/${state.businessId}/offers`, { timeout: 25_000 });

        // The offer never left the site, and still says what it said.
        const { data: live } = await client
            .from("offers")
            .select("approval_status, discount, description")
            .eq("id", offerId)
            .single();
        expect(live!.approval_status, "the offer stayed live").toBe("approved");
        expect(live!.discount, "customers still see the old headline").toBe("10% off");

        const anon = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
            { auth: { persistSession: false } },
        );
        const { data: visible } = await anon.from("offers").select("discount").eq("id", offerId).single();
        expect(visible!.discount, "and can still read it").toBe("10% off");

        // The business is told where its words are.
        await expect(page.getByText("New wording waiting").first()).toBeVisible({ timeout: 15_000 });

        // We see the difference and answer it.
        await page.goto("/admin/offers");
        await page.getByRole("button", { name: "Changes to live offers" }).click();

        const card = page.locator('section [data-slot="card"]', { hasText: "E2E Live Offer" });
        await expect(card).toBeVisible({ timeout: 15_000 });
        await expect(card.getByText("10% off", { exact: true })).toBeVisible();
        await expect(card.getByText("25% off", { exact: true })).toBeVisible();

        await card.getByRole("button", { name: "Approve the change" }).click();
        await expect(page.getByText("No changes waiting")).toBeVisible({ timeout: 20_000 });

        const { data: after } = await client
            .from("offers")
            .select("approval_status, discount, description")
            .eq("id", offerId)
            .single();
        expect(after!.discount, "the new words are on the offer").toBe("25% off");
        expect(after!.description).toBe("The wording that is waiting to be read.");
        expect(after!.approval_status, "and it never stopped being live").toBe("approved");
    } finally {
        if (offerId) await client.from("offers").delete().eq("id", offerId);
        await client.from("platform_admins").delete().eq("user_id", state.businessUserId);
    }
});

// The roadmap's metric table has eight rows; the overview should answer
// the three the README asks about by name.
test("the overview answers weekly active, trial to paid and repeat visits", async ({ browser }) => {
    const state = JSON.parse(fs.readFileSync(STATE_PATH, "utf8"));
    const client = admin();

    await client.from("platform_admins").insert({ user_id: state.businessUserId });

    try {
        const page = await (await browser.newContext({ storageState: BUSINESS_AUTH })).newPage();
        await page.goto("/admin");

        for (const label of ["Weekly active businesses", "Trial to paid", "Repeat visit rate"]) {
            const metric = page.getByRole("group", { name: label });
            await expect(metric, label).toBeVisible({ timeout: 20_000 });
            // Each carries the roadmap's target beside the number.
            await expect(metric.getByText(/target/i), label).toBeVisible();
        }
    } finally {
        await client.from("platform_admins").delete().eq("user_id", state.businessUserId);
    }
});

// The catalogue used to answer its own first question last. Opening the
// page starts a load for the queue; choosing a tab and then a status
// starts two more, and the queue's answer — empty, because nothing is
// waiting — arrived after them and wiped the list. The page said "No
// offers found" under a filter with 25 behind it.
test("choosing a tab and a status straight after each other shows the offers", async ({ browser }) => {
    const state = JSON.parse(fs.readFileSync(STATE_PATH, "utf8"));
    const client = admin();

    await client.from("platform_admins").insert({ user_id: state.businessUserId });

    try {
        const page = await (await browser.newContext({ storageState: BUSINESS_AUTH })).newPage();
        await page.goto("/admin/offers");

        // No waiting in between: that is the whole point.
        await page.getByRole("button", { name: "All offers" }).click();
        await page.locator("#status").selectOption("approved");

        await expect(page.getByText("No offers found")).toHaveCount(0, { timeout: 15_000 });
        await expect(
            page.locator('section [data-slot="card"]').filter({ hasText: "Live" }).first(),
        ).toBeVisible();

        // And the filter the page is showing is the one it answered.
        await expect(page.locator("#status")).toHaveValue("approved");
    } finally {
        await client.from("platform_admins").delete().eq("user_id", state.businessUserId);
    }
});

// Two backfills left what their rules couldn't read alone: "£10 credit"
// has no type, "Tuesday to Thursday evenings" has no days. Until someone
// answers the pickers those offers sit outside the type filter and say
// whatever they said before, so an admin can answer them without waiting
// for the business.
test("an admin can give a backfilled offer a type and an availability", async ({ browser }) => {
    const state = JSON.parse(fs.readFileSync(STATE_PATH, "utf8"));
    const client = admin();
    let offerId: string | undefined;

    await client.from("platform_admins").insert({ user_id: state.businessUserId });

    try {
        const { data: offer } = await client
            .from("offers")
            .insert({
                business_id: state.businessId,
                created_by: state.businessUserId,
                slug: `e2e-correct-${Date.now()}`,
                title: `E2E Correction Offer ${Date.now()}`,
                category: "Testing",
                // Exactly what the backfills leave behind.
                discount: "£10 credit",
                kind: "other",
                availability: "Tuesday to Thursday evenings",
                description: "An offer for the admin correction test.",
                expires_at: "2030-12-31",
                terms: "For automated tests only.",
                approval_status: "approved",
                redemption_count: 0,
            })
            .select("id")
            .single();
        offerId = offer!.id;

        const page = await (await browser.newContext({ storageState: BUSINESS_AUTH })).newPage();
        await page.goto(`/admin/offers/${offerId}`);
        await expect(page.getByRole("heading", { name: "Put it right" })).toBeVisible({ timeout: 20_000 });

        // It opens on what the offer has: no type, no days.
        await expect(page.locator("#kind")).toHaveValue("other");
        await expect(page.locator("#discount")).toHaveValue("£10 credit");

        await page.locator("#kind").selectOption("money_off");
        await page.locator("#kindValue").fill("10");

        await page.getByLabel("Certain days and times").check();
        for (const day of ["Tue", "Wed", "Thu"]) {
            await page.getByRole("button", { name: day, exact: true }).click();
        }
        await page.locator("#availableFrom").fill("17:00");

        await page.getByRole("button", { name: "Save the type and availability" }).click();
        await expect(page.getByText("Saved", { exact: true })).toBeVisible({ timeout: 15_000 });

        const { data: fixed } = await client
            .from("offers")
            .select("kind, kind_value, discount, availability, available_days, available_from, approval_status")
            .eq("id", offerId)
            .single();

        expect(fixed!.kind).toBe("money_off");
        expect(Number(fixed!.kind_value)).toBe(10);
        expect(fixed!.discount, "the headline is rebuilt from the type").toBe("£10 off");
        expect(fixed!.availability, "and the line from the days and the time").toBe("Tue–Thu, from 5pm");
        expect(fixed!.available_days).toEqual([2, 3, 4]);
        expect(fixed!.available_from).toBe("17:00:00");
        // Neither field is reviewed, and an admin is exempt anyway, so
        // the offer never leaves the site to be corrected.
        expect(fixed!.approval_status).toBe("approved");
    } finally {
        if (offerId) await client.from("offers").delete().eq("id", offerId);
        await client.from("platform_admins").delete().eq("user_id", state.businessUserId);
    }
});
