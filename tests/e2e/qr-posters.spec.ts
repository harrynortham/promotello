import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import { STATE_PATH, BUSINESS_AUTH } from "../global-setup";

test.use({ storageState: BUSINESS_AUTH });

test("business owner can create a QR code, print its poster and see scans", async ({ page, request }) => {
    const { businessId } = JSON.parse(fs.readFileSync(STATE_PATH, "utf8"));

    await page.goto(`/business/${businessId}/qr`);
    await page.locator("#qr-label").fill("Front window");
    await page.getByRole("button", { name: "Create QR code" }).click();

    await expect(page.getByText("QR code created")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole("heading", { name: "Front window" })).toBeVisible();

    // The short link printed on the poster.
    const link = await page.locator('a[href*="/q/"]').first().getAttribute("href");
    expect(link).toMatch(/\/q\/[a-z0-9]{8}$/);

    // A scan redirects to the business page, tagged as a QR visit.
    const scan = await request.get(new URL(link!).pathname, { maxRedirects: 0 });
    expect(scan.status()).toBe(307);
    expect(scan.headers()["location"]).toContain(`/businesses/${businessId}?ref=qr`);

    await page.reload();
    const stats = page.locator("dl").first();
    await expect(stats.getByText("7 days")).toBeVisible();
    await expect(stats.locator("dd").first()).toHaveText("1");

    // The printable poster shows the code and a print button.
    const posterHref = await page.getByText("Print poster").first().getAttribute("href");
    await page.goto(posterHref!);
    await expect(page.getByText("Point your phone camera here")).toBeVisible();
    await expect(page.getByRole("button", { name: "Print or save as PDF" })).toBeVisible();
});

test("the database limits Free businesses to one QR code", async () => {
    const state = JSON.parse(fs.readFileSync(STATE_PATH, "utf8"));

    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
        { auth: { autoRefreshToken: false, persistSession: false } },
    );
    await supabase.auth.signInWithPassword({ email: state.businessEmail, password: state.testPassword });

    const insert = (label: string) =>
        supabase.from("qr_codes").insert({
            business_id: state.freeBusinessId,
            label,
            created_by: state.businessUserId,
        });

    expect((await insert("Till")).error).toBeNull();
    expect((await insert("Table tent")).error?.code).toBe("P0004");
});

// The code on its own, for a menu or a leaflet or a sticker, rather than
// only inside our poster.
test("a business can download its code as an image, and nobody else can", async ({ page, browser }) => {
    const { businessId } = JSON.parse(fs.readFileSync(STATE_PATH, "utf8"));
    const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
        auth: { persistSession: false },
    });

    const countCodes = () =>
        admin
            .from("qr_codes")
            .select("id", { count: "exact", head: true })
            .eq("business_id", businessId)
            .is("archived_at", null)
            .then(({ count }) => count ?? 0);

    const { data: code } = await admin
        .from("qr_codes")
        .insert({ business_id: businessId, label: "E2E Download" })
        .select("id")
        .single();

    try {
        const before = await countCodes();

        await page.goto(`/business/${businessId}/qr`);
        const href = `/business/${businessId}/qr/${code!.id}/image`;
        await expect(page.locator(`a[href="${href}"]`)).toBeVisible();

        const png = await page.request.get(href);
        expect(png.status()).toBe(200);
        expect(png.headers()["content-type"]).toBe("image/png");
        expect(png.headers()["content-disposition"]).toContain('filename="promotello-qr-e2e-download.png"');
        // A real image, big enough to print rather than a thumbnail.
        expect((await png.body()).length).toBeGreaterThan(5_000);

        const svg = await page.request.get(`${href}?format=svg`);
        expect(svg.headers()["content-type"]).toBe("image/svg+xml");
        expect(await svg.text()).toContain("<svg");

        // Downloading hands back a code that exists; it doesn't make one,
        // which is what the Free plan limits.
        expect(await countCodes(), "no code was created by downloading").toBe(before);

        // It belongs to one business, and isn't public.
        // Signed out for real: a context made inside a test inherits the
        // file's storageState unless it is given one of its own, so this
        // read as the business owner until it was emptied.
        const outsider = await (await browser.newContext({ storageState: { cookies: [], origins: [] } })).newPage();
        expect((await outsider.request.get(href)).status()).toBe(404);
    } finally {
        await admin.from("qr_codes").delete().eq("id", code!.id);
    }
});


// A code for a business that isn't approved yet points at nothing: the
// scan function only matches approved businesses, so the poster in the
// window leads to a dead link. The dashboard says so instead of
// offering the form, and the database refuses the row either way.
test("a business waiting for approval is told so, and can't make a code", async ({ page }) => {
    const state = JSON.parse(fs.readFileSync(STATE_PATH, "utf8"));
    const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
        auth: { persistSession: false },
    });

    const { data: waiting } = await admin
        .from("businesses")
        .insert({
            name: `E2E Waiting Business ${Date.now()}`,
            category: "Testing",
            description: "Automated test business — safe to delete.",
            approval_status: "pending",
            created_by: state.businessUserId,
        })
        .select("id")
        .single();

    try {
        await admin.from("business_members").insert({
            business_id: waiting!.id,
            user_id: state.businessUserId,
            role: "owner",
        });

        await page.goto(`/business/${waiting!.id}/qr`);
        await expect(page.getByText("Your page is still being checked")).toBeVisible({ timeout: 10_000 });
        await expect(page.getByRole("button", { name: "Create QR code" })).toHaveCount(0);
        // Nor a button offering a form that isn't on the page.
        await expect(page.getByRole("link", { name: "Create a QR code" })).toHaveCount(0);

        // And the row is refused however it is written, with its own
        // code so it isn't read as the Free plan's one-code limit.
        const owner = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
            { auth: { autoRefreshToken: false, persistSession: false } },
        );
        await owner.auth.signInWithPassword({ email: state.businessEmail, password: state.testPassword });

        const { error } = await owner.from("qr_codes").insert({
            business_id: waiting!.id,
            label: "Front window",
            created_by: state.businessUserId,
        });
        expect(
            error?.code,
            "supabase/migrations/20261206100000_qr_needs_approved_business.sql isn't applied",
        ).toBe("P0003");
    } finally {
        await admin.from("businesses").delete().eq("id", waiting!.id);
    }
});

