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

    // Their wallet lists it, and opening it shows the QR code for staff
    // to scan. The list itself only carries the code and a way in.
    const customer = await (await browser.newContext({ storageState: CUSTOMER_AUTH })).newPage();
    await customer.goto("/dashboard/redemptions");
    await customer.getByRole("link", { name: /Show QR code/ }).first().click();
    await customer.waitForURL(/\/dashboard\/redemptions\/[0-9a-f-]+$/);
    await expect(customer.getByRole("img", { name: "Voucher QR code for staff to scan" }).first()).toBeVisible();

    // Staff scan it: the QR opens /redeem/<code>.
    const staff = await (await browser.newContext({ storageState: BUSINESS_AUTH })).newPage();
    await staff.goto(`/redeem/${code}`);
    await expect(staff.getByRole("heading", { name: "E2E Scan Test Offer" })).toBeVisible();
    await staff.getByRole("button", { name: "Mark as used" }).click();
    await expect(staff.getByText("Voucher used")).toBeVisible({ timeout: 10_000 });

    // What somebody at a till needs in that second is the discount, at a
    // size they can read with a queue behind them — not a note that a row
    // was updated.
    await expect(staff.getByText("10% off", { exact: true })).toBeVisible();
    await expect(staff.getByText(/voucher used here today|vouchers used here today/)).toBeVisible();

    // The business is on Pro, so it isn't sold anything.
    await expect(staff.getByRole("link", { name: "Try Pro free" })).toHaveCount(0);

    // Scanning again warns instead of offering the button.
    await staff.goto(`/redeem/${code}`);
    await expect(staff.getByText("Already used")).toBeVisible();
    await expect(staff.getByRole("button", { name: "Mark as used" })).toHaveCount(0);
});

// The camera, for staff already on the redemptions page with a phone.
// Whether it opens depends on the device, so what is checked here is
// that asking for it says something either way.
test("a voucher can be scanned from the redemptions page", async ({ browser }) => {
    const { businessId } = JSON.parse(fs.readFileSync(STATE_PATH, "utf8"));

    // This file signs in per test rather than for the whole file.
    const page = await (await browser.newContext({ storageState: BUSINESS_AUTH })).newPage();
    await page.goto(`/business/${businessId}/redemptions`);
    await expect(page.getByRole("button", { name: "Scan a voucher" })).toBeVisible({
        timeout: 20_000,
    });

    await page.getByRole("button", { name: "Scan a voucher" }).click();

    const scanner = page.getByRole("dialog");
    await expect(scanner.getByText("Scan the customer's voucher")).toBeVisible();

    const viewfinder = await scanner.locator("video").count();
    const refused = await scanner.getByText(/camera/i).count();
    expect(viewfinder + refused).toBeGreaterThan(0);

    // Typing a code by hand is still there underneath.
    await page.keyboard.press("Escape");
    await expect(page.getByText(/No camera to hand/)).toBeVisible();
});

// The picture in the confirmation email. The card on the offer page draws
// its QR in the browser, which an email can't do — so staff scanning the
// email are scanning this.
test("the voucher QR in the email scans, and only a code draws one", async ({ request }) => {
    const code = "5280613F90";
    const image = await request.get(`/redeem/${code}/qr`);

    expect(image.status()).toBe(200);
    expect(image.headers()["content-type"]).toBe("image/png");
    expect(image.headers()["cache-control"]).toContain("max-age=31536000");

    const [{ default: jsQR }, { default: sharp }] = await Promise.all([import("jsqr"), import("sharp")]);
    const { data, info } = await sharp(await image.body())
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });

    const scanned = jsQR(new Uint8ClampedArray(data), info.width, info.height);

    expect(scanned, "the picture scans").not.toBeNull();
    expect(scanned!.data, "and opens the voucher").toMatch(new RegExp(`/redeem/${code}$`));

    // Not a code: nothing is drawn. The route takes a voucher code, not
    // anything somebody would like a branded QR of.
    expect((await request.get("/redeem/not-a-code/qr")).status()).toBe(404);
    expect((await request.get("/redeem/12345/qr")).status()).toBe(404);
});
