import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import { STATE_PATH, BUSINESS_AUTH, CUSTOMER_AUTH } from "../global-setup";

test("staff scan a customer's voucher and mark it used once", async ({ browser }) => {
    const state = JSON.parse(fs.readFileSync(STATE_PATH, "utf8"));

    // A fresh offer for this test (the test business is on Pro).
    const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
        auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data: offer, error: offerError } = await admin
        .from("offers")
        .insert({
            business_id: state.businessId,
            created_by: state.businessUserId,
            slug: `e2e-scan-${Date.now()}`,
            title: "E2E Scan Test Offer",
            category: "Testing",
            discount: "10% off",
            description: "A test offer for scan-to-redeem.",
            availability: "Any time",
            expires_at: "2030-12-31",
            terms: "For automated tests only.",
            approval_status: "approved",
        })
        .select("id")
        .single();
    expect(offerError).toBeNull();

    // The customer claims it.
    const customerClient = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
        auth: { autoRefreshToken: false, persistSession: false },
    });
    await customerClient.auth.signInWithPassword({ email: state.customerEmail, password: state.testPassword });
    const { data: claim, error: claimError } = await customerClient.rpc("redeem_offer", { requested_offer_id: offer!.id });
    expect(claimError).toBeNull();
    const code = (claim as { redemption_code: string }).redemption_code;

    // Their voucher shows a QR code for staff to scan.
    const customer = await (await browser.newContext({ storageState: CUSTOMER_AUTH })).newPage();
    await customer.goto("/dashboard/redemptions");
    await expect(customer.getByRole("img", { name: "Voucher QR code for staff to scan" }).first()).toBeVisible();

    // Staff scan it: the QR opens /redeem/<code>.
    const staff = await (await browser.newContext({ storageState: BUSINESS_AUTH })).newPage();
    await staff.goto(`/redeem/${code}`);
    await expect(staff.getByRole("heading", { name: "E2E Scan Test Offer" })).toBeVisible();
    await staff.getByRole("button", { name: "Mark as used" }).click();
    await expect(staff.getByText("Voucher used")).toBeVisible({ timeout: 10_000 });

    // Scanning again warns instead of offering the button.
    await staff.goto(`/redeem/${code}`);
    await expect(staff.getByText("Already used")).toBeVisible();
    await expect(staff.getByRole("button", { name: "Mark as used" })).toHaveCount(0);
});
