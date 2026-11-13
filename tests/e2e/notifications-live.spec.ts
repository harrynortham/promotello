import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import fs from "fs";

import { CUSTOMER_AUTH, STATE_PATH } from "../global-setup";

// The dot, while somebody is sitting still
// (20270104090000_the_dot_appears_as_it_happens.sql).
//
// Nothing in here clicks anything between the notification being
// written and the page showing it: that is the whole test. The old
// behaviour — count again on a page change, on focus, and when the list
// says so — would pass every assertion here if a click were allowed.

const needsMigration =
    "apply supabase/migrations/20270104090000_the_dot_appears_as_it_happens.sql first";

const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
);

const state = () => JSON.parse(fs.readFileSync(STATE_PATH, "utf8"));

async function sendOne(userId: string, title: string) {
    const { data, error } = await admin
        .from("notifications")
        .insert({
            user_id: userId,
            type: "offer_approved",
            title,
            body: "Written straight into the table, the way every job in the app writes one.",
            href: "/dashboard",
        })
        .select("id")
        .single();

    expect(error, needsMigration).toBeNull();

    return data!.id as string;
}

test("the dot arrives on its own, and goes again when the list is read", async ({ browser }) => {
    test.setTimeout(300_000);
    const { customerUserId } = state();
    const sent: string[] = [];

    // A clean count to start from.
    await admin.from("notifications").delete().eq("user_id", customerUserId);

    const page = await (await browser.newContext({ storageState: CUSTOMER_AUTH })).newPage();

    try {
        await page.goto("/dashboard", { timeout: 120_000 });

        // The avatar says how many are unread; with none, it doesn't.
        const avatar = page.getByRole("button", { name: /Open account menu/ });
        await expect(avatar).toBeVisible({ timeout: 90_000 });
        await expect(avatar).not.toHaveAttribute("aria-label", /unread/);

        sent.push(await sendOne(customerUserId, "Something happened while you were reading"));

        // No click, no reload, no navigation: the socket or nothing.
        await expect(avatar).toHaveAttribute("aria-label", /1 unread notification/, {
            timeout: 30_000,
        });

        sent.push(await sendOne(customerUserId, "And another one"));
        await expect(avatar).toHaveAttribute("aria-label", /2 unread notifications/, {
            timeout: 30_000,
        });

        // Read somewhere else — another tab, or the daily job marking
        // something — and the dot comes down on its own too. Realtime
        // needs the old row to know whose update it was, which is what
        // `replica identity full` is for.
        await admin
            .from("notifications")
            .update({ read_at: new Date().toISOString() })
            .eq("user_id", customerUserId);

        await expect(avatar).not.toHaveAttribute("aria-label", /unread/, { timeout: 30_000 });
    } finally {
        await admin.from("notifications").delete().eq("user_id", customerUserId);
        void sent;
        await page.context().close();
    }
});

test("an open list adds the row as it lands", async ({ browser }) => {
    test.setTimeout(300_000);
    const { customerUserId } = state();

    await admin.from("notifications").delete().eq("user_id", customerUserId);

    const page = await (await browser.newContext({ storageState: CUSTOMER_AUTH })).newPage();

    try {
        await page.goto("/notifications", { timeout: 120_000 });
        await expect(page.getByRole("heading", { level: 1 })).toBeVisible({ timeout: 90_000 });

        const title = `Live row ${Date.now()}`;
        await sendOne(customerUserId, title);

        await expect(page.getByText(title)).toBeVisible({ timeout: 30_000 });
    } finally {
        await admin.from("notifications").delete().eq("user_id", customerUserId);
        await page.context().close();
    }
});
