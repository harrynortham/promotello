import { test, expect } from "@playwright/test";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import fs from "fs";

import { CUSTOMER_AUTH, STATE_PATH } from "../global-setup";

// A wallet with one card in it needs no sorting. This is what it does
// once somebody has a dozen: three groups, each in the order they would
// look for a card in, and a screenful at a time.

function state() {
    return JSON.parse(fs.readFileSync(STATE_PATH, "utf8"));
}

function admin() {
    return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
        auth: { autoRefreshToken: false, persistSession: false },
    });
}

type Seed = {
    stamps: number;
    required: number;
    // Only one card can be on offer at a business, so every other one
    // here is a card it is seeing out.
    open?: boolean;
    finished?: boolean;
    stampedAt?: string;
};

async function fillWallet(client: SupabaseClient, businessId: string, userId: string, seeds: Seed[]) {
    const { data: onOffer } = await client
        .from("loyalty_programs")
        .select("id")
        .eq("business_id", businessId)
        .eq("is_active", true)
        .is("closed_at", null);
    for (const row of onOffer ?? []) {
        await client.from("loyalty_programs").update({ closed_at: new Date().toISOString() }).eq("id", row.id);
    }

    const made: string[] = [];

    for (const [index, seed] of seeds.entries()) {
        const { data: program, error } = await client
            .from("loyalty_programs")
            .insert({
                business_id: businessId,
                name: `E2E Wallet ${index} ${Date.now()}`,
                stamps_required: seed.required,
                reward: "a free coffee",
                is_active: true,
                closed_at: seed.open ? null : new Date().toISOString(),
            })
            .select("id")
            .single();
        expect(error).toBeNull();
        made.push(program!.id);

        await client.from("loyalty_cards").insert({
            program_id: program!.id,
            user_id: userId,
            stamps: seed.stamps,
            last_stamped_at: seed.stampedAt ?? null,
            finished_at: seed.finished ? "2026-10-01T10:00:00Z" : null,
            rewards_redeemed: seed.finished ? 1 : 0,
        });
    }

    return made;
}

test("the wallet is one list: rewards first, then closest, then done with", async ({ browser }) => {
    test.setTimeout(240_000);
    const { businessId, customerUserId } = state();
    const client = admin();

    const made = await fillWallet(client, businessId, customerUserId, [
        { stamps: 8, required: 8, stampedAt: "2026-11-10T10:00:00Z" },
        { stamps: 4, required: 4, open: true, stampedAt: "2026-11-12T10:00:00Z" },
        { stamps: 7, required: 8, stampedAt: "2026-11-11T10:00:00Z" },
        { stamps: 2, required: 10 },
        { stamps: 0, required: 5, finished: true },
    ]);

    const customer = await (await browser.newContext({ storageState: CUSTOMER_AUTH })).newPage();

    try {
        await customer.goto("/dashboard/loyalty");
        await expect(customer.getByText("4 of 4 stamps")).toBeVisible({ timeout: 60_000 });

        // Full cards first, the one they were last stamped on at the
        // top of them; then the card closest to a reward; and the one
        // they can no longer collect on at the end.
        expect(await customer.locator("article:visible").getByText(/ of \d+ stamps/).allInnerTexts()).toEqual([
            "4 of 4 stamps",
            "8 of 8 stamps",
            "7 of 8 stamps",
            "2 of 10 stamps",
            "0 of 5 stamps · 1 redeemed",
        ]);

        // Nothing is sectioned off: one list, one heading.
        await expect(customer.getByRole("heading", { level: 2 })).toHaveCount(0);

        // The filter is how somebody with a lot of them narrows it.
        await customer.getByRole("button", { name: /Filter/ }).click();
        await customer.getByRole("link", { name: /Ready to claim/ }).click();
        await customer.waitForURL(/\/dashboard\/loyalty\/ready$/, { timeout: 60_000 });

        await expect(customer.getByRole("heading", { name: /Ready to claim \(2\)/ })).toBeVisible({
            timeout: 60_000,
        });
        expect(await customer.locator("article:visible").getByText(/ of \d+ stamps/).allInnerTexts()).toEqual([
            "4 of 4 stamps",
            "8 of 8 stamps",
        ]);
    } finally {
        for (const id of made) await client.from("loyalty_programs").delete().eq("id", id);
    }
});

test("a long wallet comes a screenful at a time", async ({ browser }) => {
    test.setTimeout(240_000);
    const { businessId, customerUserId } = state();
    const client = admin();

    // Ten cards: more than one screenful of them.
    const made = await fillWallet(
        client,
        businessId,
        customerUserId,
        Array.from({ length: 10 }, (_, index) => ({ stamps: index, required: 12 })),
    );

    const customer = await (await browser.newContext({ storageState: CUSTOMER_AUTH })).newPage();

    try {
        await customer.goto("/dashboard/loyalty");
        await expect(customer.getByText("Showing 8 of 10 cards")).toBeVisible({ timeout: 60_000 });
        await expect(customer.locator("article:visible")).toHaveCount(8);

        // Fullest first, so the card worth getting out is on top.
        const first = await customer.locator("article:visible").getByText(/ of 12 stamps/).first().innerText();
        expect(first).toBe("9 of 12 stamps");

        await customer.getByRole("link", { name: /Show more cards/ }).click();
        await expect(customer.getByText("Showing 10 of 10 cards")).toBeVisible({ timeout: 30_000 });
        await expect(customer.locator("article:visible")).toHaveCount(10);
        await expect(customer.getByRole("link", { name: /Show more cards/ })).toHaveCount(0);
    } finally {
        for (const id of made) await client.from("loyalty_programs").delete().eq("id", id);
    }
});
