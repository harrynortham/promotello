import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import fs from "fs";

import { BUSINESS_AUTH, STATE_PATH } from "../global-setup";
import { throwawayBusinesses } from "../throwaway";

// The offer we put in their preview email, handed back on the first
// screen after claiming.
//
// Before this, sample_offer and sample_reward were decoration: a
// business said yes to "2 for 1 on coffee, 9 stamps for a free flat
// white" and then met an empty dashboard and a seven-step checklist
// asking it to invent an offer (docs/LAUNCH-FUNNEL.md).

const admin = () =>
    createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
        auth: { autoRefreshToken: false, persistSession: false },
    });

const state = () => JSON.parse(fs.readFileSync(STATE_PATH, "utf8"));

// Registered the moment a business exists, so a seed that throws on the
// next insert cannot leave it behind (tests/throwaway.ts).
const remember = throwawayBusinesses();

const SAMPLE_OFFER = "E2E two for one on coffee";
const SAMPLE_REWARD = "E2E free flat white";

// The test business has offers already, so the offer half would be
// hidden. These two tests look at a business of their own.
async function seedClaimedPreview(businessUserId: string) {
    const client = admin();

    const { data: business, error } = await client
        .from("businesses")
        .insert({
            name: `E2E From Email ${Date.now()}`,
            slug: `e2e-from-email-${Date.now()}`,
            category: "Testing",
            description: "A business built as a preview, for the starter test.",
            approval_status: "approved",
        })
        .select("id")
        .single();

    expect(error).toBeNull();
    remember(business!.id);

    await client.from("business_members").insert({
        business_id: business!.id,
        user_id: businessUserId,
        role: "owner",
    });

    await client.from("business_previews").insert({
        business_id: business!.id,
        sample_offer: SAMPLE_OFFER,
        sample_reward: SAMPLE_REWARD,
        sample_stamps: 7,
        claimed_at: new Date().toISOString(),
        claimed_by: businessUserId,
    });

    return business!.id;
}

async function removeBusiness(businessId: string) {
    // The preview and the membership go with it.
    await admin().from("businesses").delete().eq("id", businessId);
}

test("the dashboard hands back the offer and the card from the email", async ({ browser }) => {
    test.setTimeout(300_000);
    const { businessUserId } = state();

    const businessId = await seedClaimedPreview(businessUserId);

    try {
        const page = await (await browser.newContext({ storageState: BUSINESS_AUTH })).newPage();
        await page.goto(`/business/${businessId}`, { timeout: 120_000 });

        const panel = page.getByRole("region", { name: /The offer we showed you is still here/ });
        await expect(panel).toBeVisible({ timeout: 90_000 });

        await expect(panel.getByText(SAMPLE_OFFER)).toBeVisible();
        await expect(panel.getByText(`7 stamps, then ${SAMPLE_REWARD}`)).toBeVisible();

        // Nothing is live yet, which is the thing that must be true.
        const { data: offers } = await admin().from("offers").select("id").eq("business_id", businessId);
        expect(offers ?? [], "nothing was published on their behalf").toHaveLength(0);

        // And the form opens with it in.
        // A Button rendering a Link still reports as a button.
        await panel.getByRole("button", { name: "Use this offer" }).click({ timeout: 30_000 });
        await expect(page.locator("#title")).toHaveValue(SAMPLE_OFFER, { timeout: 60_000 });

        // The type is theirs: guessing it would put a promise on their
        // page that they never made.
        await expect(page.locator("#description")).toHaveValue("");
    } finally {
        await removeBusiness(businessId);
    }
});

// The dashboard has handed the offer back since this was built. The
// welcome screen does not send anybody to the dashboard — it sends them
// down the setup checklist, and that was linking to an empty form with a
// placeholder about somebody else's coffee. The persuasion and the
// product were still disconnected for everyone who followed the path the
// product itself pushes (docs/LAUNCH-FUNNEL.md).
test("the setup checklist hands it back too, not just the dashboard", async ({ browser }) => {
    test.setTimeout(300_000);
    const { businessUserId } = state();

    const businessId = await seedClaimedPreview(businessUserId);

    try {
        const page = await (await browser.newContext({ storageState: BUSINESS_AUTH })).newPage();
        await page.goto(`/business/setup/${businessId}?step=offer`, { timeout: 120_000 });

        await expect(page.getByText(SAMPLE_OFFER)).toBeVisible({ timeout: 90_000 });

        // The generic prompt is what a business with no preview gets, and
        // saying both at once would be us not noticing what we sent them.
        await expect(page.getByText("a free side, 20% off")).toHaveCount(0);

        await page.getByRole("button", { name: "Use the offer from your email" }).click({ timeout: 30_000 });
        await expect(page.locator("#title")).toHaveValue(SAMPLE_OFFER, { timeout: 60_000 });
    } finally {
        await removeBusiness(businessId);
    }
});

// A business that was never a preview still gets the generic prompt,
// which is the right one for somebody with nothing to hand back.
test("a business with no preview still gets the plain offer step", async ({ browser }) => {
    const { businessId } = state();

    const page = await (await browser.newContext({ storageState: BUSINESS_AUTH })).newPage();
    await page.goto(`/business/setup/${businessId}?step=offer`, { timeout: 120_000 });

    await expect(page.getByText("a free side, 20% off")).toBeVisible({ timeout: 90_000 });
    await expect(page.getByRole("button", { name: "Create my first offer" })).toBeVisible();
});

test("a first loyalty card opens on the reward from the email", async ({ browser }) => {
    test.setTimeout(300_000);
    const { businessUserId } = state();

    const businessId = await seedClaimedPreview(businessUserId);

    try {
        const page = await (await browser.newContext({ storageState: BUSINESS_AUTH })).newPage();
        await page.goto(`/business/${businessId}/loyalty`, { timeout: 120_000 });

        await expect(page.getByLabel("Reward")).toHaveValue(SAMPLE_REWARD, { timeout: 90_000 });

        const { data: programs } = await admin()
            .from("loyalty_programs")
            .select("id")
            .eq("business_id", businessId);

        expect(programs ?? [], "nothing was started on their behalf").toHaveLength(0);
    } finally {
        await removeBusiness(businessId);
    }
});

// A business that signed up cold was never a preview, so there is
// nothing to hand back and no card in its way.
test("a business with no preview sees none of it", async ({ browser }) => {
    const { businessId } = state();

    const page = await (await browser.newContext({ storageState: BUSINESS_AUTH })).newPage();
    await page.goto(`/business/${businessId}`, { timeout: 120_000 });

    await expect(page.getByRole("heading", { level: 1 })).toBeVisible({ timeout: 90_000 });
    await expect(page.getByText("The offer we showed you is still here")).toHaveCount(0);
});
