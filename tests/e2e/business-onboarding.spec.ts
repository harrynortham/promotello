import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import { STATE_PATH } from "../global-setup";

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
        await page.goto("/login?next=/business/dashboard");
        await page.locator("#login-email").fill(email);
        await page.locator("#login-password").fill(password);
        await page.locator('button[type="submit"]').click();

        // No business yet: one clear next step.
        await expect(page.getByRole("heading", { name: /Let's get your business on Promotello, Jo/ })).toBeVisible({ timeout: 15_000 });
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
        await page.waitForURL(/\/business\/[0-9a-f-]+\?welcome=1/, { timeout: 15_000, waitUntil: "commit" });
        await expect(page.getByText(/Welcome to Promotello, E2E Onboarding Bakery is set up/)).toBeVisible();
        await expect(page.getByText("Get ready to go live")).toBeVisible();
        await expect(page.getByText("Add logo")).toBeVisible();
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
