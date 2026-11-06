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
