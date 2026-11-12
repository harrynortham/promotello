import { test, expect } from "@playwright/test";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import fs from "fs";

import { BUSINESS_AUTH, CUSTOMER_AUTH, STATE_PATH } from "../global-setup";

// A closed card gets one last lap: it fills, pays out once and is
// finished, and the customer is handed the card the business runs now at
// the moment the old one fills
// (supabase/migrations/20261226090000_a_closed_card_gets_one_last_lap.sql).
//
// The rules live in add_loyalty_stamp() and redeem_loyalty_reward(), so
// most of this presses them directly as a staff member would through the
// page — the same session, the same RPC, no UI in the way — and the
// screens are checked where what they show is the point.

const needsMigration =
    "apply supabase/migrations/20261226090000_a_closed_card_gets_one_last_lap.sql first";

function state() {
    return JSON.parse(fs.readFileSync(STATE_PATH, "utf8"));
}

function admin() {
    return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
        auth: { autoRefreshToken: false, persistSession: false },
    });
}

// Signed in as somebody who works at the test business, which is what
// stamping and redeeming check.
async function asStaff() {
    const { businessEmail, testPassword } = state();
    const client = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
        { auth: { autoRefreshToken: false, persistSession: false } },
    );

    const { error } = await client.auth.signInWithPassword({ email: businessEmail, password: testPassword });
    expect(error, "signed in as the business").toBeNull();

    return client;
}

type CardAction = {
    stamps: number;
    stamps_required: number;
    card_full: boolean;
    card_finished: boolean;
    issued_card_id: string | null;
    issued_is_new: boolean;
};

async function stamp(staff: SupabaseClient, code: string) {
    const { data, error } = await staff.rpc("add_loyalty_stamp", { requested_code: code });

    return { result: (Array.isArray(data) ? data[0] : data) as CardAction | null, error };
}

async function redeem(staff: SupabaseClient, code: string) {
    const { data, error } = await staff.rpc("redeem_loyalty_reward", { requested_code: code });

    return { result: (Array.isArray(data) ? data[0] : data) as CardAction | null, error };
}

// Every card in these tests is stamped more than once inside a few
// seconds, which the ten-minute double-scan guard would refuse. Clearing
// it is the test standing in for a customer coming back tomorrow.
async function comeBackTomorrow(client: SupabaseClient, code: string) {
    await client.from("loyalty_cards").update({ last_stamped_at: null }).eq("card_code", code);
}

async function closeEverything(client: SupabaseClient, businessId: string) {
    const { data: open } = await client
        .from("loyalty_programs")
        .select("id")
        .eq("business_id", businessId)
        .eq("is_active", true)
        .is("closed_at", null);

    for (const row of open ?? []) {
        await client.from("loyalty_programs").update({ closed_at: new Date().toISOString() }).eq("id", row.id);
    }
}

async function makeCard(
    client: SupabaseClient,
    businessId: string,
    { name, stampsRequired = 3, closed = false }: { name: string; stampsRequired?: number; closed?: boolean },
) {
    const { data, error } = await client
        .from("loyalty_programs")
        .insert({
            business_id: businessId,
            name,
            stamps_required: stampsRequired,
            reward: "a free coffee",
            is_active: true,
            closed_at: closed ? new Date().toISOString() : null,
        })
        .select("id, name, stamps_required")
        .single();

    expect(error).toBeNull();

    return data!;
}

async function giveTo(
    client: SupabaseClient,
    programId: string,
    holder: { userId?: string; guestEmail?: string },
    stamps = 0,
) {
    const guest = holder.guestEmail
        ? { guest_name: "Gus Guest", guest_email: holder.guestEmail, guest_token: crypto.randomUUID() }
        : {};

    const { data, error } = await client
        .from("loyalty_cards")
        .insert({ program_id: programId, user_id: holder.userId ?? null, stamps, ...guest })
        .select("id, card_code, guest_token")
        .single();

    expect(error).toBeNull();

    return data!;
}

test("an open card still restarts after its reward", async () => {
    test.setTimeout(120_000);
    const { businessId, customerUserId } = state();
    const client = admin();
    const staff = await asStaff();

    await closeEverything(client, businessId);
    const program = await makeCard(client, businessId, { name: `E2E Open lap ${Date.now()}` });
    const card = await giveTo(client, program.id, { userId: customerUserId }, 2);

    try {
        const filled = await stamp(staff, card.card_code);
        expect(filled.error, needsMigration).toBeNull();
        expect(filled.result?.card_full).toBe(true);
        expect(filled.result?.issued_card_id, "nothing is handed over on an open card").toBeNull();

        const paid = await redeem(staff, card.card_code);
        expect(paid.error).toBeNull();
        expect(paid.result?.card_finished, "an open card is never finished").toBe(false);
        expect(paid.result?.stamps).toBe(0);

        // And it takes the next stamp, as it always has.
        await comeBackTomorrow(client, card.card_code);
        const again = await stamp(staff, card.card_code);
        expect(again.error).toBeNull();
        expect(again.result?.stamps).toBe(1);
    } finally {
        await client.from("loyalty_programs").delete().eq("id", program.id);
    }
});

