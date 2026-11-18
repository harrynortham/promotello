import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import fs from "fs";

import { BUSINESS_AUTH, STATE_PATH } from "../global-setup";
import { throwawayBusinesses } from "../throwaway";

// A page we built does not wait for us.
//
// Approval sat exactly where enthusiasm peaks: a business whose page we
// built and vetted ourselves still had to finish the checklist, press
// send, and then wait (docs/LAUNCH-FUNNEL.md). The send went
// (20270123090000) and the claim is the acceptance now
// (20270124090000): we wrote the page and read it before we sent it, so
// claiming it is the moment it goes live — but only for a page of ours,
// and only when it has the three things that make a listing.

const admin = () =>
    createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
        auth: { autoRefreshToken: false, persistSession: false },
    });

const state = () => JSON.parse(fs.readFileSync(STATE_PATH, "utf8"));

// Registered the moment a business exists, so a seed that throws on the
// next insert cannot leave it behind (tests/throwaway.ts).
const remember = throwawayBusinesses();

async function seedPending(
    businessUserId: string,
    // hours defaults to complete. Set it false for the shape a page we
    // build actually has: a description and an address, and no opening
    // hours, because building a preview never asks for any.
    { ours, complete, hours = complete }: { ours: boolean; complete: boolean; hours?: boolean },
) {
    const client = admin();
    const stamp = Date.now();

    const { data: business, error } = await client
        .from("businesses")
        .insert({
            name: `E2E Straight Live ${stamp}`,
            slug: `e2e-straight-live-${stamp}`,
            category: "Testing",
            description: complete ? "A page built for them, ready to go." : null,
            logo_url: complete ? "logos/e2e.png" : null,
            cover_image_url: complete ? "covers/e2e.png" : null,
            approval_status: "pending",
        })
        .select("id")
        .single();

    expect(error).toBeNull();
    remember(business!.id);

    await client
        .from("business_members")
        .insert({ business_id: business!.id, user_id: businessUserId, role: "owner" });

    // Every one of these is checked. An unchecked seed insert that
    // fails leaves the row short of one of the five, and the test then
    // reports a working feature as broken — which is exactly what a
    // "postcode" that is really called postal_code did here.
    if (complete) {
        // An address has to name a real area: a trigger refuses one
        // that doesn't (docs/MULTI-CITY.md).
        const { data: area } = await client
            .from("areas")
            .select("id, name, city_id, cities ( name )")
            .limit(1)
            .single();

        const city = Array.isArray(area!.cities) ? area!.cities[0] : area!.cities;

        const location = await client.from("business_locations").insert({
            business_id: business!.id,
            name: "Main",
            address_line_1: "1 Test Street",
            city: city!.name,
            city_id: area!.city_id,
            area_id: area!.id,
            region: area!.name,
            postal_code: "BS1 1AA",
            country_code: "GB",
        });

        expect(location.error, "seeding an address").toBeNull();

        if (hours) {
            const seededHours = await client.from("business_hours").insert({
                business_id: business!.id,
                day_of_week: 1,
                is_closed: false,
                opens_at: "09:00",
                closes_at: "17:00",
            });

            expect(seededHours.error, "seeding opening hours").toBeNull();
        }
    }

    if (ours) {
        // Left unclaimed: claiming it is the thing under test now.
        const preview = await client
            .from("business_previews")
            .insert({
                business_id: business!.id,
                sample_offer: "E2E sample offer",
                sample_reward: "E2E sample reward",
                sample_stamps: 8,
            })
            .select("token")
            .single();

        expect(preview.error, "seeding a preview").toBeNull();
        tokens.set(business!.id, preview.data!.token as string);
    }

    return business!.id;
}

// The token of the preview seeded for a business, where there is one.
const tokens = new Map<string, string>();

const statusOf = async (businessId: string) => {
    const { data } = await admin()
        .from("businesses")
        .select("approval_status, review_requested_at")
        .eq("id", businessId)
        .single();

    return data!;
};

// The business claims it the way the preview page does.
const claim = async (businessId: string) => {
    const { businessEmail, testPassword } = state();
    const client = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
        { auth: { autoRefreshToken: false, persistSession: false } },
    );

    await client.auth.signInWithPassword({ email: businessEmail, password: testPassword });

    return client.rpc("claim_business_preview", { requested_token: tokens.get(businessId) });
};

