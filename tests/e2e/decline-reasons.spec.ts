import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import fs from "fs";

import { BUSINESS_AUTH, STATE_PATH } from "../global-setup";

// A decline says why, in all three places it is read.
//
// Before this, turning an offer down was one button: the business got a
// red chip, an email listing what the reason might have been, and a
// notification promising an email that explained nothing. These check
// that the reason is asked for once and then turns up everywhere.

const admin = () =>
    createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
        auth: { autoRefreshToken: false, persistSession: false },
    });

const state = () => JSON.parse(fs.readFileSync(STATE_PATH, "utf8"));

async function seedPendingOffer(businessId: string, businessUserId: string) {
    const { data, error } = await admin()
        .from("offers")
        .insert({
            business_id: businessId,
            created_by: businessUserId,
            slug: `e2e-decline-${Date.now()}`,
            title: `E2E Decline ${Date.now()}`,
            category: "Testing",
            discount: "10% off",
            description: "A test offer, waiting to be reviewed.",
            availability: "Any time",
            expires_at: "2030-12-31",
            terms: "For automated tests only.",
            approval_status: "pending",
        })
        .select("id, title")
        .single();

    expect(error).toBeNull();
    return data!;
}

test("an offer cannot be declined without a reason, and the reason reaches the business", async ({ browser }) => {
    test.setTimeout(300_000);
    const { businessId, businessUserId } = state();

    const offer = await seedPendingOffer(businessId, businessUserId);
    await admin().from("platform_admins").insert({ user_id: businessUserId });

    try {
        const page = await (await browser.newContext({ storageState: BUSINESS_AUTH })).newPage();
        await page.goto("/admin/offers", { timeout: 120_000 });

        const row = page.locator("article, li, div").filter({ hasText: offer.title }).last();
        await expect(page.getByText(offer.title).first()).toBeVisible({ timeout: 90_000 });

        await row.getByRole("button", { name: "Reject", exact: true }).first().click();

        // The confirm button is the thing being changed: there is now
        // nothing to confirm until a reason is chosen.
        const confirm = page.getByRole("button", { name: "Reject offer" });
        await expect(confirm).toBeDisabled();

        await page.getByRole("radio", { name: /Hard to check while serving/ }).check();
        await expect(confirm).toBeEnabled();

        // What they will read, shown before it is sent.
        await expect(page.getByText(/standing there waiting/)).toBeVisible();

        await page
            .getByLabel(/Anything to add/)
            .fill("Staff would have to ask a manager whether it applies.");

        await confirm.click();
        await expect(page.getByRole("button", { name: "Reject offer" })).toBeHidden({ timeout: 90_000 });

        // 1. On the row.
        const { data: after } = await admin()
            .from("offers")
            .select("approval_status, review_reason, review_note")
            .eq("id", offer.id)
            .single();

        expect(after?.approval_status).toBe("rejected");
        expect(after?.review_reason).toBe("hard-to-check");
        expect(after?.review_note).toBe("Staff would have to ask a manager whether it applies.");

        // 2. In the trail, which recorded only the status before.
        const { data: logged } = await admin()
            .from("audit_logs")
            .select("metadata")
            .eq("entity_id", offer.id)
            .eq("action", "offer_rejected")
            .order("created_at", { ascending: false })
            .limit(1);

        expect((logged?.[0]?.metadata as { reason?: string })?.reason).toBe("hard-to-check");

        // 3. On the business's own offers page, next to Edit offer —
        // where a red chip used to be the whole message.
        await page.goto(`/business/${businessId}/offers`, { timeout: 120_000 });

        const card = page.locator("div").filter({ hasText: offer.title }).last();
        await expect(card.getByText("Why this offer wasn't approved")).toBeVisible({ timeout: 90_000 });
        await expect(card.getByText(/ask a manager whether it applies/)).toBeVisible();
        await expect(card.getByText("What to change")).toBeVisible();
        await expect(card.getByRole("link", { name: /Why an offer isn't approved/ })).toBeVisible();
    } finally {
        await admin().from("platform_admins").delete().eq("user_id", businessUserId);
        await admin().from("offers").delete().eq("id", offer.id);
    }
});

// The guards are in the database as well as the dialog, so a decline
// cannot arrive without a reason by any other route either.
test("the database refuses a decline with no reason, and clears one on approval", async () => {
    const { businessId, businessUserId, businessEmail, testPassword } = state();

    const offer = await seedPendingOffer(businessId, businessUserId);
    await admin().from("platform_admins").insert({ user_id: businessUserId });

    const reviewer = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
        { auth: { autoRefreshToken: false, persistSession: false } },
    );

    try {
        await reviewer.auth.signInWithPassword({ email: businessEmail, password: testPassword });

        // No reason at all.
        const bare = await reviewer.rpc("review_offer", {
            offer_id: offer.id,
            decision: "rejected",
            reason: null,
            note: null,
        });
        expect(bare.error?.message).toMatch(/Say why/);

        // "Something else" is the note, so it cannot be empty.
        const empty = await reviewer.rpc("review_offer", {
            offer_id: offer.id,
            decision: "rejected",
            reason: "other",
            note: "   ",
        });
        expect(empty.error?.message).toMatch(/Write what to tell them/);

        // And the old two-argument call, which pages served before this
        // deploy still use, can approve but no longer decline.
        const legacy = await reviewer.rpc("review_offer", {
            offer_id: offer.id,
            decision: "rejected",
        });
        expect(legacy.error?.message).toMatch(/Say why/);

        const declined = await reviewer.rpc("review_offer", {
            offer_id: offer.id,
            decision: "rejected",
            reason: "end-date",
            note: "The end date was yesterday.",
        });
        expect(declined.error).toBeNull();

        // Put right and approved: the reason goes, so last month's
        // decline is not still sitting on a live offer's page.
        const approved = await reviewer.rpc("review_offer", {
            offer_id: offer.id,
            decision: "approved",
            reason: null,
            note: null,
        });
        expect(approved.error).toBeNull();

        const { data: after } = await admin()
            .from("offers")
            .select("approval_status, review_reason, review_note")
            .eq("id", offer.id)
            .single();

        expect(after?.approval_status).toBe("approved");
        expect(after?.review_reason).toBeNull();
        expect(after?.review_note).toBeNull();
    } finally {
        await admin().from("platform_admins").delete().eq("user_id", businessUserId);
        await admin().from("offers").delete().eq("id", offer.id);
    }
});

test("the help article the email links to opens on arrival", async ({ page }) => {
    await page.goto("/business/help#offer-declined", { timeout: 120_000 });

    const article = page.locator("details#offer-declined");
    await expect(article).toHaveAttribute("open", "", { timeout: 60_000 });
    await expect(article.getByText("The reasons we turn an offer down")).toBeVisible();
});
