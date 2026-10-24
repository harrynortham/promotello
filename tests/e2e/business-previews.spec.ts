import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import { STATE_PATH, BUSINESS_AUTH } from "../global-setup";

const options = { auth: { autoRefreshToken: false, persistSession: false } };
const admin = () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, options);
const password = "E2e-Preview-Pass-123!";

test("an admin builds a preview, and the owner claims it", async ({ browser }) => {
    const { businessUserId } = JSON.parse(fs.readFileSync(STATE_PATH, "utf8"));
    const name = `E2E Preview Bakery ${Date.now()}`;
    const ownerEmail = `e2e-preview-owner-${Date.now()}@test.internal`;
    let businessId: string | undefined;
    let ownerId: string | undefined;

    await admin().from("platform_admins").insert({ user_id: businessUserId });

    try {
        // 1. The admin builds it.
        const adminPage = await (await browser.newContext({ storageState: BUSINESS_AUTH })).newPage();
        await adminPage.goto("/admin/previews");
        await adminPage.locator("#businessName").fill(name);
        await adminPage.locator("#category option").nth(1).waitFor({ state: "attached" });
        await adminPage.locator("#category").selectOption({ index: 1 });
        await adminPage.locator("#contactName").fill("Sam");
        await adminPage.locator("#addressLine1").fill("1 Test Street");
        await adminPage.locator("#region").selectOption("Bishopston");
        await adminPage.locator("#postalCode").fill("BS7 8AA");
        await adminPage.locator("#sampleOffer").fill("Free cinnamon bun with any coffee");
        await adminPage.locator("#sampleReward").fill("a free loaf");
        await adminPage.getByRole("button", { name: "Create preview" }).click();
        await expect(adminPage.getByText(`Preview ready for ${name}`)).toBeVisible({ timeout: 15_000 });

        const { data: row } = await admin()
            .from("business_previews")
            .select("business_id, token, businesses!inner ( name, approval_status, slug )")
            .eq("businesses.name", name)
            .single();
        businessId = row!.business_id;
        const business = Array.isArray(row!.businesses) ? row!.businesses[0] : row!.businesses;
        expect(business.approval_status).toBe("pending");
        const previewPath = `/business/preview/${row!.token}`;

        // Admins checking the page aren't counted as views.
        await adminPage.goto(previewPath);
        await expect(adminPage.getByRole("heading", { name: `Hi Sam, here's ${name} on Promotello.` })).toBeVisible();

        // 2. Customers can't see it.
        const visitor = await (await browser.newContext()).newPage();
        await visitor.goto(`/businesses/${business.slug}`);
        await expect(visitor.getByRole("heading", { name: /wasn.t the discovery you had in mind/ })).toBeVisible();

        // 3. The owner opens the link, signed out.
        await visitor.goto(previewPath);
        await expect(visitor.getByRole("heading", { name: `Hi Sam, here's ${name} on Promotello.` })).toBeVisible();
        await expect(visitor.getByText("Collect 9 stamps for a free loaf")).toBeVisible();
        await expect(visitor.getByText("Free cinnamon bun with any coffee").first()).toBeVisible();

        const { data: viewed } = await admin().from("business_previews").select("view_count").eq("business_id", businessId).single();
        expect(viewed!.view_count).toBe(1);

        // 4. They sign in and claim it.
        const { data: created } = await admin().auth.admin.createUser({ email: ownerEmail, password, email_confirm: true });
        ownerId = created.user!.id;

        const owner = await (await browser.newContext()).newPage();
        await owner.goto(`/login?next=${encodeURIComponent(previewPath)}&email=${encodeURIComponent(ownerEmail)}`);
        await owner.locator("#login-password").fill(password);
        await owner.locator('button[type="submit"]').click();
        await owner.waitForURL(`**${previewPath}`);
        await owner.getByRole("button", { name: `Claim ${name}` }).first().click();
        await owner.waitForURL(`**/business/${businessId}?welcome=1`, { waitUntil: "commit" });

        // The admin has left the team; the owner got a welcome email.
        const { data: members } = await admin().from("business_members").select("user_id, role").eq("business_id", businessId);
        expect(members).toEqual([{ user_id: ownerId, role: "owner" }]);

        const { data: sends } = await admin().from("business_lifecycle_sends").select("kind").eq("business_id", businessId);
        expect(sends!.map((send) => send.kind)).toContain("welcome");

        // The link now says it's been claimed.
        await visitor.goto(previewPath);
        await expect(visitor.getByRole("heading", { name: `${name} has been claimed` })).toBeVisible();
    } finally {
        await admin().from("platform_admins").delete().eq("user_id", businessUserId);
        if (businessId) await admin().from("businesses").delete().eq("id", businessId);
        if (ownerId) await admin().auth.admin.deleteUser(ownerId);
    }
});

test("an unknown preview link shows a friendly message", async ({ page }) => {
    await page.goto("/business/preview/00000000-0000-4000-8000-000000000000");
    await expect(page.getByRole("heading", { name: "This preview isn't available" })).toBeVisible();
});
