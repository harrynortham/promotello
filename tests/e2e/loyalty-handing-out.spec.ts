import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import fs from "fs";

import { BUSINESS_AUTH, CUSTOMER_AUTH, STATE_PATH } from "../global-setup";

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

// A business that has closed everything it ever handed out still has
// customers holding those cards — and the way back to them was the one
// thing the page stopped showing.
test("with nothing on offer, the closed cards are still there to hand out again", async ({ page }) => {
    test.setTimeout(120_000);
    const { businessId, customerUserId } = JSON.parse(fs.readFileSync(STATE_PATH, "utf8"));
    const client = admin();
    const name = `E2E All closed ${Date.now()}`;

    const { data: existing } = await client
        .from("loyalty_programs")
        .select("id")
        .eq("business_id", businessId)
        .eq("is_active", true)
        .is("closed_at", null);
    for (const row of existing ?? []) {
        await client.from("loyalty_programs").update({ closed_at: new Date().toISOString() }).eq("id", row.id);
    }

    const { data: program } = await client
        .from("loyalty_programs")
        .insert({
            business_id: businessId,
            name,
            stamps_required: 9,
            reward: "a free coffee",
            is_active: true,
            closed_at: new Date().toISOString(),
        })
        .select("id")
        .single();

    await client
        .from("loyalty_cards")
        .insert({ program_id: program!.id, user_id: customerUserId, stamps: 4 });

    try {
        await page.goto(`/business/${businessId}/loyalty?closed=1`);

        // The list of them, with the way into each one.
        await expect(page.getByRole("heading", { name: "Still being collected" })).toBeVisible({
            timeout: 20_000,
        });
        await expect(page.getByText(name)).toBeVisible();
        await expect(page.getByText(/You aren't handing anything out at the moment/)).toBeVisible();

        // And a card code can still be looked up: those customers are
        // still being served.
        await expect(page.getByText("Stamp a card")).toBeVisible();
        await expect(page.getByRole("button", { name: "Find card" })).toBeVisible();

        // The cards people hold are counted against the card they are
        // on, not against whatever is being handed out.
        await expect(page.getByText("4 of 9 stamps")).toBeVisible();
        await expect(page.getByText("Reward ready")).toHaveCount(0);

        // This card's row in the list of closed ones, not whichever
        // card happens to be first — and not the same name where it
        // appears again under the cards customers are carrying.
        // The row in the list of closed cards, not whichever card is
        // first, and not the same name where it appears again under the
        // cards customers are carrying. The link renders as a button.
        await page
            .locator("#collecting li")
            .filter({ hasText: name })
            .getByRole("button", { name: "Open" })
            .click({ timeout: 15_000 });
        await page.waitForURL(new RegExp(`/loyalty/${program!.id}/edit$`), { timeout: 20_000 });
        await expect(page.getByRole("button", { name: "Start handing this out again" })).toBeVisible();
    } finally {
        await client.from("loyalty_programs").delete().eq("id", program!.id);
    }
});

// Finishing lasts as long as the closure that caused it. A card put
// back on offer is a card its holders can collect on again — otherwise
// somebody who finished theirs can never collect and can never join,
// because they are already holding one.
test("handing a closed card out again revives the cards that finished on it", async ({ page }) => {
    test.setTimeout(120_000);
    const { businessId, customerUserId } = JSON.parse(fs.readFileSync(STATE_PATH, "utf8"));
    const client = admin();
    const name = `E2E Revived ${Date.now()}`;

    const { data: existing } = await client
        .from("loyalty_programs")
        .select("id")
        .eq("business_id", businessId)
        .eq("is_active", true)
        .is("closed_at", null);
    for (const row of existing ?? []) {
        await client.from("loyalty_programs").update({ closed_at: new Date().toISOString() }).eq("id", row.id);
    }

    const { data: program } = await client
        .from("loyalty_programs")
        .insert({
            business_id: businessId,
            name,
            stamps_required: 5,
            reward: "a free coffee",
            is_active: true,
            closed_at: new Date().toISOString(),
        })
        .select("id")
        .single();

    // A card that filled and paid out while the card was closed.
    const { data: card } = await client
        .from("loyalty_cards")
        .insert({
            program_id: program!.id,
            user_id: customerUserId,
            stamps: 0,
            rewards_redeemed: 1,
            finished_at: new Date().toISOString(),
        })
        .select("id")
        .single();

    try {
        await page.goto(`/business/${businessId}/loyalty/${program!.id}/edit`);
        await page.getByRole("button", { name: "Start handing this out again" }).click();
        await page.getByRole("button", { name: "Hand it out again" }).click();
        await page.waitForURL(/\/loyalty\?reopened=1/, { timeout: 20_000 });

        const { data: revived } = await client
            .from("loyalty_cards")
            .select("finished_at")
            .eq("id", card!.id)
            .single();
        expect(revived?.finished_at, "the migration needs running").toBeNull();

        // And the customer sees a card they can collect on, not a
        // finished one with nowhere to go.
        const customer = await (await page.context().browser()!.newContext({ storageState: CUSTOMER_AUTH })).newPage();
        await customer.goto(`/loyalty/${program!.id}`);
        await expect(customer.getByText("0 of 5 stamps")).toBeVisible({ timeout: 20_000 });
        await expect(customer.getByText("Finished: you claimed the reward on this one")).toHaveCount(0);
        await expect(customer.getByText("Show this to staff")).toBeVisible();
    } finally {
        await client.from("loyalty_programs").delete().eq("id", program!.id);
    }
});
