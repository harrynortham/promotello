import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import { STATE_PATH, BUSINESS_AUTH } from "../global-setup";

test.use({ storageState: BUSINESS_AUTH });

test("business owner can create a QR code, print its poster and see scans", async ({ page, request }) => {
    const { businessId } = JSON.parse(fs.readFileSync(STATE_PATH, "utf8"));

    await page.goto(`/business/${businessId}/qr`);
    await page.locator("#qr-label").fill("Front window");
    await page.getByRole("button", { name: "Create QR code" }).click();

    await expect(page.getByText("QR code created")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole("heading", { name: "Front window" })).toBeVisible();

    // The short link printed on the poster.
    const link = await page.locator('a[href*="/q/"]').first().getAttribute("href");
    expect(link).toMatch(/\/q\/[a-z0-9]{8}$/);

    // A scan redirects to the business page, tagged as a QR visit.
    const scan = await request.get(new URL(link!).pathname, { maxRedirects: 0 });
    expect(scan.status()).toBe(307);
    expect(scan.headers()["location"]).toContain(`/businesses/${businessId}?ref=qr`);

    await page.reload();
    const stats = page.locator("dl").first();
    await expect(stats.getByText("7 days")).toBeVisible();
    await expect(stats.locator("dd").first()).toHaveText("1");

    // The printable poster shows the code and a print button.
    const posterHref = await page.getByText("Print poster").first().getAttribute("href");
    await page.goto(posterHref!);
    await expect(page.getByText("Point your phone camera here")).toBeVisible();
    await expect(page.getByRole("button", { name: "Print or save as PDF" })).toBeVisible();
});

test("the database limits Free businesses to one QR code", async () => {
    const state = JSON.parse(fs.readFileSync(STATE_PATH, "utf8"));

    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
        { auth: { autoRefreshToken: false, persistSession: false } },
    );
    await supabase.auth.signInWithPassword({ email: state.businessEmail, password: state.testPassword });

    const insert = (label: string) =>
        supabase.from("qr_codes").insert({
            business_id: state.freeBusinessId,
            label,
            created_by: state.businessUserId,
        });

    expect((await insert("Till")).error).toBeNull();
    expect((await insert("Table tent")).error?.code).toBe("P0004");
});
