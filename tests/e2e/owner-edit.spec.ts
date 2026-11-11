import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import { STATE_PATH, BUSINESS_AUTH, CUSTOMER_AUTH } from "../global-setup";

// The page a customer sees is also where its owner notices something is
// wrong with it. Each piece carries the way back to the screen that sets
// it — and only for the people who run the business.
test("an owner sees an edit link on each part of their page, and nobody else does", async ({ browser }) => {
    const state = JSON.parse(fs.readFileSync(STATE_PATH, "utf8"));
    const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
        auth: { persistSession: false },
    });

    const { data: business } = await admin
        .from("businesses")
        .select("id, slug")
        .eq("id", state.businessId)
        .single();

    // The hours block only renders when there are hours, so give it one.
    const { error: hoursError } = await admin
        .from("business_hours")
        .upsert(
            { business_id: business!.id, day_of_week: 1, is_closed: false, opens_at: "09:00", closes_at: "17:00" },
            { onConflict: "business_id,day_of_week" },
        );
    expect(hoursError, "could not seed opening hours").toBeNull();

    try {
    const owner = await (await browser.newContext({ storageState: BUSINESS_AUTH })).newPage();
    await owner.goto(`/businesses/${business!.slug}`);

    const dashboard = `/business/${business!.id}`;
    for (const [label, href] of [
        ["Edit your cover photo", `${dashboard}/cover`],
        ["Edit your logo", `${dashboard}/logo`],
        ["Edit your name, description and category", `${dashboard}/edit`],
        ["Edit your offers", `${dashboard}/offers`],
        ["Edit your opening hours", `${dashboard}/hours`],
    ] as const) {
        const link = owner.getByRole("button", { name: label });
        await expect(link, label).toBeVisible({ timeout: 15_000 });
        await expect(link).toHaveAttribute("href", href);
    }
    // And a way back: the header here is the customer's.
    const home = owner.getByRole("button", { name: "Back to your dashboard" });
    await expect(home).toBeVisible();
    await expect(home).toHaveAttribute("href", dashboard);

    // The pill on the cover photo: the one thing on their own page that
    // led away from the dashboard they came from.
    await expect(owner.getByLabel(/^Back to businesses in /)).toHaveCount(0);

    await owner.close();

    // A customer signed in to their own account sees none of it.
    const customer = await (await browser.newContext({ storageState: CUSTOMER_AUTH })).newPage();
    await customer.goto(`/businesses/${business!.slug}`);
    await expect(customer.getByRole("heading", { level: 1 })).toBeVisible({ timeout: 15_000 });
    await expect(customer.getByRole("button", { name: /^Edit your/ })).toHaveCount(0);
    await expect(customer.getByText("the way a customer sees it")).toHaveCount(0);
    // Someone browsing keeps the way back to the listing they came from.
    await expect(customer.getByLabel(/^Back to businesses in /)).toBeVisible();
    await customer.close();

    // Nor does a stranger.
    const visitor = await (await browser.newContext()).newPage();
    await visitor.goto(`/businesses/${business!.slug}`);
    await expect(visitor.getByRole("heading", { level: 1 })).toBeVisible({ timeout: 15_000 });
    await expect(visitor.getByRole("button", { name: /^Edit your/ })).toHaveCount(0);
    await visitor.close();
    } finally {
        await admin.from("business_hours").delete().eq("business_id", business!.id).eq("day_of_week", 1);
    }
});

// Availability used to be a free-text box, so most live offers carry a
// line nobody could write today: "Weekdays before 10am", "First visit
// only". The pickers can't open on those, so the form says what
// customers see and that saving replaces it.
test("an offer written before the pickers says what it says now", async ({ browser }) => {
    const state = JSON.parse(fs.readFileSync(STATE_PATH, "utf8"));
    const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
        auth: { persistSession: false },
    });

    const { data: picture } = await admin
        .from("offers")
        .select("image_url")
        .not("image_url", "is", null)
        .limit(1)
        .single();

    const { data: category } = await admin.from("categories").select("id").not("parent_id", "is", null).limit(1).single();

    const { data: offer } = await admin
        .from("offers")
        .insert({
            business_id: state.businessId,
            created_by: state.businessUserId,
            slug: crypto.randomUUID(),
            title: "E2E Legacy Availability Offer",
            category: "Testing",
            category_id: category!.id,
            discount: "Free pastry",
            kind: "freebie",
            kind_item: "pastry",
            description: "An offer for the legacy availability test.",
            // The words a business typed, which no picker would produce.
            availability: "Weekdays before 10am",
            expires_at: "2030-12-31",
            terms: "For automated tests only.",
            approval_status: "approved",
            redemption_count: 0,
            image_url: picture!.image_url,
        })
        .select("id")
        .single();

    try {
        const page = await (await browser.newContext({ storageState: BUSINESS_AUTH })).newPage();
        await page.goto(`/business/${state.businessId}/offers/${offer!.id}/edit`);
        await expect(page.locator("#title")).toHaveValue("E2E Legacy Availability Offer", { timeout: 20_000 });

        // The quotes around the old line are typographic, so they are
        // matched loosely rather than written out.
        await expect(
            page.getByText(
                /Customers currently see: .Weekdays before 10am.\. Choose the days and times below and saving will replace it\./,
            ),
        ).toBeVisible();

        // Answering the pickers writes the line, and the note's reason
        // for being there goes with it.
        await page.getByLabel("Certain days and times").check();
        for (const day of ["Mon", "Tue", "Wed", "Thu", "Fri"]) {
            await page.getByRole("button", { name: day, exact: true }).click();
        }
        await page.locator("#availableUntil").fill("10:00");
        await expect(page.getByText("On your card: Weekdays, until 10am")).toBeVisible();

        await page.getByRole("button", { name: "Save changes" }).click();
        await page.waitForURL(`**/business/${state.businessId}/offers`, { timeout: 25_000 });

        const { data: saved } = await admin
            .from("offers")
            .select("availability, available_days, available_until, approval_status")
            .eq("id", offer!.id)
            .single();

        expect(saved!.availability, "the typed line is replaced by the built one").toBe("Weekdays, until 10am");
        expect(saved!.available_days).toEqual([1, 2, 3, 4, 5]);
        expect(saved!.available_until).toBe("10:00:00");
        // Availability has never been one of the reviewed fields, so the
        // offer stays live rather than going back in the queue.
        expect(saved!.approval_status).toBe("approved");

        // Opened again, there is nothing left to warn about.
        await page.goto(`/business/${state.businessId}/offers/${offer!.id}/edit`);
        await expect(page.locator("#title")).toHaveValue("E2E Legacy Availability Offer", { timeout: 20_000 });
        await expect(page.getByText("Customers currently see:")).toHaveCount(0);
    } finally {
        await admin.from("offers").delete().eq("id", offer!.id);
    }
});