test("a closed card fills once, pays out once, and is then finished", async () => {
    test.setTimeout(120_000);
    const { businessId, customerUserId } = state();
    const client = admin();
    const staff = await asStaff();

    await closeEverything(client, businessId);
    const program = await makeCard(client, businessId, { name: `E2E Last lap ${Date.now()}`, closed: true });
    const card = await giveTo(client, program.id, { userId: customerUserId }, 2);

    try {
        const filled = await stamp(staff, card.card_code);
        expect(filled.error, needsMigration).toBeNull();
        expect(filled.result?.stamps).toBe(3);

        // Full is the end of it: no second round.
        await comeBackTomorrow(client, card.card_code);
        const over = await stamp(staff, card.card_code);
        expect(over.error?.code, "a full closed card takes no more stamps").toBe("P0008");

        const paid = await redeem(staff, card.card_code);
        expect(paid.error).toBeNull();
        expect(paid.result?.card_finished).toBe(true);

        const { data: row } = await client
            .from("loyalty_cards")
            .select("finished_at, rewards_redeemed")
            .eq("card_code", card.card_code)
            .single();
        expect(row?.finished_at).not.toBeNull();
        expect(row?.rewards_redeemed).toBe(1);

        // And it is done for good, both ways.
        await comeBackTomorrow(client, card.card_code);
        expect((await stamp(staff, card.card_code)).error?.code).toBe("P0007");
        expect((await redeem(staff, card.card_code)).error?.code).toBe("P0007");
    } finally {
        await client.from("loyalty_programs").delete().eq("id", program.id);
    }
});

test("filling a closed card hands over the new one, and says so once", async ({ browser }) => {
    test.setTimeout(180_000);
    const { businessId, customerUserId } = state();
    const client = admin();
    const staff = await asStaff();

    await closeEverything(client, businessId);
    const ending = await makeCard(client, businessId, { name: `E2E Ending ${Date.now()}`, closed: true });
    const next = await makeCard(client, businessId, { name: `E2E Next ${Date.now()}`, stampsRequired: 5 });
    const card = await giveTo(client, ending.id, { userId: customerUserId }, 2);

    try {
        await client
            .from("notifications")
            .delete()
            .eq("user_id", customerUserId)
            .eq("type", "loyalty_card_issued");

        // Through the page, because the telling happens there: the card
        // is handed over by the database, the notification by the app.
        const staffPage = await (await browser.newContext({ storageState: BUSINESS_AUTH })).newPage();
        await staffPage.goto(`/stamp/${card.card_code}`);
        await staffPage.getByRole("button", { name: "Add a stamp", exact: true }).click();
        await expect(staffPage.getByText(/They've been given the new card/), needsMigration).toBeVisible({
            timeout: 20_000,
        });

        const { data: given } = await client
            .from("loyalty_cards")
            .select("id, card_code, stamps")
            .eq("program_id", next.id)
            .eq("user_id", customerUserId)
            .single();
        expect(given, "the new card is theirs already").not.toBeNull();
        expect(given!.stamps).toBe(0);

        const { data: told } = await client
            .from("notifications")
            .select("title, href, dedupe_key")
            .eq("user_id", customerUserId)
            .eq("type", "loyalty_card_issued");
        expect(told, "told once").toHaveLength(1);
        expect(told![0].title).toContain("5 stamps for a free coffee");
        expect(told![0].href).toBe(`/loyalty/${next.id}`);

        // Their next stamp goes on it while the old reward is still owed.
        await comeBackTomorrow(client, given!.card_code);
        const onTheNew = await stamp(staff, given!.card_code);
        expect(onTheNew.error).toBeNull();
        expect(onTheNew.result?.stamps).toBe(1);

        const { data: old } = await client
            .from("loyalty_cards")
            .select("stamps, finished_at")
            .eq("card_code", card.card_code)
            .single();
        expect(old?.stamps, "the reward is still sitting on the old card").toBe(3);
        expect(old?.finished_at).toBeNull();

        // Redeeming it now finishes it and tells them nothing new.
        const paid = await redeem(staff, card.card_code);
        expect(paid.error).toBeNull();
        expect(paid.result?.card_finished).toBe(true);
        expect(paid.result?.issued_is_new, "they already hold the new card").toBe(false);

        const { count: still } = await client
            .from("notifications")
            .select("id", { count: "exact", head: true })
            .eq("user_id", customerUserId)
            .eq("type", "loyalty_card_issued");
        expect(still, "and still only the one").toBe(1);
    } finally {
        await client.from("loyalty_programs").delete().eq("id", ending.id);
        await client.from("loyalty_programs").delete().eq("id", next.id);
    }
});

