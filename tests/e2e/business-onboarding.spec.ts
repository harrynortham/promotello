import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import { BUSINESS_AUTH, STATE_PATH } from "../global-setup";
import { signInWithCode } from "../sign-in";

const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
);

test("a new owner goes from an empty dashboard to a set-up business", async ({ page }) => {
    test.setTimeout(120_000);

    const email = `e2e_onboarding_${Date.now()}@test.internal`;
    const password = "E2eTestPass1!";
    const { data: created, error } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: "Jo Baker" },
    });
    expect(error).toBeNull();
    const userId = created.user!.id;

    try {
        await signInWithCode(page, email, "/business/dashboard");

        // No business yet: one clear next step.
        await expect(page.getByRole("heading", { name: /Welcome, Jo/ })).toBeVisible({ timeout: 15_000 });
        await page.getByRole("button", { name: "Add your business" }).click();

        // Step 1: the basics. Continue is blocked until the name is filled in.
        await page.waitForURL("**/onboarding");
        await page.getByRole("button", { name: "Continue" }).click();
        await expect(page.getByRole("heading", { name: "Your business" })).toBeVisible();

        await page.locator("#category").selectOption({ label: "Bakeries" });
        await page.locator("#businessName").fill("E2E Onboarding Bakery");
        // Pressing Enter moves on just like the Continue button.
        await page.locator("#businessName").press("Enter");

        // Step 2: address, with Bristol filled in.
        await expect(page.getByRole("heading", { name: "Where to find you" })).toBeVisible();
        await expect(page.locator("#city")).toHaveValue("Bristol");
        await page.locator("#addressLine1").fill("Cotham Hill");
        await page.locator("#region").selectOption("Cotham");

        // Only postcodes in the city are accepted.
        await page.locator("#postalCode").fill("BA1 1AA");
        await page.getByRole("button", { name: "Continue" }).click();
        await expect(page.getByText("That postcode isn't in Bristol.")).toBeVisible();
        await page.locator("#postalCode").fill("bs6 6df");
        await page.getByRole("button", { name: "Continue" }).click();

        // Step 3: review, then create. Reaching the review step must not
        // create the business by itself.
        await expect(page.getByText("E2E Onboarding Bakery")).toBeVisible();
        await expect(page.getByText("Cotham Hill, Cotham, Bristol, bs6 6df")).toBeVisible();
        await page.waitForTimeout(1500);
        await expect(page).toHaveURL(/\/onboarding$/);
        const { count: early } = await admin
            .from("businesses")
            .select("id", { count: "exact", head: true })
            .eq("created_by", userId);
        expect(early).toBe(0);

        await page.locator("#website").fill("https://example.com");
        await page.getByRole("button", { name: "Create my business" }).click();

        // Client-side navigation: wait for the URL, not a full page load.
        await page.waitForURL(/\/business\/setup\/[0-9a-f-]+\?welcome=1/, { timeout: 15_000, waitUntil: "commit" });

        // Straight into finishing the page, with the page itself beside it.
        await expect(page.getByRole("heading", { name: /Let's finish your page, Jo/ })).toBeVisible();
        await expect(page.getByText("Your page so far")).toBeVisible();
        await expect(page.getByRole("heading", { name: "Add your logo", level: 2 })).toBeVisible();

        // The address it just collected is the only thing done: a business
        // that signs itself up is in exactly the state a claimed page is,
        // including having to send the page for review itself.
        await expect(page.getByText("1 of 7 done")).toBeVisible();

        await page.getByRole("button", { name: "Send it" }).click();
        await expect(page.getByRole("heading", { name: "Send your page to us", level: 2 })).toBeVisible();
        await expect(page.getByText("4 things first")).toBeVisible();
        await expect(page.getByRole("button", { name: /Send .* for review/ })).toHaveCount(0);

        // They wrote this page themselves, so nothing on it is a guess of
        // ours and the dashboard mustn't say it is.
        await expect(page.getByText("We wrote")).toHaveCount(0);

        // A cover photo comes before the first offer: an offer sends
        // people to a page, and the page should be worth landing on.
        const steps = await page.locator("ol button").allInnerTexts();
        const cover = steps.findIndex((step) => step.includes("Cover photo"));
        const offer = steps.findIndex((step) => step.includes("First offer"));

        expect(cover, "the cover photo step is there").toBeGreaterThan(-1);
        expect(cover, "and comes before the first offer").toBeLessThan(offer);

        // The dashboard is a click away for anyone who would rather, and
        // says the same thing it says to a business whose page we wrote.
        await page.getByRole("button", { name: "Finish later" }).click();
        await expect(page.getByText("Get ready to go live")).toBeVisible({ timeout: 15_000 });
        await expect(page.getByText("Add logo")).toBeVisible();
        await expect(page.getByText("Your page isn't live yet")).toBeVisible();
        await expect(page.getByText("Send your page for review")).toBeVisible();
    } finally {
        await admin.from("businesses").delete().eq("created_by", userId);
        await admin.auth.admin.deleteUser(userId);
    }
});

test("locations must be in a live city, in a listed area, with a postcode from the city", async () => {
    const { freeBusinessId, businessEmail, testPassword } = JSON.parse(fs.readFileSync(STATE_PATH, "utf8"));

    const owner = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
        auth: { autoRefreshToken: false, persistSession: false },
    });
    await owner.auth.signInWithPassword({ email: businessEmail, password: testPassword });

    const location = (city: string, region: string, postal_code: string) => ({
        business_id: freeBusinessId,
        name: "E2E location",
        address_line_1: "1 Test Street",
        city,
        region,
        postal_code,
        country_code: "GB",
    });

    const outsideCity = await owner.from("business_locations").insert(location("Bath", "Centre", "BA1 1AA"));
    expect(outsideCity.error?.message).toContain("isn't available");

    const madeUpArea = await owner.from("business_locations").insert(location("Bristol", "Clifton, Southville", "BS8 4AA"));
    expect(madeUpArea.error?.message).toContain("Choose your area");

    const wrongPostcode = await owner.from("business_locations").insert(location("Bristol", "Clifton", "BA1 1AA"));
    expect(wrongPostcode.error?.message).toContain("isn't in Bristol");

    const good = await owner.from("business_locations").insert(location("bristol", "clifton", "bs8 4aa")).select("city, region, postal_code").single();
    expect(good.error).toBeNull();
    expect(good.data).toEqual({ city: "Bristol", region: "Clifton", postal_code: "BS8 4AA" });

    await owner.from("business_locations").delete().eq("business_id", freeBusinessId).eq("name", "E2E location");
});

