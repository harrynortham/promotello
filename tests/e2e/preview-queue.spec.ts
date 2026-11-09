import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import { STATE_PATH, BUSINESS_AUTH } from "../global-setup";

const admin = () =>
    createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
        auth: { autoRefreshToken: false, persistSession: false },
    });

// A page we built carries our words and often a stand-in photo, so claiming
// it is not the same as agreeing to publish it. Nothing reaches the queue
// until the business has looked and sent it.
test("a page we built reaches the queue only when the business sends it", async ({ browser }) => {
    const { businessUserId } = JSON.parse(fs.readFileSync(STATE_PATH, "utf8"));
    const db = admin();
    const name = `E2E Preview Queue ${Date.now()}`;

    const { data: business } = await db
        .from("businesses")
        .insert({
            name,
            slug: `e2e-preview-queue-${Date.now()}`,
            category: "Testing",
            description: "Automated test business — safe to delete.",
            approval_status: "pending",
            created_by: businessUserId,
        })
        .select("id")
        .single();

    await db.from("platform_admins").insert({ user_id: businessUserId });

    try {
        const { error: previewError } = await db.from("business_previews").insert({
            business_id: business!.id,
            sample_offer: "Free pastry with any coffee",
            sample_reward: "a free coffee",
            sample_stamps: 9,
            created_by: businessUserId,
        });
        expect(previewError, "could not seed the preview").toBeNull();

        // Creating the preview takes back the review request the column's
        // default wrote when the business row was inserted.
        const { data: flagged } = await db
            .from("businesses")
            .select("review_requested_at")
            .eq("id", business!.id)
            .single();
        expect(
            flagged!.review_requested_at,
            "supabase/migrations/20261207170000_a_business_asks_to_be_reviewed.sql isn't applied",
        ).toBeNull();

        const page = await (await browser.newContext({ storageState: BUSINESS_AUTH })).newPage();
        await page.goto("/admin/businesses");
        await expect(page.getByRole("heading", { name: "Businesses", level: 1 })).toBeVisible({ timeout: 15_000 });
        await expect(page.getByText(name)).toHaveCount(0);

        // Claiming is "this account is mine", not "publish that": still
        // out of the queue.
        await db
            .from("business_previews")
            .update({ claimed_at: new Date().toISOString() })
            .eq("business_id", business!.id);

        await page.reload();
        await expect(page.getByText(name)).toHaveCount(0);

        // Sending it is the business asking.
        const { error: reviewError } = await db
            .from("businesses")
            .update({ review_requested_at: new Date().toISOString() })
            .eq("id", business!.id);
        expect(reviewError).toBeNull();

        await page.reload();
        await expect(page.getByText(name)).toBeVisible({ timeout: 15_000 });
        await page.close();
    } finally {
        await db.from("platform_admins").delete().eq("user_id", businessUserId);
        await db.from("businesses").delete().eq("id", business!.id);
    }
});
