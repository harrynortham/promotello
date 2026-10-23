import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import { STATE_PATH, CUSTOMER_AUTH } from "../global-setup";

const REVIEW_URL = "https://g.page/r/e2e-test/review";

test.use({ storageState: CUSTOMER_AUTH });

test("customers who used a voucher are asked for a Google review once", async ({ page }) => {
    const state = JSON.parse(fs.readFileSync(STATE_PATH, "utf8"));
    const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
        auth: { autoRefreshToken: false, persistSession: false },
    });

    // The (Pro) test business adds its review link.
    await admin.from("businesses").update({ google_review_url: REVIEW_URL }).eq("id", state.businessId);

    // The customer claims a fresh offer and staff mark it used.
    const { data: offer } = await admin
        .from("offers")
        .insert({
            business_id: state.businessId,
            created_by: state.businessUserId,
            slug: `e2e-review-${Date.now()}`,
            title: "E2E Review Test Offer",
            category: "Testing",
            discount: "5% off",
            description: "A test offer for review prompts.",
            availability: "Any time",
            expires_at: "2030-12-31",
            terms: "For automated tests only.",
            approval_status: "approved",
        })
        .select("id")
        .single();

    const customer = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
        auth: { autoRefreshToken: false, persistSession: false },
    });
    await customer.auth.signInWithPassword({ email: state.customerEmail, password: state.testPassword });
    const { data: claim } = await customer.rpc("redeem_offer", { requested_offer_id: offer!.id });
    await admin.from("offer_redemptions").update({ used_at: new Date().toISOString() }).eq("id", (claim as { id: string }).id);

    // Their dashboard asks for a review.
    await page.goto("/dashboard");
    const prompt = page.getByText("How was your visit to E2E Test Business?");
    await expect(prompt).toBeVisible();

    // The button goes through /review/<business>, which sends them to Google.
    const href = await page.getByText("Leave a Google review").first().getAttribute("href");
    expect(href).toBe(`/review/${state.businessId}?source=voucher`);
    const response = await page.request.get(href!, { maxRedirects: 0 });
    expect(response.status()).toBe(307);
    expect(response.headers()["location"]).toBe(REVIEW_URL);

    // Once they've clicked through, the prompt isn't shown again.
    await page.reload();
    await expect(prompt).toHaveCount(0);
});

test("only Google review links can be saved", async () => {
    const state = JSON.parse(fs.readFileSync(STATE_PATH, "utf8"));
    const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
        auth: { autoRefreshToken: false, persistSession: false },
    });

    const { error } = await admin
        .from("businesses")
        .update({ google_review_url: "https://example.com/review" })
        .eq("id", state.freeBusinessId);

    expect(error?.code).toBe("23514");
});