// The checklist is a thing you finish. With every step done it leaves
// the dashboard rather than sitting there as a wall of ticks above the
// numbers that matter.
test("the setup checklist goes once there is nothing left to do", async ({ browser }) => {
    test.setTimeout(120_000);

    const state = JSON.parse(fs.readFileSync(STATE_PATH, "utf8"));
    const run = Date.now();
    let businessId: string | undefined;

    const { data: picture } = await admin
        .from("businesses")
        .select("logo_url, cover_image_url")
        .not("cover_image_url", "is", null)
        .limit(1)
        .single();

    const { data: area } = await admin
        .from("areas")
        .select("id, name, city_id, cities ( name )")
        .limit(1)
        .single();

    const city = Array.isArray(area!.cities) ? area!.cities[0] : area!.cities;

    try {
        const { data: business } = await admin
            .from("businesses")
            .insert({
                name: `E2E Finished Business ${run}`,
                category: "Testing",
                description: "Everything on the checklist is done.",
                approval_status: "approved",
                created_by: state.businessUserId,
                logo_url: picture!.logo_url ?? picture!.cover_image_url,
                cover_image_url: picture!.cover_image_url,
                google_review_url: "https://g.page/r/e2e/review",
            })
            .select("id")
            .single();
        businessId = business!.id;

        // Pro, so the loyalty card is allowed.
        await admin.from("subscriptions").insert({
            business_id: businessId,
            stripe_subscription_id: `sub_e2e_done_${run}`,
            stripe_customer_id: `cus_e2e_done_${run}`,
            status: "active",
        });

        // Owner, plus a second person so "invite your team" is done.
        await admin.from("business_members").insert([
            { business_id: businessId, user_id: state.businessUserId, role: "owner" },
            { business_id: businessId, user_id: state.customerUserId, role: "member" },
        ]);

        await admin.from("business_locations").insert({
            business_id: businessId,
            name: "Main",
            address_line_1: "1 Test Street",
            city: city!.name,
            city_id: area!.city_id,
            area_id: area!.id,
            region: area!.name,
            postal_code: "BS1 1AA",
            country_code: "GB",
        });

        await admin.from("business_hours").insert(
            [0, 1, 2, 3, 4, 5, 6].map((day) => ({
                business_id: businessId,
                day_of_week: day,
                is_closed: day === 0,
                opens_at: day === 0 ? null : "09:00",
                closes_at: day === 0 ? null : "17:00",
            })),
        );

        await admin.from("offers").insert({
            business_id: businessId,
            created_by: state.businessUserId,
            slug: `e2e-finished-${run}`,
            title: "E2E Finished Offer",
            category: "Testing",
            discount: "10% off",
            description: "An offer so the checklist has one.",
            availability: "Available now",
            expires_at: "2030-12-31",
            terms: "For automated tests only.",
            approval_status: "approved",
            redemption_count: 0,
            image_url: picture!.cover_image_url,
        });

        await admin.from("qr_codes").insert({ business_id: businessId, label: "Front window" });

        const { error: loyaltyError } = await admin.from("loyalty_programs").insert({
            business_id: businessId,
            stamps_required: 9,
            reward: "a free coffee",
            is_active: true,
        });
        expect(loyaltyError, "the loyalty card was set up").toBeNull();

        const page = await (await browser.newContext({ storageState: BUSINESS_AUTH })).newPage();
        await page.goto(`/business/${businessId}`);

        // The dashboard itself is there…
        // The sidebar names it too, so ask for the page's own heading.
        await expect(
            page.getByRole("heading", { level: 1, name: `E2E Finished Business ${run}` }),
        ).toBeVisible({ timeout: 20_000 });

        // …and the checklist isn't, in any of its states.
        await expect(page.getByText("Get your business ready")).toHaveCount(0);
        await expect(page.getByText("What's next")).toHaveCount(0);
        await expect(page.getByText("You're ready to go live")).toHaveCount(0);
    } finally {
        if (businessId) await admin.from("businesses").delete().eq("id", businessId);
    }
});