test("somebody already holding the new card is not given a second", async () => {
    test.setTimeout(120_000);
    const { businessId, customerUserId } = state();
    const client = admin();
    const staff = await asStaff();

    await closeEverything(client, businessId);
    const ending = await makeCard(client, businessId, { name: `E2E Both ${Date.now()}`, closed: true });
    const next = await makeCard(client, businessId, { name: `E2E Both new ${Date.now()}` });
    const card = await giveTo(client, ending.id, { userId: customerUserId }, 2);
    const theirs = await giveTo(client, next.id, { userId: customerUserId }, 1);

    try {
        const filled = await stamp(staff, card.card_code);
        expect(filled.error, needsMigration).toBeNull();
        expect(filled.result?.issued_card_id).toBe(theirs.id);
        expect(filled.result?.issued_is_new).toBe(false);

        const { count } = await client
            .from("loyalty_cards")
            .select("id", { count: "exact", head: true })
            .eq("program_id", next.id)
            .eq("user_id", customerUserId);
        expect(count, "one card, not two").toBe(1);

        const { data: untouched } = await client
            .from("loyalty_cards")
            .select("stamps")
            .eq("id", theirs.id)
            .single();
        expect(untouched?.stamps, "their stamps on it are their own").toBe(1);
    } finally {
        await client.from("loyalty_programs").delete().eq("id", ending.id);
        await client.from("loyalty_programs").delete().eq("id", next.id);
    }
});

test("with nothing to move on to, the card simply finishes — until there is", async () => {
    test.setTimeout(120_000);
    const { businessId, customerUserId } = state();
    const client = admin();
    const staff = await asStaff();

    await closeEverything(client, businessId);
    const ending = await makeCard(client, businessId, { name: `E2E Nothing next ${Date.now()}`, closed: true });
    const card = await giveTo(client, ending.id, { userId: customerUserId }, 2);
    let next: { id: string } | null = null;

    try {
        const filled = await stamp(staff, card.card_code);
        expect(filled.error, needsMigration).toBeNull();
        expect(filled.result?.card_full).toBe(true);
        expect(filled.result?.issued_card_id, "there is nothing to give them").toBeNull();

        // The business starts a new card before they come back for the
        // reward, so redeeming hands it over.
        next = await makeCard(client, businessId, { name: `E2E Started later ${Date.now()}` });

        const paid = await redeem(staff, card.card_code);
        expect(paid.error).toBeNull();
        expect(paid.result?.card_finished).toBe(true);
        expect(paid.result?.issued_is_new).toBe(true);

        const { data: given } = await client
            .from("loyalty_cards")
            .select("id")
            .eq("program_id", next.id)
            .eq("user_id", customerUserId)
            .maybeSingle();
        expect(given).not.toBeNull();
    } finally {
        await client.from("loyalty_programs").delete().eq("id", ending.id);
        if (next) await client.from("loyalty_programs").delete().eq("id", next.id);
    }
});

test("an over-full closed card pays out every round it earned, then finishes", async () => {
    test.setTimeout(120_000);
    const { businessId, customerUserId } = state();
    const client = admin();
    const staff = await asStaff();

    await closeEverything(client, businessId);
    const program = await makeCard(client, businessId, { name: `E2E Over full ${Date.now()}`, closed: true });
    // Two full rounds and a stamp over: stamped past full while the card
    // was still open, before it was closed.
    const card = await giveTo(client, program.id, { userId: customerUserId }, 7);

    try {
        const first = await redeem(staff, card.card_code);
        expect(first.error, needsMigration).toBeNull();
        expect(first.result?.stamps).toBe(4);
        expect(first.result?.card_finished, "a round is still owed").toBe(false);

        const second = await redeem(staff, card.card_code);
        expect(second.error).toBeNull();
        expect(second.result?.stamps).toBe(1);
        expect(second.result?.card_finished, "the leftover stamp cannot earn another").toBe(true);

        expect((await redeem(staff, card.card_code)).error?.code).toBe("P0007");
    } finally {
        await client.from("loyalty_programs").delete().eq("id", program.id);
    }
});