// An offer still being read can't be pointed at, but leaving it out of
// the list looks like we lost it.
test("an offer waiting for approval is listed, and can't be chosen", async ({ page }) => {
    const state = JSON.parse(fs.readFileSync(STATE_PATH, "utf8"));
    const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
        auth: { persistSession: false },
    });

    const title = `E2E Pending QR Offer ${Date.now()}`;
    const { data: offer } = await admin
        .from("offers")
        .insert({
            business_id: state.businessId,
            created_by: state.businessUserId,
            slug: `e2e-pending-qr-${Date.now()}`,
            title,
            category: "Testing",
            discount: "5% off",
            description: "An offer still waiting for review.",
            availability: "Available now",
            expires_at: "2030-12-31",
            terms: "For automated tests only.",
            approval_status: "pending",
            redemption_count: 0,
        })
        .select("id")
        .single();

    try {
        await page.goto(`/business/${state.businessId}/qr`);
        const option = page.locator(`#qr-target option[value="${offer!.id}"]`);
        await expect(option).toHaveText(`Offer: ${title} — waiting for approval`, { timeout: 10_000 });
        await expect(option).toBeDisabled();
    } finally {
        await admin.from("offers").delete().eq("id", offer!.id);
    }
});

// A scan that resolves to nothing used to land on the homepage, which
// tells someone standing in a shop with their phone out nothing at all.
test("a code that points at nothing explains itself", async ({ page, request }) => {
    const scan = await request.get("/q/zzzzzzzz", { maxRedirects: 0 });
    expect(scan.status()).toBe(307);
    expect(scan.headers()["location"]).toContain("/q/unavailable");

    await page.goto("/q/unavailable");
    await expect(page.getByRole("heading", { name: "That code isn't live yet." })).toBeVisible();
    await expect(page.getByRole("button", { name: "Browse local offers" })).toBeVisible();
});

// Printing is what this page is for, and a print dialog is nothing like
// a screen: it drops backgrounds unless asked not to, and it paginates.
// Chromium's print path is the same one behind "Save as PDF" on a Mac.
test("the poster prints as one page at the size that was picked", async ({ page }) => {
    const state = JSON.parse(fs.readFileSync(STATE_PATH, "utf8"));
    const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
        auth: { persistSession: false },
    });

    const { data: code } = await admin
        .from("qr_codes")
        .insert({ business_id: state.businessId, label: "E2E Print" })
        .select("id")
        .single();

    try {
        // A4 is 595x842pt, A5 is 420x595pt.
        for (const [size, width, height] of [["a4", 595, 842], ["a5", 420, 595]] as const) {
            await page.goto(`/poster/${code!.id}?size=${size}`);

            // The code's own card keeps no shadow on paper: a printer
            // flattens the blur into a grey block over the words.
            await page.emulateMedia({ media: "print" });
            // Tailwind's shadow-none composes to transparent layers
            // rather than the keyword, so ask whether anything would be
            // painted rather than how it is spelled.
            const shadow = await page
                .locator("article div[style*='23em']")
                .evaluate((el) =>
                    getComputedStyle(el)
                        .boxShadow.replace(/rgba\(0, 0, 0, 0\) 0px 0px 0px 0px,? ?/g, "")
                        .trim(),
                );
            expect(shadow, `${size}: nothing is painted around the code`).toBe("");

            // The navy band, the coral pill and the cream paper. A print
            // dialog drops every background unless the page insists.
            const colours = await page
                .locator("article > header")
                .evaluate((el) => getComputedStyle(el).printColorAdjust);
            expect(colours, `${size}: backgrounds are printed`).toBe("exact");

            // preferCSSPageSize: take the size from the page's own @page
            // rule, which is what a print dialog offers as the paper.
            const pdf = await page.pdf({ preferCSSPageSize: true });
            const raw = pdf.toString("latin1");

            const pages = raw.match(/\/Type\s*\/Page[^s]/g) ?? [];
            expect(pages.length, `${size} is one sheet`).toBe(1);

            const box = raw.match(/\/MediaBox\s*\[\s*0\s+0\s+([\d.]+)\s+([\d.]+)/);
            expect(Math.round(Number(box![1])), `${size} width`).toBeGreaterThanOrEqual(width - 2);
            expect(Math.round(Number(box![1])), `${size} width`).toBeLessThanOrEqual(width + 2);
            expect(Math.round(Number(box![2])), `${size} height`).toBeGreaterThanOrEqual(height - 2);
            expect(Math.round(Number(box![2])), `${size} height`).toBeLessThanOrEqual(height + 2);

            await page.emulateMedia({ media: "screen" });
        }
    } finally {
        await admin.from("qr_codes").delete().eq("id", code!.id);
    }
});
