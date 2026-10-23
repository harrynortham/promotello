import { test, expect } from "@playwright/test";
import fs from "fs";
import { STATE_PATH, BUSINESS_AUTH, CUSTOMER_AUTH } from "../global-setup";

test("business sets up a loyalty card, customer joins, staff stamp it", async ({ browser }) => {
    const { businessId } = JSON.parse(fs.readFileSync(STATE_PATH, "utf8"));

    const business = await (await browser.newContext({ storageState: BUSINESS_AUTH })).newPage();
    const customer = await (await browser.newContext({ storageState: CUSTOMER_AUTH })).newPage();

    // Owner starts a programme (the test business is on Pro).
    await business.goto(`/business/${businessId}/loyalty`, { waitUntil: "networkidle" });
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

test("Free businesses are offered loyalty cards as part of Pro", async ({ browser }) => {
    const { freeBusinessId } = JSON.parse(fs.readFileSync(STATE_PATH, "utf8"));
    const page = await (await browser.newContext({ storageState: BUSINESS_AUTH })).newPage();

    await page.goto(`/business/${freeBusinessId}/loyalty`);
    await expect(page.getByText("Turn first visits into regulars")).toBeVisible();
    await expect(page.getByRole("button", { name: "Start free trial" })).toBeVisible();
});
