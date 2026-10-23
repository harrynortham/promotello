import { test, expect, type Browser } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import { STATE_PATH, BUSINESS_AUTH, CUSTOMER_AUTH } from "../global-setup";

const state = () => JSON.parse(fs.readFileSync(STATE_PATH, "utf8"));
const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const options = { auth: { autoRefreshToken: false, persistSession: false } };
const admin = () => createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY!, options);
const password = "E2e-Handover-Pass-123!";

async function createUser(prefix: string) {
    const email = `e2e-${prefix}-${Date.now()}@test.internal`;
    const { data, error } = await admin().auth.admin.createUser({ email, password, email_confirm: true });
    expect(error).toBeNull();
    return { id: data.user!.id, email };
}

async function signIn(browser: Browser, email: string, next: string) {
    const page = await (await browser.newContext()).newPage();
    await page.goto(`/login?next=${encodeURIComponent(next)}&email=${encodeURIComponent(email)}`);
    await expect(page.locator("#login-email")).toHaveValue(email);
    await page.locator("#login-password").fill(password);
    await page.locator('button[type="submit"]').click();
    return page;
}

test("a business set up for someone is handed over to its owner", async ({ browser }) => {
    const { businessUserId } = state();

    // A business the test user set up "for" someone else.
    const { data: business } = await admin()
        .from("businesses")
        .insert({ name: "E2E Handover Cafe", category: "Testing", approval_status: "approved", created_by: businessUserId })
        .select("id")
        .single();
    await admin().from("business_members").insert({ business_id: business!.id, user_id: businessUserId, role: "owner" });
    const owner = await createUser("owner");

    try {
        const setter = await (await browser.newContext({ storageState: BUSINESS_AUTH })).newPage();
        await setter.goto(`/business/${business!.id}/team`);
        await setter.locator("#ownerEmail").fill(owner.email);
        await setter.getByRole("button", { name: "Send hand-over" }).click();
        await expect(setter.getByText("Hand-over ready")).toBeVisible({ timeout: 10_000 });

        const link = await setter.locator("code").first().textContent();
        const invitePath = new URL(link!).pathname;

        // The owner opens the link signed out, signs in, and accepts.
        const ownerPage = await (await browser.newContext()).newPage();
        await ownerPage.goto(invitePath);
        await expect(ownerPage.getByRole("heading", { name: "Take over E2E Handover Cafe" })).toBeVisible();

        const signedIn = await signIn(browser, owner.email, invitePath);
        await signedIn.waitForURL(`**${invitePath}`);
        await signedIn.getByRole("button", { name: "Become the owner" }).click();
        await signedIn.waitForURL(`**/business/${business!.id}?welcome=1`, { waitUntil: "commit" });

        const { data: members } = await admin()
            .from("business_members")
            .select("user_id, role")
            .eq("business_id", business!.id);
        expect(members).toEqual([{ user_id: owner.id, role: "owner" }]);
    } finally {
        await admin().from("businesses").delete().eq("id", business!.id);
        await admin().auth.admin.deleteUser(owner.id);
    }
});

test("offers from approved Pro businesses go live; Free ones wait for review", async () => {
    const { businessId, businessEmail, testPassword, businessUserId } = state();

    const owner = createClient(url, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, options);
    await owner.auth.signInWithPassword({ email: businessEmail, password: testPassword });

    const offer = (business: string, label: string) => ({
        business_id: business,
        created_by: businessUserId,
        slug: `e2e-auto-${label}-${Date.now()}`,
        title: `E2E Auto ${label}`,
        category: "Testing",
        discount: "5% off",
        description: "Auto-approval test.",
        availability: "Any time",
        expires_at: "2030-12-31",
        terms: "For automated tests only.",
        approval_status: "pending",
    });

    const { data: pro, error: proError } = await owner.from("offers").insert(offer(businessId, "pro")).select("id").single();
    expect(proError).toBeNull();
    const { data: proRow } = await admin().from("offers").select("approval_status").eq("id", pro!.id).single();
    expect(proRow!.approval_status).toBe("approved");

    // A Free business with no offers yet: its first offer waits for review.
    const { data: freeBusiness } = await admin()
        .from("businesses")
        .insert({ name: "E2E Auto Free", category: "Testing", approval_status: "approved", created_by: businessUserId })
        .select("id")
        .single();
    await admin().from("business_members").insert({ business_id: freeBusiness!.id, user_id: businessUserId, role: "owner" });

    const { data: free, error: freeError } = await owner.from("offers").insert(offer(freeBusiness!.id, "free")).select("id").single();
    expect(freeError).toBeNull();
    const { data: freeRow } = await admin().from("offers").select("approval_status").eq("id", free!.id).single();
    expect(freeRow!.approval_status).toBe("pending");

    // Owners still can't approve their own Free offers.
    const { error: selfApprove } = await owner.from("offers").update({ approval_status: "approved" }).eq("id", free!.id);
    expect(selfApprove).not.toBeNull();

    await admin().from("offers").delete().eq("id", pro!.id);
    await admin().from("businesses").delete().eq("id", freeBusiness!.id);
});

test("signed-in users skip the login and sign-up pages", async ({ browser }) => {
    const page = await (await browser.newContext({ storageState: CUSTOMER_AUTH })).newPage();
    await page.goto("/login");
    await expect(page).toHaveURL(/\/dashboard$/);
    await page.goto("/signup?next=/account");
    await expect(page).toHaveURL(/\/account$/);
});

test("customers can delete their own account", async ({ browser }) => {
    const user = await createUser("delete");

    const page = await signIn(browser, user.email, "/account/privacy");
    await page.waitForURL("**/account/privacy");
    await page.locator("#confirm-delete").fill("DELETE");
    await page.getByRole("button", { name: "Delete my account" }).click();
    await page.waitForURL((current) => current.pathname === "/", { waitUntil: "commit" });

    const { data } = await admin().auth.admin.getUserById(user.id);
    expect(data.user).toBeNull();
});

test("owners with a subscription must cancel before deleting their account", async ({ browser }) => {
    const page = await (await browser.newContext({ storageState: BUSINESS_AUTH })).newPage();
    await page.goto("/account/privacy");
    await expect(page.getByText("First, sort out these businesses")).toBeVisible();
    await expect(page.getByRole("button", { name: "Delete my account" })).toBeDisabled();
});
