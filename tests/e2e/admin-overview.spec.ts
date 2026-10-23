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
