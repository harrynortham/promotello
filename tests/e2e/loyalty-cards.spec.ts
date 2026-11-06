import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import { STATE_PATH, BUSINESS_AUTH, CUSTOMER_AUTH } from "../global-setup";

test("business sets up a loyalty card, customer joins, staff stamp it", async ({ browser }) => {
    const { businessId } = JSON.parse(fs.readFileSync(STATE_PATH, "utf8"));

    const business = await (await browser.newContext({ storageState: BUSINESS_AUTH })).newPage();
    const customer = await (await browser.newContext({ storageState: CUSTOMER_AUTH })).newPage();

    // Owner starts a programme (the test business is on Pro).
    await business.goto(`/business/${businessId}/loyalty`, { waitUntil: "networkidle" });
    // A card is named now that a business can run more than one.
    await business.locator("#card-name:visible").fill("Coffee card");
    await business.locator("#stamps-required:visible").selectOption("5");
    await business.locator("#reward:visible").fill("A free coffee");
    await business.getByRole("button", { name: "Start loyalty card" }).click();
    await expect(business.getByText("Loyalty card saved")).toBeVisible({ timeout: 10_000 });

    // Customer joins from the business page and gets a card with a code.
    await customer.goto(`/businesses/${businessId}`);
    await expect(customer.getByText("Collect 5 stamps, get a free coffee")).toBeVisible();
    await customer.getByRole("button", { name: "Join the loyalty card" }).click();
    await customer.waitForURL("**/dashboard/loyalty?joined=*", { timeout: 10_000 });
    await expect(customer.getByText("You've joined")).toBeVisible();

    const code = (await customer.locator("p.font-mono").first().textContent())?.trim() ?? "";
    expect(code).toMatch(/^[A-Z0-9]{10}$/);

    // Staff scan the card (its QR opens /stamp/<code>) and add a stamp.
    await business.goto(`/stamp/${code}`);
    await business.getByRole("button", { name: "Add a stamp" }).click();
    await expect(business.getByText("Stamp added")).toBeVisible({ timeout: 10_000 });
    await expect(business.getByText("1 of 5 stamps")).toBeVisible();

    // A second scan straight away is treated as a double scan.
    await business.getByRole("button", { name: "Add a stamp" }).click();
    await expect(business.getByText(/stamped in the last 10 minutes/)).toBeVisible({ timeout: 10_000 });

    // The customer sees their progress.
    await customer.reload();
    await expect(customer.getByText("1 of 5 stamps")).toBeVisible();
});

test("a Free business can build a loyalty card, but publishing it needs Pro", async ({ browser }) => {
    const { freeBusinessId } = JSON.parse(fs.readFileSync(STATE_PATH, "utf8"));
    const page = await (await browser.newContext({ storageState: BUSINESS_AUTH })).newPage();

    await page.goto(`/business/${freeBusinessId}/loyalty`);

    // The card is the thing being sold, so the editor is open to everyone:
    // a Free business can design one and see what it looks like.
    await expect(page.getByRole("heading", { name: "Reward your regulars" })).toBeVisible();
    await expect(page.locator("#stamps-required:visible")).toBeVisible();
    await expect(page.locator("#reward:visible")).toBeVisible();

    // Putting it in front of customers is what Pro buys.
    await expect(page.getByText(/pro feature/i)).toBeVisible();
    await expect(page.getByRole("button", { name: "Start free trial to publish" })).toBeVisible();
});

test("a visitor who isn't signed in is offered the card, not a form", async ({ page }) => {
    const { businessId } = JSON.parse(fs.readFileSync(STATE_PATH, "utf8"));

    await page.goto(`/businesses/${businessId}`);
    const loyalty = page.locator('[id^="loyalty-"]').first();
    await expect(loyalty).toBeVisible();

    // The panel's job is to make the offer. Opening with two input boxes and
    // a "Log in" link shouts louder than the thing being offered, and asks
    // for an email address before anyone has said they want a card.
    await expect(loyalty.locator("input[name=name], input[name=email]")).toHaveCount(0);
    await expect(loyalty.getByRole("link", { name: "Log in" })).toHaveCount(0);

    // Saying yes is what asks for the details.
    await loyalty.getByRole("button", { name: "Get my card" }).click();
    await expect(loyalty.locator("input[name=name]")).toBeFocused();
    await expect(loyalty.locator("input[name=email]")).toBeVisible();
    await expect(loyalty.getByRole("link", { name: "Log in" })).toBeVisible();
});

// A business can run more than one card — coffee in the morning, lunch
// at midday — and a customer chooses which to collect.
test("a second loyalty card can be made, edited and joined", async ({ browser }) => {
    test.setTimeout(120_000);

    const { businessId } = JSON.parse(fs.readFileSync(STATE_PATH, "utf8"));
    const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
        auth: { autoRefreshToken: false, persistSession: false },
    });

    const name = `E2E Lunch card ${Date.now()}`;
    let madeId: string | undefined;

    try {
        const page = await (await browser.newContext({ storageState: BUSINESS_AUTH })).newPage();

        // The first card is built on the loyalty page; another has its own.
        await page.goto(`/business/${businessId}/loyalty`);
        await expect(page.getByRole("heading", { name: "Your loyalty cards" })).toBeVisible({
            timeout: 20_000,
        });

        // The way to another leads the grid, as it does for offers and posters.
        const first = await page.evaluate(() => {
            const grid = document.querySelector("section .grid");
            return (grid?.firstElementChild?.textContent ?? "").trim();
        });
        expect(first).toContain("Add another card");

        await page.getByRole("button", { name: "Create a loyalty card" }).click();
        await page.waitForURL(`**/business/${businessId}/loyalty/new`);

        await page.locator("#card-name:visible").fill(name);
        await page.locator("#stamps-required:visible").selectOption("6");
        await page.locator("#reward:visible").fill("A free sandwich");
        await page.getByRole("button", { name: "Start this card" }).click();
        await page.waitForURL(`**/business/${businessId}/loyalty?saved=1`, { timeout: 25_000 });

        const { data: made } = await admin
            .from("loyalty_programs")
            .select("id, name, stamps_required")
            .eq("business_id", businessId)
            .eq("name", name)
            .single();
        madeId = made!.id;
        expect(made!.stamps_required).toBe(6);

        // Both cards are in the grid, each with its own way in.
        await expect(page.getByText(name)).toBeVisible();
        await page.getByRole("link", { name: "Edit card" }).first().waitFor();

        // Editing one card doesn't touch the other.
        await page.goto(`/business/${businessId}/loyalty/${madeId}/edit`);
        await expect(page.getByRole("heading", { name, level: 1 })).toBeVisible({ timeout: 20_000 });
        await page.locator("#reward:visible").fill("A free soup");
        await page.getByRole("button", { name: "Save changes" }).click();
        await page.waitForURL(`**/business/${businessId}/loyalty?saved=1`, { timeout: 25_000 });

        const { data: saved } = await admin
            .from("loyalty_programs")
            .select("reward")
            .eq("id", madeId)
            .single();
        expect(saved!.reward).toBe("A free soup");

        // A customer sees every live card on the business page.
        const visitor = await (await browser.newContext()).newPage();
        await visitor.goto(`/businesses/${businessId}`);
        await expect(visitor.locator('[id^="loyalty-"]').first()).toBeVisible({ timeout: 20_000 });
        expect(await visitor.locator('section[id^="loyalty-"]').count()).toBeGreaterThan(1);
        await expect(visitor.getByText(name)).toBeVisible();
    } finally {
        if (madeId) await admin.from("loyalty_programs").delete().eq("id", madeId);
    }
});
