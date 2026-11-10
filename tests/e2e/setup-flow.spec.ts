import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import fs from "fs";

import { BUSINESS_AUTH, STATE_PATH } from "../global-setup";

const admin = () =>
    createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
        auth: { persistSession: false },
    });

// Finishing a page is a journey, not a list: one thing at a time, beside a
// picture of the page it is becoming.
test("a business finishes its page in the flow, and sends it from there", async ({ browser }) => {
    test.setTimeout(120_000);

    const state = JSON.parse(fs.readFileSync(STATE_PATH, "utf8"));
    const name = `E2E Setup Flow ${Date.now()}`;
    let businessId: string | undefined;

    try {
        // A page we built and somebody claimed: pending, and nobody has
        // asked us to look at it. (A business that signs itself up asks on
        // the way in, by the column's default — see the migration.)
        const { data: business, error } = await admin()
            .from("businesses")
            .insert({
                name,
                category: "Testing",
                approval_status: "pending",
                created_by: state.businessUserId,
            })
            .select("id")
            .single();
        expect(error, "could not seed the business").toBeNull();
        businessId = business!.id;

        const { error: previewError } = await admin().from("business_previews").insert({
            business_id: businessId,
            contact_name: "Sam",
            sample_offer: "Free side with any main",
            sample_reward: "a free main",
            sample_stamps: 9,
            claimed_at: new Date().toISOString(),
            created_by: state.businessUserId,
        });
        expect(previewError, "could not seed the preview").toBeNull();

        await admin().from("business_members").insert({
            business_id: businessId,
            user_id: state.businessUserId,
            role: "owner",
        });

        const page = await (await browser.newContext({ storageState: BUSINESS_AUTH })).newPage();
        await page.goto(`/business/setup/${businessId}?welcome=1`);

        // It opens on the first thing that is missing, and shows the page
        // being built beside it.
        await expect(page.getByRole("heading", { name: /Let's finish your page/ })).toBeVisible({ timeout: 15_000 });
        await expect(page.getByRole("heading", { name: "Add your logo", level: 2 })).toBeVisible();
        await expect(page.getByText("0 of 7 done")).toBeVisible();
        await expect(page.getByText("Your page so far")).toBeVisible();
        await expect(page.getByText(name).first()).toBeVisible();

        // A picture can wait; the words can't.
        await page.getByRole("button", { name: "I'll add it later" }).click();

        await expect(page.getByRole("heading", { name: "Say what you're known for", level: 2 })).toBeVisible();
        await page.locator("#setup-description").fill("A corner bakery, open since Tuesday.");
        // The page beside them fills in as they type.
        await expect(page.getByText("A corner bakery, open since Tuesday.")).toBeVisible();
        await page.getByRole("button", { name: "Save and continue" }).click();

        await expect(page.getByRole("heading", { name: "Where to find you", level: 2 })).toBeVisible();
        await expect(page.getByText("1 of 7 done")).toBeVisible();
        await page.locator("#setup-address-1").fill("12 Cotham Hill");
        await page.locator("#region").selectOption("Cotham");
        await page.locator("#postalCode").fill("BS6 6DF");
        await page.getByRole("button", { name: "Save and continue" }).click();

        // Hours: open every day, the quickest honest answer.
        await expect(page.getByRole("heading", { name: "When you're open", level: 2 })).toBeVisible();
        for (const day of ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]) {
            await page.getByRole("group", { name: `${day} open or closed` }).getByRole("button", { name: "Open" }).click();
        }
        await page.getByRole("button", { name: "Save and continue" }).click();

        await expect(page.getByRole("heading", { name: "The photo across the top", level: 2 })).toBeVisible();
        await page.getByRole("button", { name: "I'll add one later" }).click();

        // Sending it is a step in the flow, not a trip to the dashboard —
        // and it names what is missing rather than refusing silently.
        await expect(page.getByRole("heading", { name: "Send your page to us", level: 2 })).toBeVisible();
        await expect(page.getByText("2 things first")).toBeVisible();
        await expect(page.getByRole("button", { name: `Send ${name} for review` })).toHaveCount(0);

        // Finish the two pictures the quick way, then send it.
        const { data: pictures } = await admin()
            .from("businesses")
            .select("logo_url, cover_image_url")
            .not("cover_image_url", "is", null)
            .limit(1)
            .single();

        await admin()
            .from("businesses")
            .update({ logo_url: pictures!.logo_url, cover_image_url: pictures!.cover_image_url })
            .eq("id", businessId);

        await page.goto(`/business/setup/${businessId}?step=review`);
        await expect(page.getByText("5 of 7 done")).toBeVisible({ timeout: 15_000 });

        await page.getByRole("button", { name: `Send ${name} for review` }).click();

        // It lands on the next thing: the offer that gives people a reason
        // to come in.
        await page.waitForURL(`**/business/setup/${businessId}?step=offer&sent=1`, { timeout: 20_000 });
        await expect(page.getByRole("heading", { name: "Give people a reason to come in", level: 2 })).toBeVisible();
        await expect(page.getByText("6 of 7 done")).toBeVisible();

        const { data: sent } = await admin()
            .from("businesses")
            .select("review_requested_at")
            .eq("id", businessId)
            .single();
        expect(sent!.review_requested_at, "the page was sent for review").not.toBeNull();

        await page.close();
    } finally {
        if (businessId) await admin().from("businesses").delete().eq("id", businessId);
    }
});