test("a finished page of ours goes live the moment they claim it", async () => {
    const { businessUserId } = state();
    const businessId = await seedPending(businessUserId, { ours: true, complete: true });

    try {
        const { error } = await claim(businessId);
        expect(error).toBeNull();

        const after = await statusOf(businessId);

        expect(after.approval_status).toBe("approved");
        expect(after.review_requested_at, "they still asked, and we still record it").not.toBeNull();

        // And it is in the trail as an approval, not as a status that
        // changed itself.
        const { data: logged } = await admin()
            .from("audit_logs")
            .select("action")
            .eq("entity_id", businessId)
            .eq("action", "business_approved");

        expect(logged ?? []).toHaveLength(1);
    } finally {
        await admin().from("businesses").delete().eq("id", businessId);
    }
});

// A cold sign-up has never been read by anyone. It joins the queue on
// its own, which is the whole of the change — nobody pressed anything
// here, the seed simply gave it the three things.
test("a page they built themselves is queued by itself, and still waits for us", async () => {
    const { businessUserId } = state();
    const businessId = await seedPending(businessUserId, { ours: false, complete: true });

    try {
        const after = await statusOf(businessId);

        expect(after.review_requested_at, "asked for, with nothing pressed").not.toBeNull();
        expect(after.approval_status, "and still read by a person").toBe("pending");
    } finally {
        await admin().from("businesses").delete().eq("id", businessId);
    }
});

// The other half of the same rule: until it is a listing, it is not in
// front of anybody.
test("a page with nothing on it is not in the queue", async () => {
    const { businessUserId } = state();
    const businessId = await seedPending(businessUserId, { ours: false, complete: false });

    try {
        expect((await statusOf(businessId)).review_requested_at).toBeNull();
    } finally {
        await admin().from("businesses").delete().eq("id", businessId);
    }
});

// The floor under the claim: we build these ourselves and they are
// complete, so this should never fire — but a claim must not be able to
// put a page with no address on the directory, whatever we filled in.
test("a page of ours that isn't finished still waits", async () => {
    const { businessUserId } = state();
    const businessId = await seedPending(businessUserId, { ours: true, complete: false });

    try {
        const { error } = await claim(businessId);
        expect(error).toBeNull();

        expect((await statusOf(businessId)).approval_status).toBe("pending");
    } finally {
        await admin().from("businesses").delete().eq("id", businessId);
    }
});

// The shape every real preview has. A preview is built from a lead —
// name, category, address, area, postcode, who to write to — plus a
// description, a sample offer, a card and two photos, and no opening
// hours at all.
// So while the claim wanted all three, it refused every preview built the
// normal way: claimed pages sat pending and unqueued while the preview page
// promised they would go live on the claim (20270128090000).
test("a page of ours goes live on claim with no opening hours", async () => {
    const { businessUserId } = state();
    const businessId = await seedPending(businessUserId, {
        ours: true,
        complete: true,
        hours: false,
    });

    try {
        const admins = admin();
        const { count } = await admins
            .from("business_hours")
            .select("id", { count: "exact", head: true })
            .eq("business_id", businessId);

        expect(count, "the seed really has no hours, or this proves nothing").toBe(0);

        const { error } = await claim(businessId);
        expect(error).toBeNull();

        expect((await statusOf(businessId)).approval_status).toBe("approved");
    } finally {
        await admin().from("businesses").delete().eq("id", businessId);
    }
});

// Somebody who presses the link twice, or opens it on a second device.
test("claiming twice is harmless", async () => {
    const { businessUserId } = state();
    const businessId = await seedPending(businessUserId, { ours: true, complete: true });

    try {
        await claim(businessId);
        const again = await claim(businessId);

        expect(again.error, "the same person claiming again is not an error").toBeNull();
        expect((await statusOf(businessId)).approval_status).toBe("approved");
    } finally {
        await admin().from("businesses").delete().eq("id", businessId);
    }
});

