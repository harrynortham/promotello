import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import fs from "fs";

import { BUSINESS_AUTH, STATE_PATH } from "../global-setup";

// next/image refuses any host that isn't in next.config.ts, and it refuses it
// by throwing while the page renders — so one logo saved from somewhere else
// used to take a whole page down with the error boundary. A picture is allowed
// to be missing; a page is not.
const ELSEWHERE = "https://example.com/not-our-storage.png";

const BROKEN = "We couldn’t finish loading this page.";

test("an image URL from another host leaves the page standing", async ({ browser }) => {
    const state = JSON.parse(fs.readFileSync(STATE_PATH, "utf8"));

    const db = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { persistSession: false } },
    );

    const { data: business } = await db
        .from("businesses")
        .select("logo_url, cover_image_url")
        .eq("id", state.businessId)
        .single();

    const { data: offer } = await db
        .from("offers")
        .select("id, image_url")
        .eq("slug", state.claimOfferSlug)
        .single();

    await db
        .from("businesses")
        .update({ logo_url: ELSEWHERE, cover_image_url: ELSEWHERE })
        .eq("id", state.businessId);

    await db.from("offers").update({ image_url: ELSEWHERE }).eq("id", offer!.id);

    const context = await browser.newContext({ storageState: BUSINESS_AUTH });
    const page = await context.newPage();

    try {
        // The owner's dashboard, where the logo is drawn beside the name.
        await page.goto(`/business/${state.businessId}`);
        await expect(page.getByRole("heading", { name: "E2E Test Business", level: 1 })).toBeVisible({
            timeout: 15_000,
        });

        // The public page: cover, logo, and the offer card under them.
        await page.goto(`/businesses/${state.businessSlug}`);
        await expect(page.getByRole("heading", { name: "E2E Test Business", level: 1 })).toBeVisible();
        await expect(page.getByText(BROKEN)).toHaveCount(0);

        // The offer's own page, then the listings that draw offer and
        // business cards. Those three are cached for minutes, so they may
        // serve a page built before this edit — a pass there is weaker
        // than the two above, which read the database on every request.
        await page.goto(`/offers/${state.claimOfferSlug}`);
        await expect(page.getByText(BROKEN)).toHaveCount(0);

        for (const path of ["/offers", "/businesses", "/explore"]) {
            await page.goto(path);
            await expect(page.getByText(BROKEN)).toHaveCount(0);
        }
    } finally {
        await db.from("businesses").update(business!).eq("id", state.businessId);
        await db.from("offers").update({ image_url: offer!.image_url }).eq("id", offer!.id);
        await context.close();
    }
});
