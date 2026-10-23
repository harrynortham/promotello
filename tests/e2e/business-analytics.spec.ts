import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import { STATE_PATH, BUSINESS_AUTH } from "../global-setup";

test.use({ storageState: BUSINESS_AUTH });

test("views of the business page show up in its analytics", async ({ page, browser }) => {
    const state = JSON.parse(fs.readFileSync(STATE_PATH, "utf8"));

    // A signed-out visitor opens the business page (the browser records the view).
    const visitor = await (await browser.newContext()).newPage();
    const recorded = visitor.waitForResponse((response) => response.url().includes("/rpc/record_page_view"));
    await visitor.goto(`/businesses/${state.businessId}`);
    expect((await recorded).ok()).toBe(true);

    // Only members can read the summary.
    const anon = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
        auth: { autoRefreshToken: false, persistSession: false },
    });
    const { error } = await anon.rpc("business_analytics", { requested_business_id: state.businessId });
    expect(error).not.toBeNull();

    await page.goto(`/business/${state.businessId}/analytics`);
    await expect(page.getByText("What Promotello brought you")).toBeVisible();
    const viewsTile = page.getByRole("group", { name: "Page views" });
    await expect(viewsTile.locator("p").nth(0)).not.toHaveText("0");
});
