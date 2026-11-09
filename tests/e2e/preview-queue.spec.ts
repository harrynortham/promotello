import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import { STATE_PATH, BUSINESS_AUTH } from "../global-setup";

const admin = () =>
    createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
        auth: { autoRefreshToken: false, persistSession: false },
    });

// A preview is built before anyone has been asked, so it is pending without
// anybody waiting on us. It belongs in Previews, not in the review queue.
test("an unclaimed preview stays out of the approval queue until it is claimed", async ({ browser }) => {
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

        // The trigger marks the business as waiting to be claimed.
        const { data: flagged } = await db
            .from("businesses")
            .select("awaiting_claim")
            .eq("id", business!.id)
            .single();
        expect(
            flagged!.awaiting_claim,
            "supabase/migrations/20261207160000_unclaimed_previews_are_not_a_queue.sql isn't applied",
        ).toBe(true);

        const page = await (await browser.newContext({ storageState: BUSINESS_AUTH })).newPage();
        await page.goto("/admin/businesses");
        await expect(page.getByRole("heading", { name: "Businesses", level: 1 })).toBeVisible({ timeout: 15_000 });
        await expect(page.getByText(name)).toHaveCount(0);

        // Claiming it is the business asking to be reviewed.
        await db
            .from("business_previews")
            .update({ claimed_at: new Date().toISOString() })
            .eq("business_id", business!.id);

        const { data: claimed } = await db
            .from("businesses")
            .select("awaiting_claim")
            .eq("id", business!.id)
            .single();
        expect(claimed!.awaiting_claim).toBe(false);

        await page.reload();
        await expect(page.getByText(name)).toBeVisible({ timeout: 15_000 });
        await page.close();
    } finally {
        await db.from("platform_admins").delete().eq("user_id", businessUserId);
        await db.from("businesses").delete().eq("id", business!.id);
    }
});
