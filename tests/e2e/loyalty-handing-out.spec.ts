import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import fs from "fs";

import { BUSINESS_AUTH, STATE_PATH } from "../global-setup";

const admin = () =>
    createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
        auth: { autoRefreshToken: false, persistSession: false },
    });

// Whether a card is on offer is the one control on the edit page that
// changes what customers can do. Both directions ask first, and the way
// back is only open while nothing has taken the card's place.
test.use({ storageState: BUSINESS_AUTH });

test("stopping and starting again, with the confirmations", async ({ page }) => {
    test.setTimeout(120_000);
    const { businessId } = JSON.parse(fs.readFileSync(STATE_PATH, "utf8"));
    const client = admin();
    const name = `E2E Handing Out ${Date.now()}`;

    // Clear the decks: this business may already have a card on offer.
    const { data: existing } = await client
        .from("loyalty_programs")
        .select("id, closed_at")
        .eq("business_id", businessId)
        .eq("is_active", true)
        .is("closed_at", null);
    for (const row of existing ?? []) {
        await client.from("loyalty_programs").update({ closed_at: new Date().toISOString() }).eq("id", row.id);
    }

    const { data: program, error } = await client
        .from("loyalty_programs")
        .insert({ business_id: businessId, name, stamps_required: 7, reward: "A free coffee", is_active: true })
        .select("id")
        .single();
    expect(error).toBeNull();

    const edit = `/business/${businessId}/loyalty/${program!.id}/edit`;

    try {
        await page.goto(edit);

        // Stopping asks first, and cancelling changes nothing.
        await page.getByRole("button", { name: "Stop handing this out" }).click();
        await expect(page.getByRole("dialog")).toContainText(`Stop handing out ${name}?`);
        await page.getByRole("button", { name: "Keep handing it out" }).click();
        await expect(page.getByRole("dialog")).toBeHidden();

        const { data: untouched } = await client.from("loyalty_programs").select("closed_at").eq("id", program!.id).single();
        expect(untouched!.closed_at, "cancelling left it open").toBeNull();

        // Confirming closes it and says so.
        await page.getByRole("button", { name: "Stop handing this out" }).click();
        await page.getByRole("button", { name: "Stop handing it out" }).click();
        await page.waitForURL(`**/business/${businessId}/loyalty?closed=1`, { timeout: 20_000 });
        await expect(page.getByText("That card is no longer handed out")).toBeVisible();

        const { data: closed } = await client.from("loyalty_programs").select("closed_at").eq("id", program!.id).single();
        expect(closed!.closed_at).not.toBeNull();

        // And back again.
        await page.goto(edit);
        await page.getByRole("button", { name: "Start handing this out again" }).click();
        await expect(page.getByRole("dialog")).toContainText(`Hand out ${name} again?`);
        await page.getByRole("button", { name: "Hand it out again" }).click();
        await page.waitForURL(`**/business/${businessId}/loyalty?reopened=1`, { timeout: 20_000 });
        await expect(page.getByText("That card is on offer again")).toBeVisible();

        const { data: reopened } = await client.from("loyalty_programs").select("closed_at").eq("id", program!.id).single();
        expect(reopened!.closed_at).toBeNull();

        // With another card on offer, reopening is refused in words.
        await client.from("loyalty_programs").update({ closed_at: new Date().toISOString() }).eq("id", program!.id);
        const { data: other } = await client
            .from("loyalty_programs")
            .insert({ business_id: businessId, name: `${name} two`, stamps_required: 5, reward: "A free tea", is_active: true })
            .select("id")
            .single();

        await page.goto(edit);
        await page.getByRole("button", { name: "Start handing this out again" }).click();
        await expect(page.getByRole("dialog")).toContainText(`${name} two is the card on offer`);
        await expect(page.getByRole("button", { name: "Hand it out again" })).toHaveCount(0);

        await client.from("loyalty_programs").delete().eq("id", other!.id);
    } finally {
        await client.from("loyalty_programs").delete().eq("id", program!.id);
    }
});
