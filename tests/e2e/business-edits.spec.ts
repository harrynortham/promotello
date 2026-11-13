import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import fs from "fs";

import { BUSINESS_AUTH, STATE_PATH } from "../global-setup";

// An approved business can rewrite its own page, and until now nothing
// anywhere recorded that it had
// (20261230090000_an_edit_leaves_a_trace.sql). The edit still goes
// live immediately — this is the trace it leaves behind it.

const needsMigration = "apply supabase/migrations/20261230090000_an_edit_leaves_a_trace.sql first";

function state() {
    return JSON.parse(fs.readFileSync(STATE_PATH, "utf8"));
}

const admin = () =>
    createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
        auth: { autoRefreshToken: false, persistSession: false },
    });

// A request to Supabase has no timeout of its own, and one that never
// answers would hang a poll for ever rather than being retried — which
// is how this test used to fail, with nothing to show for it. Each
// attempt gets its own stopwatch and the next one starts fresh.
async function soon<T>(work: PromiseLike<T>, fallback: T, ms = 8_000): Promise<T> {
    let timer: ReturnType<typeof setTimeout> | undefined;

    const giveUp = new Promise<T>((resolve) => {
        timer = setTimeout(() => resolve(fallback), ms);
    });

    try {
        return await Promise.race([Promise.resolve(work), giveUp]);
    } finally {
        clearTimeout(timer);
    }
}

test("what a business changes after approval is written down, and read in admin", async ({ browser }) => {
    // The business profile form and the admin page behind it are both
    // big enough that a dev server compiling them cold can take a
    // while, and this test opens one after the other.
    test.setTimeout(300_000);
    const { businessId, businessUserId } = state();
    const client = admin();
    const run = String(Date.now());

    // The same person wears both hats for this test, which is how the
    // other admin tests do it.
    await client.from("platform_admins").insert({ user_id: businessUserId });

    const { data: before } = await client
        .from("businesses")
        .select("name, description, website_url")
        .eq("id", businessId)
        .single();

    const business = await (await browser.newContext({ storageState: BUSINESS_AUTH })).newPage();

    try {
        await client.from("business_edits").delete().eq("business_id", businessId);

        // The business changes its own page, through its own form.
        await business.goto(`/business/${businessId}/edit`, { timeout: 90_000 });
        const description = business.locator("#description");
        await expect(description).toBeVisible({ timeout: 60_000 });
        await description.fill(`A description written at ${run}.`);

        // The form wants a category before it will save anything, and
        // the seeded business has never had one chosen in it. By name,
        // not by position: the last option is now "Something else",
        // which asks for words of their own instead
        // (business-categories.spec.ts).
        await business.locator("#category").selectOption({ label: "Bakeries" });

        await business.getByRole("button", { name: "Save changes" }).click({ timeout: 30_000 });

        // It is live straight away: nothing waited for us.
        await expect
            .poll(
                async () =>
                    soon(
                        client
                            .from("businesses")
                            .select("description")
                            .eq("id", businessId)
                            .single()
                            .then(({ data }) => data?.description ?? ""),
                        "",
                    ),
                { timeout: 60_000 },
            )
            .toContain(run);

        // And it left a trace of what it was before.
        const { data: edits } = await client
            .from("business_edits")
            .select("field, was, became, reviewed_at")
            .eq("business_id", businessId);

        expect(edits, needsMigration).toHaveLength(1);
        expect(edits![0].field).toBe("description");
        expect(edits![0].was).toBe(before?.description ?? null);
        expect(edits![0].became).toContain(run);
        expect(edits![0].reviewed_at, "waiting to be read").toBeNull();

        // Admin sees it, with both versions, and can mark it read.
        const platform = await (await browser.newContext({ storageState: BUSINESS_AUTH })).newPage();
        await platform.goto("/admin/businesses");
        // A Button that renders a Link is exposed as a button.
        await platform
            .getByRole("button", { name: /edited since approval/i })
            .click({ timeout: 30_000 });
        await platform.waitForURL(/\/admin\/businesses\/edits$/, { timeout: 30_000 });

        await expect(platform.getByText("Changed description", { exact: false })).toBeVisible({
            timeout: 30_000,
        });
        await expect(platform.getByText(`A description written at ${run}.`)).toBeVisible();
        await expect(platform.getByText("Approved", { exact: true }).first()).toBeVisible();

        await platform.getByRole("button", { name: "Mark as read" }).first().click({ timeout: 30_000 });
        await expect(platform.getByText(/Nothing to read/)).toBeVisible({ timeout: 30_000 });

        const { data: afterReading } = await client
            .from("business_edits")
            .select("reviewed_at")
            .eq("business_id", businessId);
        expect(afterReading!.every((row) => row.reviewed_at !== null)).toBe(true);
    } finally {
        await client
            .from("businesses")
            .update({ description: before?.description ?? null })
            .eq("id", businessId);
        await client.from("business_edits").delete().eq("business_id", businessId);
        await client.from("platform_admins").delete().eq("user_id", businessUserId);
    }
});

test("the quiet fields stay quiet, and so does a business nobody approved", async () => {
    test.setTimeout(120_000);
    const { businessId, freeBusinessId } = state();
    const client = admin();

    await client.from("business_edits").delete().eq("business_id", businessId);

    try {
        // Hours, address and links were not part of the judgement.
        await client
            .from("businesses")
            .update({ website_url: `https://example.com/${Date.now()}` })
            .eq("id", businessId);

        const { data: quiet } = await client
            .from("business_edits")
            .select("id")
            .eq("business_id", businessId);
        expect(quiet, needsMigration).toHaveLength(0);

        // A business still waiting to be read is being read in full
        // anyway, so changing it is not news.
        await client
            .from("businesses")
            .update({ approval_status: "pending", name: `E2E Pending rename ${Date.now()}` })
            .eq("id", freeBusinessId);

        const { data: pending } = await client
            .from("business_edits")
            .select("id")
            .eq("business_id", freeBusinessId);
        expect(pending).toHaveLength(0);
    } finally {
        await client.from("businesses").update({ approval_status: "approved" }).eq("id", freeBusinessId);
        await client.from("business_edits").delete().eq("business_id", businessId);
        await client.from("business_edits").delete().eq("business_id", freeBusinessId);
    }
});
