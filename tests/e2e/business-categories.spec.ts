import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import fs from "fs";

import { BUSINESS_AUTH, STATE_PATH } from "../global-setup";
import { signInWithCode } from "../sign-in";

// A business the list has nothing for
// (20261231090000_a_business_we_have_no_category_for.sql). It says what
// it is in its own words, goes live on those words, and is given a
// category when we read it over.

const needsMigration =
    "apply supabase/migrations/20261231090000_a_business_we_have_no_category_for.sql first";

const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
);

// A request to Supabase has no timeout of its own, and one that never
// answers would hang a poll for ever rather than being retried. Each
// attempt gets its own stopwatch (as in business-edits.spec.ts).
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

test("a business nothing on the list fits says what it is, and is shelved later", async ({ page }) => {
    // The signup form, the admin list and the queue behind it are three
    // pages a cold dev server has to compile in turn.
    test.setTimeout(300_000);

    const said = "tattoo studio";
    const email = `e2e_no_category_${Date.now()}@test.internal`;
    const { data: created, error } = await admin.auth.admin.createUser({
        email,
        email_confirm: true,
        user_metadata: { full_name: "Nel Archer" },
    });
    expect(error).toBeNull();
    const userId = created.user!.id;

    // A real shelf to put them on at the end.
    const { data: bakeries } = await admin
        .from("categories")
        .select("id, name")
        .eq("name", "Bakeries")
        .not("parent_id", "is", null)
        .single();

    try {
        await signInWithCode(page, email, "/business/setup/new");

        await expect(page.getByRole("heading", { name: /Let's get you set up, Nel/ })).toBeVisible({
            timeout: 60_000,
        });
        await page.locator("#businessName").fill("E2E Tattoo Studio");

        // Nothing is asked until somebody says none of the list is them.
        await expect(page.locator("#otherCategory")).toHaveCount(0);
        await page.locator("#category").selectOption({ label: "Something else" });
        await expect(page.locator("#otherCategory")).toBeVisible();

        // And then it is asked for properly: no business goes through
        // with "Something else" and nothing else.
        await page.getByRole("button", { name: "Add my business" }).click();
        await expect(page.getByText("Tell us in a few words what you do.")).toBeVisible();

        const { count: early } = await admin
            .from("businesses")
            .select("id", { count: "exact", head: true })
            .eq("created_by", userId);
        expect(early).toBe(0);

        await page.locator("#otherCategory").fill(said);
        await page.getByRole("button", { name: "Add my business" }).click();

        await page.waitForURL(/\/business\/setup\/[0-9a-f-]+\?welcome=1/, {
            timeout: 30_000,
            waitUntil: "commit",
        });
        const businessId = page.url().match(/setup\/([0-9a-f-]+)/)![1];

        // Their words are kept, and no category is guessed for them.
        const { data: made } = await admin
            .from("businesses")
            .select("category, category_id, approval_status")
            .eq("id", businessId)
            .single();

        expect(made?.category).toBe(said);
        expect(made?.category_id, "nothing on the list was picked for them").toBeNull();
        expect(made?.approval_status, "and nothing is blocked by it").toBe("pending");

        // Their page says it. Approve them so the page is public, the
        // way a business that gets this far would be read and approved.
        await admin
            .from("businesses")
            .update({ approval_status: "approved", description: "E2E ink." })
            .eq("id", businessId);

        const { data: withSlug } = await admin
            .from("businesses")
            .select("slug")
            .eq("id", businessId)
            .single();

        // Their own words, on the badge where a category goes. Exact,
        // because the business is called "E2E Tattoo Studio" and a
        // loose match would find its own name in the header.
        await page.goto(`/businesses/${withSlug!.slug}`, { timeout: 90_000 });
        await expect(page.getByText(said, { exact: true })).toBeVisible({ timeout: 60_000 });

        // The same person puts their admin hat on, the way the other
        // admin tests do it.
        await admin.from("platform_admins").insert({ user_id: userId });

        await page.goto("/admin/businesses", { timeout: 90_000 });
        // A Button that renders a Link is exposed as a button.
        await page
            .getByRole("button", { name: /without a category/i })
            .click({ timeout: 60_000 });
        await page.waitForURL(/\/admin\/businesses\/categories$/, { timeout: 30_000 });

        // The queue holds more than this one business, so everything
        // here is scoped to the form carrying its id.
        const row = page.locator(`form:has(input[value="${businessId}"])`);
        await expect(row, needsMigration).toHaveCount(1, { timeout: 60_000 });
        await expect(page.getByText(`“${said}”`).first()).toBeVisible();
        await expect(page.getByText("E2E Tattoo Studio")).toBeVisible();

        await row.locator("select").selectOption({ label: "Bakeries" });
        await row.getByRole("button", { name: "Save" }).click();

        // Shelved, and the stand-in words replaced by the category's.
        await expect(row).toHaveCount(0, { timeout: 60_000 });

        const { data: shelved } = await admin
            .from("businesses")
            .select("category, category_id")
            .eq("id", businessId)
            .single();

        expect(shelved?.category_id).toBe(bakeries!.id);
        expect(shelved?.category, "the page follows the category now").toBe("Bakeries");
    } finally {
        await admin.from("platform_admins").delete().eq("user_id", userId);
        await admin.from("businesses").delete().eq("created_by", userId);
        await admin.auth.admin.deleteUser(userId);
    }
});

test("only an admin reads the queue or shelves anybody", async () => {
    const { businessId, businessUserId, businessEmail, testPassword } = JSON.parse(
        fs.readFileSync(STATE_PATH, "utf8"),
    );

    const owner = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
        { auth: { autoRefreshToken: false, persistSession: false } },
    );
    await owner.auth.signInWithPassword({ email: businessEmail, password: testPassword });

    const { data: category } = await admin
        .from("categories")
        .select("id")
        .not("parent_id", "is", null)
        .limit(1)
        .single();

    const { data: before } = await admin
        .from("businesses")
        .select("category, category_id")
        .eq("id", businessId)
        .single();

    // A business owner cannot put themselves on a shelf.
    const { error } = await owner.rpc("set_business_category", {
        requested_business_id: businessId,
        requested_category_id: category!.id,
    });

    expect(error, needsMigration).not.toBeNull();
    expect(error!.code).toBe("42501");

    const { data: after } = await admin
        .from("businesses")
        .select("category, category_id")
        .eq("id", businessId)
        .single();

    expect(after).toEqual(before);

    // Nor read who else is waiting for one.
    const { data: queue, error: queueError } = await owner.rpc("businesses_without_a_category");

    expect(queueError).toBeNull();
    expect(queue, "the queue is admin-only, and says nothing rather than refusing").toEqual([]);

    // A heading is not a category: a business sits on a shelf, not on
    // the sign above it.
    await admin.from("platform_admins").insert({ user_id: businessUserId });

    try {
        const { data: heading } = await admin
            .from("categories")
            .select("id")
            .is("parent_id", null)
            .limit(1)
            .single();

        const { error: headingError } = await owner.rpc("set_business_category", {
            requested_business_id: businessId,
            requested_category_id: heading!.id,
        });

        expect(headingError).not.toBeNull();
        expect(headingError!.code).toBe("P0002");
    } finally {
        await admin.from("platform_admins").delete().eq("user_id", businessUserId);
    }
});

