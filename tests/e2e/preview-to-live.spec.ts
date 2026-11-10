import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import { STATE_PATH, BUSINESS_AUTH } from "../global-setup";
import { previewLink } from "../../lib/previews";

const admin = () =>
    createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
        auth: { autoRefreshToken: false, persistSession: false },
    });

// The whole chain a business walks, from the link in the outreach email to
// a page customers can find. The one step not here is confirming an email,
// which needs a real PKCE link.
test("a preview becomes a live business", async ({ browser }) => {
    const state = JSON.parse(fs.readFileSync(STATE_PATH, "utf8"));
    const db = admin();
    const stamp = Date.now();
    const name = `E2E Preview To Live ${stamp}`;

    // What the admin preview form produces: a business with our words on
    // it, pending, and nobody asked to look at it yet.
    const { data: business } = await db
        .from("businesses")
        .insert({
            name,
            slug: `e2e-p2l-${stamp}`,
            category: "Testing",
            description: "A kitchen we wrote a line about from the outside.",
            approval_status: "pending",
            // One of us built it, and we never join the business: that is
            // how the dashboard knows whose words are on the page.
            created_by: state.customerUserId,
        })
        .select("id, slug")
        .single();

    const { error: previewError } = await db.from("business_previews").insert({
        business_id: business!.id,
        contact_name: "Sam",
        sample_offer: "Free side with any main",
        sample_reward: "a free main",
        sample_stamps: 9,
        created_by: state.businessUserId,
    });
    expect(previewError, "could not seed the preview").toBeNull();

    const { error: locationError } = await db.from("business_locations").insert({
        business_id: business!.id,
        name: "Main location",
        address_line_1: "27 Gloucester Road",
        city: "Bristol",
        region: "Bishopston",
        postal_code: "BS7 8AA",
        country_code: "GB",
    });
    expect(locationError, "could not seed the location").toBeNull();

    // next/image only loads the Supabase host, so borrow real files
    // rather than inventing URLs.
    const { data: existing } = await db
        .from("businesses")
        .select("logo_url, cover_image_url")
        .not("logo_url", "is", null)
        .not("cover_image_url", "is", null)
        .limit(1)
        .single();

    const dashboard = `/business/${business!.id}`;

    try {
        const page = await (await browser.newContext({ storageState: BUSINESS_AUTH })).newPage();

        // 1. The link from the email, with their name in front of the token.
        await page.goto(previewLink((await db
            .from("business_previews")
            .select("token")
            .eq("business_id", business!.id)
            .single()).data!.token, name));

        await expect(page.getByRole("heading", { name: new RegExp(`${name} on Promotello`) })).toBeVisible({
            timeout: 15_000,
        });
        // The claim block appears twice: hero and foot of the page.
        await expect(page.getByText("Free, and nothing goes public until you say so.").first()).toBeVisible();

        // 2. Claiming hands them the flow that finishes the page, rather
        //    than a dashboard they would have to find their way around.
        await page.getByRole("button", { name: `Claim ${name}` }).first().click();
        await page.waitForURL(`**/business/setup/${business!.id}?welcome=1`, { timeout: 20_000 });
        await expect(page.getByRole("heading", { name: /Let's finish your page/ })).toBeVisible();
        // What they are building, beside what they are filling in.
        await expect(page.getByText("Your page so far").first()).toBeVisible();

        // Whose words these are is said once, on the field being edited —
        // and never about an offer, because building a preview has never
        // created one.
        await page.goto(`/business/setup/${business!.id}?step=description`);
        const note = page.getByText("We wrote this from the outside");
        await expect(note).toBeVisible({ timeout: 15_000 });
        await expect(page.locator("main")).not.toContainText("offer are our guesses");

        // 3. The dashboard is still there for anyone who wants it: one
        //    banner, no Send button, and the page theirs to finish first.
        await page.goto(dashboard);
        await expect(page.getByText("Draft")).toBeVisible();
        await expect(page.getByText("Your page isn't live yet")).toBeVisible();
        await expect(page.getByRole("button", { name: `Send ${name} for review` })).toHaveCount(0);
        await expect(page.getByText("Ready once the steps above are done.")).toBeVisible();

        // And the dashboard says the same thing it says to a business that
        // signed itself up: no claim about who wrote the page.
        await expect(page.locator("#send-for-review")).not.toContainText("We wrote");

        // Nothing telling them they have nothing.
        await expect(page.getByText("No redemptions yet")).toHaveCount(0);

        // 4. They finish the profile.
        const { error: imagesError } = await db
            .from("businesses")
            .update({
                logo_url: existing!.logo_url,
                cover_image_url: existing!.cover_image_url,
            })
            .eq("id", business!.id);
        expect(imagesError, "could not set the images").toBeNull();

        const { error: hoursError } = await db.from("business_hours").insert({
            business_id: business!.id,
            day_of_week: 1,
            is_closed: false,
            opens_at: "09:00",
            closes_at: "17:00",
        });
        expect(hoursError, "could not set the hours").toBeNull();

        await page.goto(dashboard);
        const send = page.getByRole("button", { name: `Send ${name} for review` });
        await expect(send).toBeVisible({ timeout: 15_000 });

        // 5. Sending it.
        await send.click();
        await expect(page.getByText("Sent for review")).toBeVisible({ timeout: 20_000 });
        await expect(page.getByText("Pending approval")).toBeVisible();
        await page.close();

        // 6. It reaches the queue, and we approve it.
        await db.from("platform_admins").insert({ user_id: state.businessUserId });
        const reviewer = await (await browser.newContext({ storageState: BUSINESS_AUTH })).newPage();
        await reviewer.goto("/admin/businesses");
        await expect(reviewer.getByText(name)).toBeVisible({ timeout: 15_000 });
        await reviewer.close();

        const asAdmin = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
            { auth: { autoRefreshToken: false, persistSession: false } },
        );
        await asAdmin.auth.signInWithPassword({
            email: state.businessEmail,
            password: state.testPassword,
        });

        const { error: approveError } = await asAdmin.rpc("review_business", {
            business_id: business!.id,
            decision: "approved",
        });
        expect(approveError, "could not approve the business").toBeNull();

        // 7. A customer can find it, and the owner sees their own page as
        //    their own page.
        const visitor = await (await browser.newContext()).newPage();
        await visitor.goto(`/businesses/${business!.slug}`);
        await expect(visitor.getByRole("heading", { name, level: 1 })).toBeVisible({ timeout: 15_000 });
        await expect(visitor.getByLabel(/^Back to businesses in /)).toBeVisible();
        await visitor.close();

        const owner = await (await browser.newContext({ storageState: BUSINESS_AUTH })).newPage();
        await owner.goto(`/businesses/${business!.slug}`);
        await expect(owner.getByText("the way a customer sees it")).toBeVisible({ timeout: 15_000 });
        await expect(owner.getByLabel(/^Back to businesses in /)).toHaveCount(0);
        await owner.close();
    } finally {
        await db.from("platform_admins").delete().eq("user_id", state.businessUserId);
        await db.from("businesses").delete().eq("id", business!.id);
    }
});
