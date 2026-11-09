import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import { STATE_PATH } from "../global-setup";

// The link is read before it is clicked, in an email or a DM, so it carries
// the business's name. The token on the end is still the whole of the key.
test("a preview opens by its readable link and by the bare token", async ({ browser }) => {
    const state = JSON.parse(fs.readFileSync(STATE_PATH, "utf8"));
    const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
        auth: { persistSession: false },
    });

    const { data: business } = await admin
        .from("businesses")
        .insert({
            name: "Amsterdam Dandy",
            slug: `e2e-link-${Date.now()}`,
            category: "Testing",
            description: "A bar.",
            approval_status: "pending",
            created_by: state.businessUserId,
        })
        .select("id")
        .single();

    const { data: preview } = await admin
        .from("business_previews")
        .insert({
            business_id: business!.id,
            contact_name: "Sam",
            sample_offer: "Free pastry with any coffee",
            sample_reward: "a free coffee",
            sample_stamps: 9,
            created_by: state.businessUserId,
        })
        .select("token")
        .single();

    try {
        const page = await (await browser.newContext()).newPage();

        await page.goto(`/business/preview/amsterdam-dandy-${preview!.token}`);
        await expect(page.getByRole("heading", { name: /Amsterdam Dandy/ })).toBeVisible({ timeout: 15_000 });

        // Links sent before the name was in them.
        await page.goto(`/business/preview/${preview!.token}`);
        await expect(page.getByRole("heading", { name: /Amsterdam Dandy/ })).toBeVisible({ timeout: 15_000 });

        // A name on its own is not a key.
        await page.goto("/business/preview/amsterdam-dandy");
        await expect(page.getByRole("heading", { name: "This preview isn't available" })).toBeVisible({
            timeout: 15_000,
        });

        await page.close();
    } finally {
        await admin.from("businesses").delete().eq("id", business!.id);
    }
});