// Two steps used to send someone to the full business profile page: tabs,
// nine fields, a save button at the bottom and no way back to the list
// they were working down. Each has a page of its own now, and saving
// returns to the dashboard with the step ticked.
test("the description and the address each have a page of their own", async ({ browser }) => {
    test.setTimeout(120_000);

    const { businessId } = JSON.parse(fs.readFileSync(STATE_PATH, "utf8"));
    const context = await browser.newContext({ storageState: BUSINESS_AUTH });
    const page = await context.newPage();

    const { data: before } = await admin
        .from("businesses")
        .select("description")
        .eq("id", businessId)
        .single();

    // So the checklist offers the step rather than a tick.
    await admin.from("businesses").update({ description: null }).eq("id", businessId);

    const dashboard = new RegExp(`/business/${businessId}$`);

    try {
        await page.goto(`/business/${businessId}`);
        await page.getByRole("button", { name: "Add description" }).click();

        await expect(page).toHaveURL(new RegExp(`/business/${businessId}/description$`));
        await expect(page.getByRole("heading", { name: "Describe your business", level: 1 })).toBeVisible();

        // The point of the page: nothing else to decide on it.
        // Only what is on screen: the router keeps the page they came
        // from mounted and hidden, so "main form" alone finds two.
        const describe = page.locator("main form:visible");
        await expect(describe).toHaveCount(1);
        await expect(describe.locator("#description")).toBeVisible();

        for (const field of ["Website", "Contact email", "Google review link", "Address line 1"]) {
            await expect(describe.getByLabel(field)).toHaveCount(0);
        }

        // It asks for something, so the step can't be "saved" still empty.
        await page.getByRole("button", { name: "Save description" }).click();
        await expect(page.getByText("Write a sentence or two about your business.")).toBeVisible();

        await page.locator("#description").fill("A corner bakery, open since Tuesday.");
        await page.getByRole("button", { name: "Save description" }).click();

        await expect(page).toHaveURL(dashboard);
        await expect(page.getByRole("button", { name: "Add description" })).toHaveCount(0);

        const { data: saved } = await admin
            .from("businesses")
            .select("description")
            .eq("id", businessId)
            .single();
        expect(saved!.description).toBe("A corner bakery, open since Tuesday.");

        // The address, which this business has never had — so this is also
        // the only place it can be added at all.
        await page.getByRole("button", { name: "Add address" }).click();

        await expect(page).toHaveURL(new RegExp(`/business/${businessId}/address$`));
        await expect(page.getByRole("heading", { name: "Add your address", level: 1 })).toBeVisible();

        const address = page.locator("main form:visible");
        await expect(address).toHaveCount(1);
        await expect(address.locator("#addressLine1")).toBeVisible();

        for (const field of ["Description", "Website", "Business name"]) {
            await expect(address.getByLabel(field)).toHaveCount(0);
        }

        // The city's own rules still apply, and are answered before the save.
        await page.locator("#addressLine1").fill("12 Cotham Hill");
        await page.locator("#region").selectOption("Cotham");
        await page.locator("#postalCode").fill("BA1 1AA");
        await page.getByRole("button", { name: "Save address" }).click();
        await expect(page.getByText("That postcode isn't in Bristol.")).toBeVisible();

        await page.locator("#postalCode").fill("BS6 6DF");
        await page.getByRole("button", { name: "Save address" }).click();

        await expect(page).toHaveURL(dashboard);
        await expect(page.getByRole("button", { name: "Add address" })).toHaveCount(0);

        const { data: location } = await admin
            .from("business_locations")
            .select("address_line_1, city, region, postal_code, city_id, area_id")
            .eq("business_id", businessId)
            .single();

        expect(location).toMatchObject({
            address_line_1: "12 Cotham Hill",
            city: "Bristol",
            region: "Cotham",
            postal_code: "BS6 6DF",
        });
        // The database resolved the names it was sent (see docs/MULTI-CITY.md).
        expect(location!.city_id).not.toBeNull();
        expect(location!.area_id).not.toBeNull();
    } finally {
        await admin.from("business_locations").delete().eq("business_id", businessId);
        await admin.from("businesses").update(before!).eq("id", businessId);
        await context.close();
    }
});
