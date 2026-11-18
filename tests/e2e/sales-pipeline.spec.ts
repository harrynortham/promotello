import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { BUSINESS_AUTH, CUSTOMER_AUTH } from "../global-setup";

// A lead is a business that has not asked to be on Promotello. It has
// their trading name, sometimes an address we found on their own site,
// and a note about whether we may write to them. None of that is theirs
// to read, and none of it is any customer's.
//
// This is the line the whole sales dashboard rests on, so it is tested
// the same way approval-only-gates-the-public does it: against the
// database, not against a page that could be changed.

const admin = () =>
    createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
        auth: { autoRefreshToken: false, persistSession: false },
    });

const asVisitor = () =>
    createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
        auth: { autoRefreshToken: false, persistSession: false },
    });

test("leads are ours: nobody else can read, write or reach them", async ({ browser }) => {
    const client = admin();
    const stamp = Date.now();

    const { data: lead, error } = await client
        .from("leads")
        .insert({ name: `E2E Lead ${stamp}`, place_id: `e2e-${stamp}` })
        .select("id")
        .single();

    expect(error, "seeding a lead").toBeNull();

    try {
        // Signed out.
        const anon = asVisitor();
        const { data: anonRows } = await anon.from("leads").select("id");
        expect(anonRows ?? []).toHaveLength(0);

        const anonWrite = await anon.from("leads").insert({ name: "Not mine", place_id: `e2e-bad-${stamp}` });
        expect(anonWrite.error, "an anonymous insert must be refused").not.toBeNull();

        // Signed in as a business owner, and as a customer: both are
        // authenticated, and neither is a platform admin.
        for (const storageState of [BUSINESS_AUTH, CUSTOMER_AUTH]) {
            const page = await (await browser.newContext({ storageState })).newPage();

            await page.goto("/admin/sales");
            // Bounced away from the dashboard entirely.
            await expect(page).not.toHaveURL(/\/admin\/sales/, { timeout: 20_000 });

            await page.goto(`/admin/sales/${lead!.id}`);
            await expect(page).not.toHaveURL(new RegExp(lead!.id), { timeout: 20_000 });
        }

        // And the events, which carry the same names.
        const { data: anonEvents } = await anon.from("lead_events").select("id");
        expect(anonEvents ?? []).toHaveLength(0);
    } finally {
        await client.from("leads").delete().eq("id", lead!.id);
    }
});

// The gate is in the database rather than only in the action, so no form,
// script or future job can set it on its own.
test("a lead cannot be marked emailable without a company number", async () => {
    const client = admin();
    const stamp = Date.now();

    const refused = await client
        .from("leads")
        .insert({ name: `E2E Gate ${stamp}`, place_id: `e2e-gate-${stamp}`, can_email: true });

    expect(refused.error, "emailable with no company number must be refused").not.toBeNull();
    expect(refused.error!.message).toMatch(/PECR|company number/i);

    const { data: lead } = await client
        .from("leads")
        .insert({ name: `E2E Gate ok ${stamp}`, place_id: `e2e-gate-ok-${stamp}` })
        .select("id, can_email")
        .single();

    try {
        expect(lead!.can_email, "a new lead is never emailable by default").toBe(false);

        const allowed = await client
            .from("leads")
            .update({ can_email: true, company_number: "12345678" })
            .eq("id", lead!.id);

        expect(allowed.error, "a company number is what unlocks it").toBeNull();
    } finally {
        await client.from("leads").delete().eq("id", lead!.id);
    }
});