test("a business whose words stand in for a category can still edit its page", async ({ browser }) => {
    // The edit form is one of the biggest pages in the app for a dev
    // server to compile, and this saves through it twice.
    test.setTimeout(300_000);

    const { freeBusinessId } = JSON.parse(fs.readFileSync(STATE_PATH, "utf8"));
    const said = "tattoo studio";
    const run = String(Date.now());

    const { data: before } = await admin
        .from("businesses")
        .select("category, category_id, description")
        .eq("id", freeBusinessId)
        .single();

    const { data: bakeries } = await admin
        .from("categories")
        .select("id")
        .eq("name", "Bakeries")
        .not("parent_id", "is", null)
        .single();

    // How a business that signed up through "Something else" sits.
    await admin
        .from("businesses")
        .update({ category_id: null, category: said })
        .eq("id", freeBusinessId);

    const page = await (await browser.newContext({ storageState: BUSINESS_AUTH })).newPage();

    try {
        await page.goto(`/business/${freeBusinessId}/edit`, { timeout: 90_000 });

        // Their own words are where the category goes, so the form
        // opens on what they said rather than on an empty box that
        // will not save.
        await expect(page.locator("#category")).toHaveValue("other", { timeout: 60_000 });
        await expect(page.locator("#otherCategory")).toHaveValue(said);

        // And the rest of the page saves without making them pick the
        // nearest wrong category first.
        await page.locator("#description").fill(`A description written at ${run}.`);
        await page.getByRole("button", { name: "Save changes" }).click({ timeout: 30_000 });

        await expect
            .poll(
                async () =>
                    soon(
                        admin
                            .from("businesses")
                            .select("description")
                            .eq("id", freeBusinessId)
                            .single()
                            .then(({ data }) => data?.description ?? ""),
                        "",
                    ),
                { timeout: 60_000 },
            )
            .toContain(run);

        const { data: kept } = await admin
            .from("businesses")
            .select("category, category_id")
            .eq("id", freeBusinessId)
            .single();

        expect(kept?.category_id, needsMigration).toBeNull();
        expect(kept?.category, "their words are not overwritten by saving").toBe(said);

        // And when a category does fit, picking it takes the words away.
        await page.locator("#category").selectOption({ label: "Bakeries" });
        await expect(page.locator("#otherCategory")).toHaveCount(0);
        await page.getByRole("button", { name: "Save changes" }).click({ timeout: 30_000 });

        await expect
            .poll(
                async () =>
                    soon(
                        admin
                            .from("businesses")
                            .select("category_id")
                            .eq("id", freeBusinessId)
                            .single()
                            .then(({ data }) => data?.category_id ?? ""),
                        "",
                    ),
                { timeout: 60_000 },
            )
            .toBe(bakeries!.id);

        const { data: shelved } = await admin
            .from("businesses")
            .select("category")
            .eq("id", freeBusinessId)
            .single();

        expect(shelved?.category, "the text follows the category").toBe("Bakeries");
    } finally {
        await admin
            .from("businesses")
            .update({
                category_id: before?.category_id ?? null,
                category: before?.category ?? "Testing",
                description: before?.description ?? null,
            })
            .eq("id", freeBusinessId);
        await admin.from("business_edits").delete().eq("business_id", freeBusinessId);
        await page.context().close();
    }
});
