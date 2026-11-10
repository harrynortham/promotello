import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import fs from "fs";

import { CUSTOMER_AUTH, STATE_PATH } from "../global-setup";

// The customer area carries at most one suggestion at a time. The first is
// the birthday nudge, which exists because the field is in account
// settings where nobody goes, and nothing said why it was worth filling in.

const state = () => JSON.parse(fs.readFileSync(STATE_PATH, "utf8"));
const admin = () =>
    createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
        auth: { autoRefreshToken: false, persistSession: false },
    });

// Whatever an earlier run left: no birthday, nothing dismissed.
async function startFresh(userId: string) {
    await admin().from("customer_birthdays").delete().eq("user_id", userId);
    await admin().auth.admin.updateUserById(userId, { user_metadata: { dismissed_announcements: [] } });
}

test("the nudge asks for a birthday, saves it, and then goes away", async ({ browser }) => {
    const { customerUserId } = state();
    await startFresh(customerUserId);

    const page = await (await browser.newContext({ storageState: CUSTOMER_AUTH })).newPage();
    await page.goto("/dashboard");

    const bar = page.getByRole("complementary", { name: "Suggestion" });
    await expect(bar).toContainText("Get a birthday treat");

    await bar.getByRole("button", { name: "Add your birthday" }).click();

    // A day the month doesn't have is caught before it can be saved.
    await page.selectOption("#announcement-birth-day", "30");
    await page.selectOption("#announcement-birth-month", "2");
    await expect(page.getByText("That date doesn't exist.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Save" })).toBeDisabled();

    await page.selectOption("#announcement-birth-month", "7");
    await page.getByRole("button", { name: "Save" }).click();

    await expect(bar).toHaveCount(0);

    // The day and the month, and no year: a treat doesn't need an age.
    await expect
        .poll(async () => {
            const { data } = await admin()
                .from("customer_birthdays")
                .select("birth_month, birth_day")
                .eq("user_id", customerUserId)
                .maybeSingle();
            return data;
        })
        .toEqual({ birth_month: 7, birth_day: 30 });

    await page.reload();
    await expect(bar).toHaveCount(0);
});

test("saying not now is remembered on the next visit", async ({ browser }) => {
    const { customerUserId } = state();
    await startFresh(customerUserId);

    const page = await (await browser.newContext({ storageState: CUSTOMER_AUTH })).newPage();
    await page.goto("/dashboard");

    const bar = page.getByRole("complementary", { name: "Suggestion" });
    await expect(bar).toBeVisible();

    await bar.getByRole("button", { name: "Dismiss this suggestion" }).click();
    await expect(bar).toHaveCount(0);

    // The bar hides at once and saves behind it, so wait for the save
    // before asking what another browser would see.
    await expect
        .poll(async () => {
            const { data } = await admin().auth.admin.getUserById(customerUserId);
            return data.user?.user_metadata?.dismissed_announcements ?? [];
        })
        .toContain("add-birthday");

    // Kept on the account rather than the device, so a different browser
    // doesn't start asking again.
    const elsewhere = await (await browser.newContext({ storageState: CUSTOMER_AUTH })).newPage();
    await elsewhere.goto("/dashboard");
    await expect(elsewhere.getByRole("heading", { name: /Welcome back|Hi / })).toBeVisible();
    await expect(elsewhere.getByRole("complementary", { name: "Suggestion" })).toHaveCount(0);

    await startFresh(customerUserId);
});

// Stacked on a phone, the close used to sit in the bottom row beside
// "Add your birthday", where it reads as a second thing to press.
test("on a phone the close is in the corner, not beside the button", async ({ browser }) => {
    const { customerUserId } = state();
    await startFresh(customerUserId);

    const page = await (
        await browser.newContext({ storageState: CUSTOMER_AUTH, viewport: { width: 390, height: 844 } })
    ).newPage();
    await page.goto("/dashboard");

    const bar = page.getByRole("complementary", { name: "Suggestion" });
    await expect(bar).toBeVisible({ timeout: 20_000 });

    const barBox = (await bar.boundingBox())!;
    const close = (await bar.getByRole("button", { name: "Dismiss this suggestion" }).boundingBox())!;
    const action = (await bar.getByRole("button", { name: "Add your birthday" }).boundingBox())!;

    // Tucked into the top right.
    expect(barBox.x + barBox.width - (close.x + close.width), "from the right").toBeLessThanOrEqual(16);
    expect(close.y - barBox.y, "from the top").toBeLessThanOrEqual(16);

    // And nowhere near the button at the bottom.
    expect(close.y + close.height, "above the button entirely").toBeLessThan(action.y);

    // Still big enough to hit.
    expect(Math.min(close.width, close.height)).toBeGreaterThanOrEqual(40);

    await page.close();
});