test("a guest's closed card finishes the same way, and their link leads to the new one", async ({ browser }) => {
    test.setTimeout(120_000);
    const { businessId } = state();
    const client = admin();
    const staff = await asStaff();
    const email = `e2e_guest_lap_${Date.now()}@test.internal`;

    await closeEverything(client, businessId);
    const ending = await makeCard(client, businessId, { name: `E2E Guest lap ${Date.now()}`, closed: true });
    const next = await makeCard(client, businessId, { name: `E2E Guest next ${Date.now()}` });
    const card = await giveTo(client, ending.id, { guestEmail: email }, 2);

    try {
        const filled = await stamp(staff, card.card_code);
        expect(filled.error, needsMigration).toBeNull();
        expect(filled.result?.issued_is_new).toBe(true);

        const { data: given } = await client
            .from("loyalty_cards")
            .select("guest_token, guest_email, user_id")
            .eq("program_id", next.id)
            .eq("guest_email", email)
            .single();
        expect(given?.user_id, "still a guest").toBeNull();
        expect(given?.guest_token, "a link of its own").not.toBeNull();

        // Their own page says the card is full and points at the new one.
        const page = await (await browser.newContext()).newPage();

        await page.goto(`/card/${card.guest_token}`);
        await expect(page.getByText("Reward ready: ask staff to redeem it")).toBeVisible({ timeout: 20_000 });
        await page.getByRole("link", { name: /Your new card here/ }).click();
        await page.waitForURL(`**/card/${given!.guest_token}`, { timeout: 20_000 });
        await expect(page.getByText("0 of 3 stamps")).toBeVisible();

        const paid = await redeem(staff, card.card_code);
        expect(paid.error).toBeNull();
        expect(paid.result?.card_finished).toBe(true);
    } finally {
        await client.from("loyalty_programs").delete().eq("id", ending.id);
        await client.from("loyalty_programs").delete().eq("id", next.id);
    }
});

// The screens: what staff are offered on a card being seen out, and what
// the customer's own list shows once it is finished.
test("the staff page offers the reward on the old card and the stamp on the new", async ({ browser }) => {
    test.setTimeout(180_000);
    const { businessId, customerUserId } = state();
    const client = admin();
    const staff = await asStaff();

    await closeEverything(client, businessId);
    const ending = await makeCard(client, businessId, { name: `E2E Screens ${Date.now()}`, closed: true });
    const next = await makeCard(client, businessId, { name: `E2E Screens next ${Date.now()}`, stampsRequired: 4 });
    const card = await giveTo(client, ending.id, { userId: customerUserId }, 2);

    try {
        const filled = await stamp(staff, card.card_code);
        expect(filled.error, needsMigration).toBeNull();

        const staffPage = await (await browser.newContext({ storageState: BUSINESS_AUTH })).newPage();
        await staffPage.goto(`/stamp/${card.card_code}`);

        await expect(staffPage.getByText(/isn't handed out any more/)).toBeVisible({ timeout: 20_000 });
        await expect(staffPage.getByRole("button", { name: "Add a stamp", exact: true })).toHaveCount(0);
        await expect(staffPage.getByRole("button", { name: "Redeem reward" })).toBeVisible();

        // This visit is spent: the stamp that filled the old card was
        // it, so the new one is explained rather than offered.
        await expect(staffPage.getByText(/takes its first one next time/)).toBeVisible();
        await expect(staffPage.getByRole("button", { name: /Add a stamp on/ })).toHaveCount(0);

        // Next time they are in, one press, on the card they hold now.
        const { data: handed } = await client
            .from("loyalty_cards")
            .select("card_code")
            .eq("program_id", next.id)
            .eq("user_id", customerUserId)
            .single();
        await comeBackTomorrow(client, handed!.card_code);
        await staffPage.reload();

        await staffPage.getByRole("button", { name: /Add a stamp on E2E Screens next/ }).click();
        await staffPage.waitForURL(/\/stamp\/[A-Z0-9]{10}\?done=stamp/, { timeout: 20_000 });
        await expect(staffPage.getByText("1 of 4 stamps")).toBeVisible();

        // The customer's list: the old card is still a reward to claim.
        const customer = await (await browser.newContext({ storageState: CUSTOMER_AUTH })).newPage();
        await customer.goto("/dashboard/loyalty");
        await expect(customer.getByText("Reward ready: ask staff to redeem it").first()).toBeVisible({
            timeout: 20_000,
        });
        await expect(customer.getByRole("link", { name: /Your new card here/ }).first()).toBeVisible();

        // Claimed: finished, still there, under the card they are filling.
        await redeem(staff, card.card_code);
        await customer.reload();
        await expect(customer.getByText("Finished: you claimed the reward on this one")).toBeVisible({
            timeout: 20_000,
        });

        const cards = customer.locator("article");
        await expect(cards.last()).toContainText("Finished");
    } finally {
        await client.from("loyalty_programs").delete().eq("id", ending.id);
        await client.from("loyalty_programs").delete().eq("id", next.id);
    }
});
