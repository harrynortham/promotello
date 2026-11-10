import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import { STATE_PATH, BUSINESS_AUTH } from "../global-setup";

const admin = () =>
    createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
        auth: { autoRefreshToken: false, persistSession: false },
    });

// A closed business is never waiting on us: its owner has left. It used to
// sit in the review queue and in the count on /admin, as work to do.
test("a closed business leaves the review queue but stays findable", async ({ browser }) => {
    const { businessUserId } = JSON.parse(fs.readFileSync(STATE_PATH, "utf8"));
    const db = admin();
    const name = `E2E Closed Queue ${Date.now()}`;

    const { data: business } = await db
        .from("businesses")
        .insert({
            name,
            slug: `e2e-closed-queue-${Date.now()}`,
            category: "Testing",
            description: "Automated test business — safe to delete.",
            approval_status: "pending",
            // Nobody is in the queue until they ask: a business asks for
            // itself now, whoever wrote the page.
            review_requested_at: new Date().toISOString(),
            created_by: businessUserId,
        })
        .select("id")
        .single();

    await db.from("platform_admins").insert({ user_id: businessUserId });

    try {
        // Sent for review, so it is in the queue to start with.
        const page = await (await browser.newContext({ storageState: BUSINESS_AUTH })).newPage();
        await page.goto("/admin/businesses");
        await expect(page.getByText(name)).toBeVisible({ timeout: 15_000 });

        const { error } = await db
            .from("businesses")
            .update({ closed_at: new Date().toISOString() })
            .eq("id", business!.id);
        expect(error, "the service role may close a business").toBeNull();

        await page.reload();
        await expect(page.getByText(name)).toHaveCount(0);

        // Still there under All businesses, marked as closed.
        await page.getByRole("button", { name: "All businesses" }).click();
        await expect(page.getByText(name)).toBeVisible({ timeout: 15_000 });
        await expect(page.getByText("Closed", { exact: true }).first()).toBeVisible();

        await page.close();
    } finally {
        await db.from("platform_admins").delete().eq("user_id", businessUserId);
        await db.from("businesses").delete().eq("id", business!.id);
    }
});
