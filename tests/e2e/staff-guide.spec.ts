import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import fs from "fs";

import { BUSINESS_AUTH, CUSTOMER_AUTH, STATE_PATH } from "../global-setup";

// The page for the wall behind the till: what to do when somebody holds
// out a phone, and what the messages mean. It is printed by whoever
// works there, so a member is enough — and nobody else sees it.

function state() {
    return JSON.parse(fs.readFileSync(STATE_PATH, "utf8"));
}

const admin = () =>
    createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
        auth: { autoRefreshToken: false, persistSession: false },
    });

test("the till sheet says what to do, in the business's own terms", async ({ browser }) => {
    test.setTimeout(180_000);
    const { businessId } = state();
    const client = admin();

    const { data: open } = await client
        .from("loyalty_programs")
        .select("id")
        .eq("business_id", businessId)
        .eq("is_active", true)
        .is("closed_at", null);
    for (const row of open ?? []) {
        await client.from("loyalty_programs").update({ closed_at: new Date().toISOString() }).eq("id", row.id);
    }

    const { data: program } = await client
        .from("loyalty_programs")
        .insert({
            business_id: businessId,
            name: `E2E Till guide ${Date.now()}`,
            stamps_required: 9,
            reward: "A free coffee",
            is_active: true,
        })
        .select("id")
        .single();

    const staff = await (await browser.newContext({ storageState: BUSINESS_AUTH })).newPage();

    try {
        // The way in is from where staff already are.
        await staff.goto(`/business/${businessId}/loyalty`);
        await staff.getByRole("link", { name: "Print the till guide" }).click();
        await staff.waitForURL(new RegExp(`/staff-guide/${businessId}$`), { timeout: 60_000 });

        // Both halves of the counter.
        await expect(staff.getByRole("heading", { name: "A voucher" })).toBeVisible({ timeout: 30_000 });
        await expect(staff.getByRole("heading", { name: "A loyalty card" })).toBeVisible();

        // Their card, so whoever reads it knows what they are promising.
        await expect(staff.getByText("Ours is 9 stamps for a free coffee.")).toBeVisible();

        // The messages they will actually see, in both flows.
        await expect(staff.getByText("Already used")).toBeVisible();
        await expect(staff.getByText("Stamped in the last 10 minutes")).toBeVisible();
        await expect(staff.getByText("This card is finished")).toBeVisible();

        // It is a sheet of paper: the controls are not on it.
        await expect(staff.getByRole("button", { name: /Print or save as PDF/ })).toBeVisible();
        await staff.emulateMedia({ media: "print" });
        await expect(staff.getByRole("button", { name: /Print or save as PDF/ })).toBeHidden();
        await expect(staff.getByRole("heading", { name: "A loyalty card" })).toBeVisible();
    } finally {
        await client.from("loyalty_programs").delete().eq("id", program!.id);
    }
});

test("a customer who doesn't work there cannot open it", async ({ browser }) => {
    test.setTimeout(120_000);
    const { businessId } = state();
    const customer = await (await browser.newContext({ storageState: CUSTOMER_AUTH })).newPage();

    await customer.goto(`/staff-guide/${businessId}`);

    await expect(customer.getByRole("heading", { name: "A loyalty card" })).toHaveCount(0);
    await expect(customer.getByText(/404|not be found|Page not found/i).first()).toBeVisible({
        timeout: 30_000,
    });
});
