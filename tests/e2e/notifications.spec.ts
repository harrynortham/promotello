import { test, expect, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import { BUSINESS_AUTH, CUSTOMER_AUTH, STATE_PATH } from "../global-setup";

// The in-app list, the dot on the avatar, and the three things somebody
// does to a notification. Rows are seeded with the service role, because
// nothing in the browser is allowed to insert one.

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const options = { auth: { autoRefreshToken: false, persistSession: false } };
const admin = () => createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY!, options);
const state = () => JSON.parse(fs.readFileSync(STATE_PATH, "utf8"));

type Seed = {
    title: string;
    body?: string;
    href?: string | null;
    read?: boolean;
    minutesAgo?: number;
};

// Every test starts from a known list: other specs claim offers and
// approve things, and each of those tells somebody.
async function only(userId: string, rows: Seed[] = []) {
    const client = admin();
    const { error: cleared } = await client.from("notifications").delete().eq("user_id", userId);
    expect(cleared).toBeNull();

    if (rows.length === 0) return;

    const { error } = await client.from("notifications").insert(
        rows.map((row, index) => ({
            user_id: userId,
            type: "offer_approved",
            title: row.title,
            body: row.body ?? null,
            href: row.href === undefined ? "/dashboard/redemptions" : row.href,
            read_at: row.read ? new Date().toISOString() : null,
            created_at: new Date(Date.now() - (row.minutesAgo ?? index + 1) * 60_000).toISOString(),
            dedupe_key: `e2e-notification-${Date.now()}-${index}`,
        })),
    );
    expect(error).toBeNull();
}

async function unreadInTheDatabase(userId: string) {
    const { count } = await admin()
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .is("read_at", null);
    return count ?? 0;
}

const trigger = (page: Page) => page.getByRole("button", { name: /Open account menu/ });
const dot = (page: Page) => page.locator('[data-slot="unread-dot"]');
const rows = (page: Page) => page.locator('[data-slot="notification"]');

test.describe("the dot and the menu", () => {
    test.use({ storageState: CUSTOMER_AUTH });

    test("nothing unread shows no dot, and one unread shows the dot and the count", async ({ page }) => {
        const { customerUserId } = state();

        await only(customerUserId, [{ title: "E2E read notification", read: true }]);
        await page.goto("/dashboard");
        await expect(trigger(page)).toBeVisible({ timeout: 15_000 });
        await expect(dot(page)).toHaveCount(0);

        await trigger(page).click();
        // The accessible name carries the pill, so an exact name is the
        // way to say "no pill".
        await expect(page.getByRole("menuitem", { name: "Notifications", exact: true })).toBeVisible();
        await page.keyboard.press("Escape");

        await only(customerUserId, [{ title: "E2E unread notification" }]);
        await page.reload();

        await expect(dot(page)).toBeVisible({ timeout: 15_000 });
        await expect(trigger(page)).toHaveAttribute("aria-label", /1 unread notification$/);

        await trigger(page).click();
        await expect(page.getByRole("menuitem", { name: /^Notifications 1$/ })).toBeVisible();
        await expect(page.locator('[data-slot="unread-count"]')).toHaveText("1");
    });
});

test("the same person sees the same dot on both sides of the site", async ({ browser }) => {
    const { businessUserId, businessId } = state();

    await only(businessUserId, [{ title: "E2E both sides", href: `/business/${businessId}/offers` }]);

    const page = await (await browser.newContext({ storageState: BUSINESS_AUTH })).newPage();

    for (const path of ["/dashboard", `/business/${businessId}`]) {
        await page.goto(path);
        await expect(dot(page), `the dot on ${path}`).toBeVisible({ timeout: 15_000 });
        await expect(trigger(page), `the count on ${path}`).toHaveAttribute("aria-label", /1 unread notification$/);
    }
});

