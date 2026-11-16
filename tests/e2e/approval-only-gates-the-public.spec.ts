import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import fs from "fs";

import { STATE_PATH } from "../global-setup";
import { throwawayBusinesses } from "../throwaway";

// The guarantee everything else now rests on.
//
// A business builds its whole page before anybody reads it — profile,
// offers, loyalty card, QR posters, a trial
// (20270123090000_the_queue_fills_itself.sql). That is only safe while
// approval still decides the one thing it is for: whether any of it is
// public. The gate is in the database rather than in a page, so no
// route, no cache and no future page can leak round it — and this says
// so out loud, because it is the assumption the rest of the change is
// built on.

const admin = () =>
    createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
        auth: { autoRefreshToken: false, persistSession: false },
    });

// What anybody on the internet gets: no session at all.
const anonymous = () =>
    createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
        { auth: { autoRefreshToken: false, persistSession: false } },
    );

const remember = throwawayBusinesses();

test("a page being read is built, queued, and invisible to everybody else", async ({ page }) => {
    test.setTimeout(180_000);

    const { businessUserId } = JSON.parse(fs.readFileSync(STATE_PATH, "utf8"));
    const client = admin();
    const stamp = Date.now();
    const name = `E2E Still Reading ${stamp}`;
    const slug = `e2e-still-reading-${stamp}`;

    // The stored slug is not the one asked for: a suffix is added to
    // keep it unique, so the public URL has to be read back rather than
    // assumed.
    const { data: business } = await client
        .from("businesses")
        .insert({
            name,
            slug,
            category: "Testing",
            description: "Everything a listing needs, and not yet read.",
            approval_status: "pending",
        })
        .select("id, slug")
        .single();

    const publicSlug = business!.slug as string;

    remember(business!.id);

    await client
        .from("business_members")
        .insert({ business_id: business!.id, user_id: businessUserId, role: "owner" });

    try {
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

        const hours = await client.from("business_hours").insert({
            business_id: business!.id,
            day_of_week: 1,
            is_closed: false,
            opens_at: "09:00",
            closes_at: "17:00",
        });

        expect(hours.error, "seeding opening hours").toBeNull();

        // It asked, on its own, with nobody pressing anything.
        const { data: queued } = await client
            .from("businesses")
            .select("approval_status, review_requested_at")
            .eq("id", business!.id)
            .single();

        expect(queued!.review_requested_at).not.toBeNull();
        expect(queued!.approval_status).toBe("pending");

        // And an offer on it, which is read on its own account.
        const { error: offerError } = await client.from("offers").insert({
            business_id: business!.id,
            title: `E2E Hidden Offer ${stamp}`,
            slug: `e2e-hidden-offer-${stamp}`,
            description: "Not visible to anybody yet.",
            category: "Testing",
            availability: "Any time",
            discount: "20% off",
            terms: "One per customer.",
            expires_at: new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10),
            approval_status: "pending",
        });

        expect(offerError, "seeding an offer").toBeNull();

        // Nothing of it is readable without a session. This is RLS, not
        // a page: businesses_select_approved_public and
        // offers_public_select_approved.
        const nobody = anonymous();

        const { data: seenBusiness } = await nobody
            .from("businesses")
            .select("id")
            .eq("id", business!.id);

        expect(seenBusiness ?? [], "a pending business is not readable by anybody").toHaveLength(0);

        const { data: seenOffers } = await nobody
            .from("offers")
            .select("id")
            .eq("business_id", business!.id);

        expect(seenOffers ?? [], "nor are its offers").toHaveLength(0);

        // Nor does its page serve anything, however the URL is reached.
        // Asserted on the content rather than the status: a dev server
        // renders the not-found page at 200 where production answers
        // 404, and what matters either way is that none of this business
        // is on it.
        await page.goto(`/businesses/${publicSlug}`, { timeout: 120_000 });

        // The heading first, so a page that merely failed to render
        // cannot pass this by being blank.
        // Apostrophe-agnostic: the page renders a typographic one.
        await expect(page.getByText(/We couldn.t find that place/)).toBeVisible({
            timeout: 60_000,
        });

        const body = (await page.locator("body").innerText()).toLowerCase();

        expect(body, "its name is nowhere on the page").not.toContain(name.toLowerCase());

        // And it is not in the sitemap, which is built from the same
        // RLS-limited queries.
        const sitemap = await page.goto("/sitemap.xml", { timeout: 120_000 });
        expect(await sitemap!.text()).not.toContain(publicSlug);
    } finally {
        await client.from("businesses").delete().eq("id", business!.id);
    }
});
