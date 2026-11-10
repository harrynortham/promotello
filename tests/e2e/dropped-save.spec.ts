import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import fs from "fs";

import { BUSINESS_AUTH, STATE_PATH } from "../global-setup";

const admin = () =>
    createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
        auth: { persistSession: false },
    });

// A save in the setup flow that never reaches Supabase. supabase-js retries
// a read and not a write, so this used to end the step with
// "TypeError: Failed to fetch" and seven days of opening hours to type out
// again.
async function seedBusiness(name: string) {
    const state = JSON.parse(fs.readFileSync(STATE_PATH, "utf8"));

    const { data: business, error } = await admin()
        .from("businesses")
        .insert({ name, category: "Testing", approval_status: "pending", created_by: state.businessUserId })
        .select("id")
        .single();
    expect(error, "could not seed the business").toBeNull();

    await admin().from("business_members").insert({
        business_id: business!.id,
        user_id: state.businessUserId,
        role: "owner",
    });

    // A page we built already has hours on it, so saving them is an update
    // of seven rows rather than an insert of seven.
    await admin().from("business_hours").insert(
        [1, 2, 3, 4, 5, 6, 0].map((day) => ({
            business_id: business!.id,
            day_of_week: day,
            is_closed: false,
            opens_at: "09:00:00",
            closes_at: "17:00:00",
        })),
    );

    return business!.id as string;
}

test("a save that gets dropped on the way is sent again", async ({ browser }) => {
    test.setTimeout(120_000);

    const name = `E2E Dropped Save ${Date.now()}`;
    let businessId: string | undefined;

    try {
        businessId = await seedBusiness(name);

        const page = await (await browser.newContext({ storageState: BUSINESS_AUTH })).newPage();

        let writes = 0;
        await page.route("**/rest/v1/business_hours*", async (route) => {
            if (route.request().method() !== "POST") return route.continue();

            writes += 1;
            // The first one never arrives.
            return writes === 1 ? route.abort("failed") : route.continue();
        });

        await page.goto(`/business/setup/${businessId}?step=hours`);
        await expect(page.getByRole("heading", { name: "When you're open", level: 2 })).toBeVisible({ timeout: 15_000 });

        await page.getByRole("button", { name: "Save and continue" }).click();

        // It lands, and they never hear about it: the next step opens.
        await expect(page.getByRole("heading", { name: "The photo across the top", level: 2 })).toBeVisible({
            timeout: 20_000,
        });
        expect(writes, "the dropped save was sent again").toBeGreaterThan(1);
        await expect(page.getByText("Unable to save your hours")).toHaveCount(0);

        const { data: rows } = await admin()
            .from("business_hours")
            .select("day_of_week")
            .eq("business_id", businessId);
        expect(rows, "the hours are saved").toHaveLength(7);

        await page.close();
    } finally {
        if (businessId) await admin().from("businesses").delete().eq("id", businessId);
    }
});

test("a connection that stays down says so in words, and keeps their answers", async ({ browser }) => {
    test.setTimeout(120_000);

    const name = `E2E Connection Down ${Date.now()}`;
    let businessId: string | undefined;

    try {
        businessId = await seedBusiness(name);

        const page = await (await browser.newContext({ storageState: BUSINESS_AUTH })).newPage();

        await page.route("**/rest/v1/business_hours*", async (route) =>
            route.request().method() === "POST" ? route.abort("failed") : route.continue(),
        );

        await page.goto(`/business/setup/${businessId}?step=hours`);
        await expect(page.getByRole("heading", { name: "When you're open", level: 2 })).toBeVisible({ timeout: 15_000 });

        // Something of theirs to lose.
        const monday = page.getByRole("group", { name: "Monday open or closed" });
        await monday.getByRole("button", { name: "Closed" }).click();

        await page.getByRole("button", { name: "Save and continue" }).click();

        await expect(page.getByText(/check your connection and try again/)).toBeVisible({ timeout: 30_000 });
        // Not the raw one it used to show.
        await expect(page.getByText("Failed to fetch")).toHaveCount(0);

        // Still on the step, with Monday still closed: pressing the button
        // again is all it takes.
        await expect(page.getByRole("heading", { name: "When you're open", level: 2 })).toBeVisible();
        await expect(monday.getByRole("button", { name: "Closed" })).toHaveAttribute("aria-pressed", "true");

        await page.close();
    } finally {
        if (businessId) await admin().from("businesses").delete().eq("id", businessId);
    }
});