// There is no send button left to offer, and the dashboard has to stop
// asking for something that cannot be done.
test("the dashboard says it is with us, and offers nothing to press", async ({ browser }) => {
    test.setTimeout(300_000);
    const { businessUserId } = state();
    const businessId = await seedPending(businessUserId, { ours: false, complete: true });

    try {
        const page = await (await browser.newContext({ storageState: BUSINESS_AUTH })).newPage();

        await page.goto(`/business/${businessId}`, { timeout: 120_000 });

        await expect(page.getByText(/is with us/)).toBeVisible({ timeout: 90_000 });
        await expect(page.getByRole("button", { name: /Send .* for review/ })).toHaveCount(0);
        await expect(page.getByText("Send your page for review")).toHaveCount(0);
    } finally {
        await admin().from("businesses").delete().eq("id", businessId);
    }
});

// The trigger is the only thing between a business and approving
// itself: businesses_update_admins lets an admin write any
// approval_status on their own row (20270114090000). So the exception
// it learned has to be exactly the policy, and nothing wider.
test("a business still cannot approve itself by writing the column", async () => {
    const { businessUserId, businessEmail, testPassword } = state();

    // Everything the exception asks for except the one thing it cannot
    // have: a page of ours. This is a business that built its own.
    const businessId = await seedPending(businessUserId, { ours: false, complete: true });

    const client = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
        { auth: { autoRefreshToken: false, persistSession: false } },
    );

    try {
        await client.auth.signInWithPassword({ email: businessEmail, password: testPassword });

        // Already in the queue, by the trigger rather than by asking —
        // so this has every fact the exception wants except a page of
        // ours, which is the one it cannot have.
        expect((await statusOf(businessId)).review_requested_at).not.toBeNull();

        const forced = await client
            .from("businesses")
            .update({ approval_status: "approved" })
            .eq("id", businessId);

        expect(forced.error?.message).toMatch(/Only platform administrators/);
        expect((await statusOf(businessId)).approval_status).toBe("pending");
    } finally {
        await admin().from("businesses").delete().eq("id", businessId);
    }
});

// Somebody who presses Claim without an account is sent to sign up, and
// the right-hand panel used to show the same stock illustration everybody
// gets. They were looking at their own page two screens ago; asking them
// for an email address in front of a generic graphic makes them take on
// trust what we could simply show them.
//
// Nothing is passed in the URL to do it. ?next= already carries the
// token, which is the only thing that proves which business this is — a
// name in the query string would let anyone put any business on our
// sign-up page.
test("the sign-up page shows the page being claimed, without counting a view", async ({ page }) => {
    const { businessUserId } = state();
    const businessId = await seedPending(businessUserId, { ours: true, complete: true });
    const token = tokens.get(businessId)!;

    try {
        const before = await admin()
            .from("business_previews")
            .select("view_count")
            .eq("business_id", businessId)
            .single();

        await page.context().clearCookies();
        await page.goto(`/business/register?next=${encodeURIComponent(`/business/preview/${token}`)}`);

        // Their own page, in the panel.
        await expect(page.getByText("Claiming", { exact: false })).toBeVisible({ timeout: 20_000 });
        await expect(page.getByText("E2E Straight Live", { exact: false }).first()).toBeVisible();

        // And not the stock panel.
        await expect(page.getByText("Built around local discovery")).toHaveCount(0);

        // The outreach numbers are untouched: rendering a form is not the
        // business opening their link. preview_card() reads, where
        // open_business_preview() would have counted (20270130090000).
        const after = await admin()
            .from("business_previews")
            .select("view_count, first_viewed_at")
            .eq("business_id", businessId)
            .single();

        expect(after.data!.view_count).toBe(before.data!.view_count);
        expect(after.data!.first_viewed_at).toBeNull();
    } finally {
        await admin().from("businesses").delete().eq("id", businessId);
    }
});

// A link somebody mangled, or a preview that has gone: the form still
// works and falls back to the panel everybody else sees.
test("a sign-up link with no readable preview still renders", async ({ page }) => {
    await page.context().clearCookies();
    await page.goto(
        "/business/register?next=%2Fbusiness%2Fpreview%2Fgone-00000000-0000-0000-0000-000000000000",
    );

    await expect(page.getByText("Built around local discovery")).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText("Claiming", { exact: false })).toHaveCount(0);
});
