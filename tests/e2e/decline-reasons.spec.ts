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

// Seeded at the status it needs to be at, never updated into it:
// require_review_of_edited_offer exempts platform admins by auth.uid(),
// and the service role has none — so an update to 'approved' lands back
// on 'pending' and the test waits for a button that isn't there.
async function seedOffer(
    businessId: string,
    businessUserId: string,
    approval: "pending" | "approved" = "pending",
) {
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
            approval_status: approval,
        })
        .select("id, title")
        .single();

    expect(error).toBeNull();
    return data!;
}

test("an offer cannot be declined without a reason, and the reason reaches the business", async ({ browser }) => {
    test.setTimeout(300_000);
    const { businessId, businessUserId } = state();

    const offer = await seedOffer(businessId, businessUserId);
    await admin().from("platform_admins").insert({ user_id: businessUserId });

    try {
        const page = await (await browser.newContext({ storageState: BUSINESS_AUTH })).newPage();
        await page.goto("/admin/offers", { timeout: 120_000 });

        // Narrow the queue to this one offer, so "Reject" can only mean
        // ours however many others are waiting.
        await expect(page.getByRole("heading", { name: "Offers", level: 1 })).toBeVisible({ timeout: 90_000 });
        await page.getByRole("textbox", { name: "Search offers" }).fill(offer.title);
        await page.getByRole("button", { name: "Search", exact: true }).click();

        await expect(page.getByText(offer.title)).toBeVisible({ timeout: 60_000 });
        await page.getByRole("button", { name: "Reject", exact: true }).click();

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

        await confirm.click({ timeout: 30_000 });

        // The whole dialog, not its button: the button's own label
        // changes to "Saving…" the moment it is pressed, so waiting for
        // that to go races the request it started.
        await expect(page.getByRole("dialog")).toBeHidden({ timeout: 120_000 });

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

        // The note is this offer's own words, so finding it on the page
        // finds the panel it is rendered in and no other.
        const note = page.getByText("Staff would have to ask a manager whether it applies.");
        await expect(note).toBeVisible({ timeout: 90_000 });

        const panel = note.locator("..");
        await expect(panel.getByText("Why this offer wasn't approved")).toBeVisible();
        await expect(panel.getByText("What to change")).toBeVisible();
        await expect(panel.getByRole("link", { name: /Why an offer isn't approved/ })).toBeVisible();
    } finally {
        await admin().from("platform_admins").delete().eq("user_id", businessUserId);
        await admin().from("offers").delete().eq("id", offer.id);
    }
});

// The guards are in the database as well as the dialog, so a decline
// cannot arrive without a reason by any other route either.
test("the database refuses a decline with no reason, and clears one on approval", async () => {
    const { businessId, businessUserId, businessEmail, testPassword } = state();

    const offer = await seedOffer(businessId, businessUserId);
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

// Taking down something that was live. The control did not exist before
// this: suspension happened in SQL, so it happened silently.
test("a live offer can be taken down with a reason, and put back", async ({ browser }) => {
    test.setTimeout(300_000);
    const { businessId, businessUserId } = state();

    const offer = await seedOffer(businessId, businessUserId, "approved");
    await admin().from("platform_admins").insert({ user_id: businessUserId });

    try {
        const page = await (await browser.newContext({ storageState: BUSINESS_AUTH })).newPage();
        await page.goto("/admin/offers", { timeout: 120_000 });

        await expect(page.getByRole("heading", { name: "Offers", level: 1 })).toBeVisible({ timeout: 90_000 });
        await page.getByRole("button", { name: "All offers" }).click();
        await page.getByRole("textbox", { name: "Search offers" }).fill(offer.title);
        await page.getByRole("button", { name: "Search", exact: true }).click();

        await expect(page.getByText(offer.title)).toBeVisible({ timeout: 60_000 });
        await page.getByRole("button", { name: "Take it down", exact: true }).click();

        const confirm = page.getByRole("button", { name: "Take it down", exact: true }).last();
        await expect(confirm).toBeDisabled();

        // The suspension list, not the rejection one: "End date won't
        // work" is not why a live offer comes off the site.
        await expect(page.getByRole("radio", { name: /End date won't work/ })).toHaveCount(0);
        await page.getByRole("radio", { name: /What's on offer has gone/ }).check();

        await expect(confirm).toBeEnabled();
        await confirm.click({ timeout: 30_000 });
        await expect(page.getByRole("dialog")).toBeHidden({ timeout: 120_000 });

        const { data: down } = await admin()
            .from("offers")
            .select("approval_status, review_reason")
            .eq("id", offer.id)
            .single();

        expect(down?.approval_status).toBe("suspended");
        expect(down?.review_reason).toBe("no-longer-available");

        // The business reads the same words, under the heading that
        // belongs to something taken down rather than refused.
        const business = await (await browser.newContext({ storageState: BUSINESS_AUTH })).newPage();
        await business.goto(`/business/${businessId}/offers`, { timeout: 120_000 });

        await expect(business.getByText("Why this offer was taken down").first())
            .toBeVisible({ timeout: 90_000 });
        await expect(business.getByText("What puts it back").first()).toBeVisible();

        // And back again.
        await page.getByRole("button", { name: "Put it back", exact: true }).click();
        await page.getByRole("button", { name: "Put it back", exact: true }).last().click({ timeout: 30_000 });
        await expect(page.getByRole("dialog")).toBeHidden({ timeout: 120_000 });

        const { data: up } = await admin()
            .from("offers")
            .select("approval_status, review_reason, review_note")
            .eq("id", offer.id)
            .single();

        expect(up?.approval_status).toBe("approved");
        expect(up?.review_reason, "and the reason goes with it").toBeNull();
        expect(up?.review_note).toBeNull();
    } finally {
        await admin().from("platform_admins").delete().eq("user_id", businessUserId);
        await admin().from("offers").delete().eq("id", offer.id);
    }
});

test("the database refuses a suspension with no reason", async () => {
    const { businessId, businessUserId, businessEmail, testPassword } = state();

    const offer = await seedOffer(businessId, businessUserId, "approved");
    await admin().from("platform_admins").insert({ user_id: businessUserId });

    const reviewer = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
        { auth: { autoRefreshToken: false, persistSession: false } },
    );

    try {
        await reviewer.auth.signInWithPassword({ email: businessEmail, password: testPassword });

        const bare = await reviewer.rpc("review_offer", {
            offer_id: offer.id,
            decision: "suspended",
            reason: null,
            note: null,
        });
        expect(bare.error?.message).toMatch(/Say why/);

        // Including by the old two-argument call, which is how a
        // suspension used to happen with nothing said.
        const legacy = await reviewer.rpc("review_offer", {
            offer_id: offer.id,
            decision: "suspended",
        });
        expect(legacy.error?.message).toMatch(/Say why/);

        const { data: still } = await admin()
            .from("offers")
            .select("approval_status")
            .eq("id", offer.id)
            .single();

        expect(still?.approval_status, "and it stayed up").toBe("approved");
    } finally {
        await admin().from("platform_admins").delete().eq("user_id", businessUserId);
        await admin().from("offers").delete().eq("id", offer.id);
    }
});
