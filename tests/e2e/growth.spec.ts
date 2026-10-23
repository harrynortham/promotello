import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import { STATE_PATH, BUSINESS_AUTH, CUSTOMER_AUTH } from "../global-setup";
import { EVENTS_ENABLED } from "../../lib/features";

const state = () => JSON.parse(fs.readFileSync(STATE_PATH, "utf8"));
const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const options = { auth: { autoRefreshToken: false, persistSession: false } };
const admin = () => createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY!, options);

async function signedIn(email: string, password: string) {
    const client = createClient(url, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, options);
    await client.auth.signInWithPassword({ email, password });
    return client;
}

// UK weekday today, 0 = Sunday.
function londonWeekday() {
    const name = new Intl.DateTimeFormat("en-GB", { weekday: "short", timeZone: "Europe/London" }).format(new Date());
    return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(name);
}

test.describe.serial("Growth plan", () => {
    test.beforeAll(async () => {
        await admin().from("subscriptions").update({ tier: "growth" }).eq("business_id", state().businessId);
    });

    test.afterAll(async () => {
        await admin().from("subscriptions").update({ tier: "pro" }).eq("business_id", state().businessId);
    });

    test("quiet-hours vouchers can only be redeemed in their window", async ({ browser }) => {
        const { businessId, businessUserId, businessEmail, customerEmail, testPassword } = state();
        const owner = await signedIn(businessEmail, testPassword);
        const otherDay = (londonWeekday() + 3) % 7;

        const { data: offer, error } = await owner
            .from("offers")
            .insert({
                business_id: businessId,
                created_by: businessUserId,
                slug: `e2e-quiet-${Date.now()}`,
                title: "E2E Quiet Hours Offer",
                category: "Testing",
                discount: "2 for 1",
                description: "Quiet hours test.",
                availability: "Quiet hours",
                expires_at: "2030-12-31",
                terms: "For automated tests only.",
                approval_status: "pending",
                schedule_days: [otherDay],
                schedule_start: "14:00",
                schedule_end: "16:00",
            })
            .select("id")
            .single();
        expect(error).toBeNull();

        const customer = await signedIn(customerEmail, testPassword);
        const { data: claim } = await customer.rpc("redeem_offer", { requested_offer_id: offer!.id });
        const code = (claim as { redemption_code: string }).redemption_code;

        const { error: useError } = await owner.rpc("mark_redemption_used", {
            requested_redemption_id: (claim as { id: string }).id,
        });
        expect(useError?.message).toContain("set days and times");

        const staff = await (await browser.newContext({ storageState: BUSINESS_AUTH })).newPage();
        await staff.goto(`/redeem/${code}`);
        await expect(staff.getByText("Not valid right now")).toBeVisible();
        await expect(staff.getByRole("button", { name: "Mark as used" })).toHaveCount(0);
    });

    test("quiet hours need Growth", async () => {
        const { freeBusinessId, businessEmail, testPassword } = state();
        const owner = await signedIn(businessEmail, testPassword);
        const { data: offer } = await admin().from("offers").select("id").eq("business_id", freeBusinessId).limit(1).single();

        const { error } = await owner
            .from("offers")
            .update({ schedule_days: [1], schedule_start: "09:00", schedule_end: "11:00" })
            .eq("id", offer!.id);
        expect(error?.code).toBe("P0004");
    });

    test("a welcome automation gives new followers a gift staff can redeem", async ({ browser }) => {
        const { businessId, customerEmail, customerUserId, testPassword } = state();

        // The owner switches on the welcome automation.
        const owner = await (await browser.newContext({ storageState: BUSINESS_AUTH })).newPage();
        await owner.goto(`/business/${businessId}/automations`);
        await owner.locator("#welcome-reward").fill("E2E free cookie");
        await owner.locator("#welcome").getByLabel("Send this automatically").check();
        await owner.locator("#welcome").getByRole("button", { name: "Save" }).click();
        await expect(owner.locator("#welcome").getByText("Saved.")).toBeVisible({ timeout: 10_000 });

        // The customer follows (fresh follow), and the welcome is issued.
        await admin().from("business_followers").delete().eq("business_id", businessId).eq("user_id", customerUserId);
        await admin().from("reward_vouchers").delete().eq("business_id", businessId).eq("user_id", customerUserId);
        const customerClient = await signedIn(customerEmail, testPassword);
        await customerClient.from("business_followers").insert({ business_id: businessId, user_id: customerUserId });

        const { data: issued, error } = await admin().rpc("issue_automation_vouchers", {
            requested_business_id: businessId,
            requested_user_id: customerUserId,
        });
        expect(error).toBeNull();
        const gift = (issued as { code: string; kind: string }[]).find((row) => row.kind === "welcome");
        expect(gift).toBeTruthy();

        // A second run doesn't welcome them twice.
        const { data: again } = await admin().rpc("issue_automation_vouchers", {
            requested_business_id: businessId,
            requested_user_id: customerUserId,
        });
        expect(again).toEqual([]);

        // It's in their wallet...
        const customer = await (await browser.newContext({ storageState: CUSTOMER_AUTH })).newPage();
        await customer.goto("/dashboard/redemptions");
        await expect(customer.getByText("E2E free cookie").first()).toBeVisible();

        // ...and staff redeem it by scanning.
        await owner.goto(`/redeem/${gift!.code}`);
        await expect(owner.getByRole("heading", { name: "E2E free cookie" })).toBeVisible();
        await owner.getByRole("button", { name: "Mark as used" }).click();
        await expect(owner.getByText("Gift used")).toBeVisible({ timeout: 10_000 });
    });

    test("birthday treats go out on the day", async () => {
        const { businessId, customerEmail, customerUserId, testPassword } = state();
        const today = new Date(new Date().toLocaleString("en-US", { timeZone: "Europe/London" }));

        await admin().from("business_automations").upsert({
            business_id: businessId,
            kind: "birthday",
            enabled: true,
            reward: "E2E birthday cake",
        });
        const customer = await signedIn(customerEmail, testPassword);
        await customer.from("customer_birthdays").upsert({
            user_id: customerUserId,
            birth_month: today.getMonth() + 1,
            birth_day: today.getDate(),
        });

        const { data: issued } = await admin().rpc("issue_automation_vouchers", {
            requested_business_id: businessId,
            requested_user_id: null,
        });
        expect((issued as { kind: string; reward: string }[]).some((row) => row.kind === "birthday" && row.reward === "E2E birthday cake")).toBe(true);
    });

    test("events show on the business page and listing, with a story image", async ({ browser, request }) => {
        test.skip(!EVENTS_ENABLED, "Events are switched off in lib/features.ts");

        const { businessId } = state();
        const tomorrow = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);
        const title = `E2E Tasting ${Date.now()}`;

        const owner = await (await browser.newContext({ storageState: BUSINESS_AUTH })).newPage();
        await owner.goto(`/business/${businessId}/events`);
        await owner.locator("#event-title").fill(title);
        await owner.locator("#event-date").fill(tomorrow);
        await owner.locator("#event-start").fill("19:00");
        await owner.locator("#event-price").fill("£12");
        await owner.getByRole("button", { name: "Add event" }).click();
        await expect(owner.getByText("Event added")).toBeVisible({ timeout: 10_000 });

        const visitor = await (await browser.newContext()).newPage();
        await visitor.goto("/events");
        await expect(visitor.getByRole("link", { name: title })).toBeVisible();
        await visitor.goto(`/businesses/${businessId}`);
        await expect(visitor.getByRole("link", { name: title })).toBeVisible();

        const { data: event } = await admin().from("business_events").select("id").eq("title", title).single();
        const image = await request.get(`/events/${event!.id}/story-image`);
        expect(image.status()).toBe(200);
        expect(image.headers()["content-type"]).toContain("image/png");

        await admin().from("business_events").delete().eq("id", event!.id);
    });

    test("offers have an Instagram story image", async ({ request }) => {
        const { claimOfferSlug } = state();
        const image = await request.get(`/offers/${claimOfferSlug}/story-image`);
        expect(image.status()).toBe(200);
        expect(image.headers()["content-type"]).toContain("image/png");
    });

    test("monthly reports are claimed once per business per month", async () => {
        const { businessId } = state();
        // A month long past, so this can't stop a real report being sent.
        const month = "2020-01-01";

        const { data: first, error } = await admin().rpc("claim_monthly_reports", { report_month: month });
        expect(error).toBeNull();
        const ours = (first as { business_id: string; emails: string[] }[]).find((row) => row.business_id === businessId);
        expect(ours?.emails.length).toBeGreaterThan(0);

        const { data: second } = await admin().rpc("claim_monthly_reports", { report_month: month });
        expect((second as { business_id: string }[]).some((row) => row.business_id === businessId)).toBe(false);
    });

    test("events stay hidden while switched off", async ({ browser, request }) => {
        test.skip(EVENTS_ENABLED, "Events are switched on");
        const { businessId } = state();

        expect((await request.get("/events")).status()).toBe(404);

        const owner = await (await browser.newContext({ storageState: BUSINESS_AUTH })).newPage();
        await owner.goto(`/business/${businessId}`);
        await expect(owner.getByRole("navigation").getByRole("button", { name: "Events" })).toHaveCount(0);
        await expect(owner.getByRole("link", { name: "Events" })).toHaveCount(0);
    });
});