test.describe.serial("the list", () => {
    test.use({ storageState: CUSTOMER_AUTH });

    test("newest first, and only the unread ones are marked", async ({ page }) => {
        const { customerUserId } = state();

        await only(customerUserId, [
            { title: "E2E newest", minutesAgo: 1 },
            { title: "E2E middle", minutesAgo: 60, read: true },
            { title: "E2E oldest", minutesAgo: 60 * 48 },
        ]);

        await page.goto("/notifications");
        await expect(page.getByRole("heading", { name: "Notifications", level: 1 })).toBeVisible();

        await expect(rows(page).nth(0)).toContainText("E2E newest");
        await expect(rows(page).nth(1)).toContainText("E2E middle");
        await expect(rows(page).nth(2)).toContainText("E2E oldest");

        // Not colour alone, and not everything.
        await expect(page.getByText("Unread")).toHaveCount(2);
        await expect(page.getByText("E2E newest", { exact: true })).toHaveClass(/font-semibold/);
        await expect(page.getByText("E2E middle", { exact: true })).not.toHaveClass(/font-semibold/);

        // UK time, and a date once it is old enough for one.
        await expect(rows(page).nth(1)).toContainText("hour ago");
        await expect(rows(page).nth(2)).toContainText("2 days ago");
    });

    test("opening one marks it read, and the last one takes the dot with it", async ({ page }) => {
        const { customerUserId } = state();

        await only(customerUserId, [{ title: "E2E click me", href: "/dashboard/redemptions" }]);

        await page.goto("/notifications");
        await expect(dot(page)).toBeVisible();

        await page.getByRole("link", { name: /E2E click me/ }).click();
        await expect(page).toHaveURL(/\/dashboard\/redemptions/);

        await page.goto("/notifications");
        await expect(page.getByText("E2E click me")).toBeVisible();
        await expect(page.getByText("Unread")).toHaveCount(0);
        // No reload: the dot above the list agrees with the list.
        await expect(dot(page)).toHaveCount(0);
        expect(await unreadInTheDatabase(customerUserId)).toBe(0);
    });

    test("a notification with nowhere to go has a button instead", async ({ page }) => {
        const { customerUserId } = state();

        await only(customerUserId, [{ title: "E2E nowhere to go", href: null }]);

        await page.goto("/notifications");
        await expect(page.getByRole("link", { name: /E2E nowhere to go/ })).toHaveCount(0);

        await page.getByRole("button", { name: "Mark as read" }).click();
        await expect(page.getByText("Unread")).toHaveCount(0);
        await expect(dot(page)).toHaveCount(0);

        await expect(async () => {
            expect(await unreadInTheDatabase(customerUserId)).toBe(0);
        }).toPass({ timeout: 10_000 });
    });

    test("mark all as read clears the lot", async ({ page }) => {
        const { customerUserId } = state();

        await only(customerUserId, [
            { title: "E2E all one" },
            { title: "E2E all two" },
            { title: "E2E all three", href: null },
        ]);

        await page.goto("/notifications");
        await expect(page.getByText("Unread")).toHaveCount(3);

        await page.getByRole("button", { name: "Mark all as read" }).click();
        await expect(page.getByText("Unread")).toHaveCount(0);
        await expect(page.getByRole("button", { name: "Mark all as read" })).toHaveCount(0);
        await expect(dot(page)).toHaveCount(0);

        await page.reload();
        await expect(page.getByText("E2E all two")).toBeVisible();
        await expect(page.getByText("Unread")).toHaveCount(0);
    });

    test("deleting one is permanent", async ({ page }) => {
        const { customerUserId } = state();

        await only(customerUserId, [{ title: "E2E delete me" }, { title: "E2E keep me" }]);

        await page.goto("/notifications");
        await page.getByRole("button", { name: "Delete notification: E2E delete me" }).click();

        await expect(page.getByText("E2E delete me")).toHaveCount(0);
        await expect(page.getByText("E2E keep me")).toBeVisible();

        await page.reload();
        await expect(page.getByText("E2E delete me")).toHaveCount(0);
        await expect(page.getByText("E2E keep me")).toBeVisible();
    });

    test("an empty list says what will arrive", async ({ page }) => {
        await only(state().customerUserId);

        await page.goto("/notifications");
        await expect(page.getByText(/Nothing yet\./)).toBeVisible();
        await expect(page.getByRole("button", { name: "Mark all as read" })).toHaveCount(0);
    });
});

// The whole way through: an admin approves an offer and the business's
// owner is told, in the app, beside the email they already get.
test("approving an offer tells the business in the app", async ({ browser }) => {
    const { businessUserId, businessId } = state();
    const client = admin();
    const title = `E2E Notified Offer ${Date.now()}`;

    await only(businessUserId);
    await client.from("platform_admins").insert({ user_id: businessUserId });

    const { data: offer } = await client
        .from("offers")
        .insert({
            business_id: businessId,
            created_by: businessUserId,
            slug: `e2e-notified-${Date.now()}`,
            title,
            category: "Testing",
            discount: "10% off",
            description: "An offer for the notification test.",
            availability: "Any time",
            expires_at: "2030-12-31",
            terms: "For automated tests only.",
            approval_status: "pending",
            redemption_count: 0,
        })
        .select("id")
        .single();

    try {
        const page = await (await browser.newContext({ storageState: BUSINESS_AUTH })).newPage();
        await page.goto("/admin/offers");

        const card = page.locator('[data-slot="card"]', { hasText: title });
        await expect(card).toBeVisible({ timeout: 15_000 });
        await card.getByRole("button", { name: "Approve", exact: true }).click();
        await page.getByRole("button", { name: "Approve offer" }).click();

        // Telling the business happens in the same click as the
        // approval, and the queue only lets go once it has: leaving the
        // page before that cancels the server action mid-sentence.
        await expect(page.getByRole("dialog")).toBeHidden({ timeout: 20_000 });
        await expect(card).toHaveCount(0);

        await page.goto("/notifications");
        const row = rows(page).filter({ hasText: title });
        await expect(row).toBeVisible({ timeout: 15_000 });
        await expect(row.getByText("Unread")).toBeVisible();

        // It goes where the business would want to go.
        await row.getByRole("link").first().click();
        await expect(page).toHaveURL(new RegExp(`/business/${businessId}/offers`));
    } finally {
        if (offer) await client.from("offers").delete().eq("id", offer.id);
        await client.from("platform_admins").delete().eq("user_id", businessUserId);
        await only(businessUserId);
    }
});
