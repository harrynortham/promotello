import { test, expect } from "@playwright/test";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import fs from "fs";

import { BUSINESS_AUTH, STATE_PATH } from "../global-setup";

// The number no loyalty app can print: whose first visit it was, how
// many of them found the business on Promotello before they walked in,
// and how many came back
// (20261229090000_the_number_nobody_else_can_print.sql).

const needsMigration =
    "apply supabase/migrations/20261229090000_the_number_nobody_else_can_print.sql first";

function state() {
    return JSON.parse(fs.readFileSync(STATE_PATH, "utf8"));
}

const admin = () =>
    createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
        auth: { autoRefreshToken: false, persistSession: false },
    });

async function asBusiness() {
    const { businessEmail, testPassword } = state();
    const client = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
        { auth: { autoRefreshToken: false, persistSession: false } },
    );

    const { error } = await client.auth.signInWithPassword({ email: businessEmail, password: testPassword });
    expect(error).toBeNull();

    return client;
}

const ago = (days: number) => new Date(Date.now() - days * 86_400_000).toISOString();

type Report = {
    new_customers: number;
    returned: number;
    regulars: number;
    sent_by_promotello: number;
    sent_returned: number;
    sent_regulars: number;
    customers: number;
    visits: number;
    by_month: { month: string; new_customers: number }[];
};

// Four people, each one a case: somebody we sent who became a regular,
// somebody we sent who came once, a guest who joined at the counter,
// and somebody who was already a customer before the window.
async function seedVisits(client: SupabaseClient, businessId: string, run: string) {
    const made: { programs: string[]; users: string[]; offers: string[] } = {
        programs: [],
        users: [],
        offers: [],
    };

    const { data: offer } = await client
        .from("offers")
        .insert({
            business_id: businessId,
            created_by: state().businessUserId,
            slug: `e2e-first-visits-${run}`,
            title: "E2E First Visits Offer",
            category: "Testing",
            discount: "10% off",
            description: "A test offer.",
            availability: "Any time",
            expires_at: "2030-12-31",
            terms: "For automated tests only.",
            approval_status: "approved",
        })
        .select("id")
        .single();
    made.offers.push(offer!.id);

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
            name: `E2E First visits ${run}`,
            stamps_required: 5,
            reward: "a free coffee",
            is_active: true,
        })
        .select("id")
        .single();
    made.programs.push(program!.id);

    const person = async (label: string) => {
        const { data } = await client.auth.admin.createUser({
            email: `e2e_visit_${label}_${run}@test.internal`,
            email_confirm: true,
        });
        made.users.push(data.user!.id);
        return data.user!.id;
    };

    // 1. Claimed the offer a fortnight ago, came in the next day, and
    //    has been back twice since: sent by us, and a regular.
    const regular = await person("regular");
    const { data: claim } = await client
        .from("offer_redemptions")
        .insert({ offer_id: offer!.id, user_id: regular, redeemed_at: ago(14), used_at: ago(13) })
        .select("id")
        .single();
    expect(claim).not.toBeNull();

    const { data: regularCard } = await client
        .from("loyalty_cards")
        .insert({ program_id: program!.id, user_id: regular, stamps: 2, created_at: ago(14) })
        .select("id")
        .single();
    await client.from("loyalty_events").insert([
        { card_id: regularCard!.id, kind: "stamp", created_at: ago(10) },
        { card_id: regularCard!.id, kind: "stamp", created_at: ago(4) },
    ]);

    // 2. Joined the card online a week ago and came in once: sent by
    //    us, hasn't been back.
    const once = await person("once");
    const { data: onceCard } = await client
        .from("loyalty_cards")
        .insert({ program_id: program!.id, user_id: once, stamps: 1, created_at: ago(7) })
        .select("id")
        .single();
    await client.from("loyalty_events").insert({ card_id: onceCard!.id, kind: "stamp", created_at: ago(6) });

    // 3. A guest who joined at the counter and was stamped a minute
    //    later: a first visit, but not one we sent.
    const counterJoin = new Date(Date.now() - 3 * 86_400_000);
    const { data: guestCard } = await client
        .from("loyalty_cards")
        .insert({
            program_id: program!.id,
            guest_name: "Gus",
            guest_email: `e2e_guest_${run}@test.internal`,
            guest_token: crypto.randomUUID(),
            stamps: 1,
            created_at: counterJoin.toISOString(),
        })
        .select("id")
        .single();
    await client.from("loyalty_events").insert({
        card_id: guestCard!.id,
        kind: "stamp",
        created_at: new Date(counterJoin.getTime() + 60_000).toISOString(),
    });

    return made;
}

