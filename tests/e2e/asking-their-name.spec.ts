import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import fs from "fs";

import { STATE_PATH } from "../global-setup";
import { signInWithCode } from "../sign-in";

// Nobody is asked their name at /signup — a business owner is asked at
// /business/register instead — so an account that started by claiming a
// voucher has none, and every email we send it opens with nothing.
//
// Two places ask now, and the whole design is about where they are not:
// claiming an offer ends on the offer's page and joining a card ends on
// the card, so neither passes through the dashboard.

const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
);

async function nameless(label: string) {
    const email = `e2e_${label}_${Date.now()}@test.internal`;

    const { data, error } = await admin.auth.admin.createUser({
        email,
        email_confirm: true,
        // No user_metadata at all: the state /signup leaves somebody in.
    });

    expect(error).toBeNull();

    return { email, userId: data.user!.id };
}

test("the dashboard asks, and takes no for an answer on every device", async ({ page }) => {
    test.setTimeout(240_000);
    const { email, userId } = await nameless("name");

    try {
        await signInWithCode(page, email, "/dashboard");

        const asking = page.getByRole("heading", { name: "What should we call you?" });
        await expect(asking).toBeVisible({ timeout: 90_000 });

        // With no name, the page greets nobody.
        await expect(page.getByRole("heading", { name: "Welcome back", level: 1 })).toBeVisible();

        await page.getByPlaceholder("Your name").fill("Nel Archer");
        await page.getByRole("button", { name: "Save" }).click();

        // Gone, and the page now knows who they are.
        await expect(asking).toHaveCount(0, { timeout: 30_000 });
        await expect(page.getByRole("heading", { name: "Hi Nel", level: 1 })).toBeVisible({
            timeout: 30_000,
        });

        const { data: saved } = await admin.auth.admin.getUserById(userId);
        expect(saved.user?.user_metadata?.full_name).toBe("Nel Archer");

        // And it stays gone.
        await page.reload();
        await expect(page.getByRole("heading", { name: "Hi Nel", level: 1 })).toBeVisible({
            timeout: 60_000,
        });
        await expect(asking).toHaveCount(0);
    } finally {
        await admin.auth.admin.deleteUser(userId);
    }
});

test("skipping it is remembered on the account, not in the browser", async ({ browser }) => {
    test.setTimeout(240_000);
    const { email, userId } = await nameless("skip");

    try {
        const first = await (await browser.newContext()).newPage();
        await signInWithCode(first, email, "/dashboard");

        const asking = first.getByRole("heading", { name: "What should we call you?" });
        await expect(asking).toBeVisible({ timeout: 90_000 });

        await first.getByRole("button", { name: "Not now" }).click();
        await expect(asking).toHaveCount(0, { timeout: 30_000 });

        const { data: skipped } = await admin.auth.admin.getUserById(userId);
        expect(skipped.user?.user_metadata?.name_asked_at, "written on the account").toBeTruthy();
        expect(skipped.user?.user_metadata?.full_name, "and no name invented").toBeFalsy();

        // Another browser, same person: not asked twice.
        const second = await (await browser.newContext()).newPage();
        await signInWithCode(second, email, "/dashboard");
        await expect(second.getByRole("heading", { name: "Welcome back", level: 1 })).toBeVisible({
            timeout: 90_000,
        });
        await expect(second.getByRole("heading", { name: "What should we call you?" })).toHaveCount(0);
    } finally {
        await admin.auth.admin.deleteUser(userId);
    }
});

// The constraint this was built around.
test("claiming an offer and joining a card are never interrupted by it", async ({ page }) => {
    test.setTimeout(300_000);
    const { claimOfferSlug } = JSON.parse(fs.readFileSync(STATE_PATH, "utf8"));
    const { email, userId } = await nameless("claim");

    try {
        await signInWithCode(page, email, `/offers/${claimOfferSlug}`);
        await expect(page.getByRole("heading", { level: 1 })).toBeVisible({ timeout: 90_000 });

        // Signing in landed them on the offer, as it should, and
        // nothing is standing between them and claiming it.
        await expect(page).toHaveURL(new RegExp(`/offers/${claimOfferSlug}`));
        await expect(page.getByRole("heading", { name: "What should we call you?" })).toHaveCount(0);

        const claim = page.getByRole("button", { name: "Get this deal" }).first();
        await expect(claim).toBeVisible({ timeout: 30_000 });
        await claim.click();

        // Claimed, still on the offer, still not asked anything.
        await expect(page.getByText("Your claimed voucher")).toBeVisible({ timeout: 60_000 });
        await expect(page.getByRole("heading", { name: "What should we call you?" })).toHaveCount(0);
    } finally {
        await admin.auth.admin.deleteUser(userId);
    }
});

test("a customer opening a business is asked for a name, once", async ({ page }) => {
    test.setTimeout(300_000);
    const { email, userId } = await nameless("owner");

    try {
        await signInWithCode(page, email, "/business/setup/new");

        // The screen that had never asked: no name on the account, so
        // it is the first thing on it.
        await expect(page.locator("#yourName")).toBeVisible({ timeout: 90_000 });
        await expect(page.getByRole("heading", { name: "Let's get you set up." })).toBeVisible();

        await page.locator("#yourName").fill("Nel Archer");
        await page.locator("#businessName").fill("E2E Nameless Owner");
        await page.locator("#category").selectOption({ label: "Bakeries" });
        await page.getByRole("button", { name: "Add my business" }).click();

        await page.waitForURL(/\/business\/setup\/[0-9a-f-]+\?welcome=1/, {
            timeout: 30_000,
            waitUntil: "commit",
        });

        const { data: saved } = await admin.auth.admin.getUserById(userId);
        expect(saved.user?.user_metadata?.full_name).toBe("Nel Archer");

        // Asked once: the next business they open already knows them.
        await page.goto("/business/setup/new", { timeout: 90_000 });
        await expect(page.getByRole("heading", { name: /Let's get you set up, Nel/ })).toBeVisible({
            timeout: 60_000,
        });
        await expect(page.locator("#yourName")).toHaveCount(0);
    } finally {
        await admin.from("businesses").delete().eq("created_by", userId);
        await admin.auth.admin.deleteUser(userId);
    }
});