test("the report counts first visits, who sent them, and who came back", async () => {
    test.setTimeout(180_000);
    const { businessId } = state();
    const client = admin();
    const run = String(Date.now());
    const made = await seedVisits(client, businessId, run);
    const business = await asBusiness();

    try {
        const { data, error } = await business.rpc("business_repeat_visits", {
            requested_business_id: businessId,
            months: 3,
        });
        expect(error, needsMigration).toBeNull();

        const report = data as Report;

        expect(report.new_customers, "three people came in for the first time").toBe(3);
        expect(report.sent_by_promotello, "the guest joined at the counter, so two of them").toBe(2);
        expect(report.returned, "one of the three has been back").toBe(1);
        expect(report.regulars, "and has been in three times").toBe(1);

        // The sentence counts coming back among the people we sent, so
        // those numbers are about those people and nobody else.
        expect(report.sent_returned, needsMigration).toBe(1);
        expect(report.sent_regulars).toBe(1);
        expect(report.visits).toBe(5);
        expect(report.customers).toBe(3);
        expect(report.by_month.length).toBeGreaterThan(0);
    } finally {
        for (const id of made.programs) await client.from("loyalty_programs").delete().eq("id", id);
        for (const id of made.offers) await client.from("offers").delete().eq("id", id);
        for (const id of made.users) await client.auth.admin.deleteUser(id);
    }
});

test("only the people who work there can ask", async () => {
    const { businessId } = state();
    const anon = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
        { auth: { autoRefreshToken: false, persistSession: false } },
    );

    const { error } = await anon.rpc("business_repeat_visits", { requested_business_id: businessId });

    expect(error, "a stranger gets nothing").not.toBeNull();
});

test("the panel says the sentence on Growth, and sells it on Pro", async ({ browser }) => {
    test.setTimeout(240_000);
    const { businessId } = state();
    const client = admin();
    const run = String(Date.now());
    const made = await seedVisits(client, businessId, run);

    const staff = await (await browser.newContext({ storageState: BUSINESS_AUTH })).newPage();

    try {
        // The test business is on Pro, which is the locked half.
        await staff.goto(`/business/${businessId}/analytics`);
        await expect(staff.getByText("First-timers, and who came back")).toBeVisible({
            timeout: 60_000,
        });
        await expect(staff.getByRole("link", { name: /See it on Growth/ })).toBeVisible();

        // On Growth it says the number.
        await client.from("subscriptions").update({ tier: "growth" }).eq("business_id", businessId);
        await staff.reload();

        await expect(staff.getByText(/Promotello sent you 2 first-time customers/)).toBeVisible({
            timeout: 60_000,
        });
        await expect(staff.getByText("Sent by Promotello", { exact: true })).toBeVisible();
        await expect(staff.getByText(/joining at the counter is already in the shop/)).toBeVisible();
    } finally {
        await client.from("subscriptions").update({ tier: null }).eq("business_id", businessId);
        for (const id of made.programs) await client.from("loyalty_programs").delete().eq("id", id);
        for (const id of made.offers) await client.from("offers").delete().eq("id", id);
        for (const id of made.users) await client.auth.admin.deleteUser(id);
    }
});
