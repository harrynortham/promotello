import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import { STATE_PATH, BUSINESS_AUTH } from "../global-setup";

test.use({ storageState: BUSINESS_AUTH });

test("business owner can create a QR code, print its poster and see scans", async ({ page, request }) => {
    const { businessId } = JSON.parse(fs.readFileSync(STATE_PATH, "utf8"));

    await page.goto(`/business/${businessId}/qr`);
    await page.locator("#qr-label").fill("Front window");
    await page.getByRole("button", { name: "Make this poster" }).click();

    await expect(page.getByText("Poster made")).toBeVisible({ timeout: 10_000 });
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

    // Made is not printed: nothing is recorded until the poster is
    // actually printed or saved, which is what the dashboard checklist and
    // the onboarding funnel both count.
    const codeId = posterHref!.split("/").pop()!.split("?")[0];
    const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
        auth: { persistSession: false },
    });

    const before = await admin.from("qr_codes").select("poster_printed_at").eq("id", codeId).single();
    expect(before.error?.message ?? "", "apply the onboarding funnel migration first").not.toMatch(
        /poster_printed_at/,
    );
    expect(before.data?.poster_printed_at, "making a code prints nothing").toBeNull();

    // Printing is a browser dialog, so the page's own print handler is
    // what the test presses — the same one ⌘P reaches.
    await page.evaluate(() => window.dispatchEvent(new Event("beforeprint")));

    await expect
        .poll(async () => {
            const { data } = await admin.from("qr_codes").select("poster_printed_at").eq("id", codeId).single();
            return data?.poster_printed_at ?? null;
        }, { timeout: 15_000 })
        .not.toBeNull();

    // And that is what ticks "Print a QR poster" on the dashboard: a
    // finished item is struck through.
    await page.goto(`/business/${businessId}`);
    const item = page.getByText("Print a QR poster", { exact: true });
    await expect(item).toBeVisible({ timeout: 15_000 });
    await expect(item).toHaveClass(/line-through/);
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
        // The code is on the end, so two spots called the same thing
        // don't hand back the same file.
        expect(png.headers()["content-disposition"]).toMatch(
            /filename="promotello-qr-e2e-download-[a-z0-9]+\.png"/,
        );
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
        await expect(page.getByRole("button", { name: "Make this poster" })).toHaveCount(0);
        // Nor a button offering a form that isn't on the page.
        await expect(page.getByRole("link", { name: "Make a poster" })).toHaveCount(0);

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
        await page.goto(`/business/${state.businessId}/qr/new`);
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

// What the poster says follows what the code opens: a code pointed at
// the business page invites people in, a code pointed at an offer sells
// that offer. Before, a business-page code borrowed the newest offer,
// so the preview disagreed with the dropdown above it — and the printed
// sheet went stale in the window when that offer ended.
test("the poster carries the words of whatever the code opens", async ({ page }) => {
    const state = JSON.parse(fs.readFileSync(STATE_PATH, "utf8"));
    const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
        auth: { persistSession: false },
    });

    const { data: offer } = await admin
        .from("offers")
        .select("id, title, discount, description")
        .eq("business_id", state.businessId)
        .eq("approval_status", "approved")
        .gte("expires_at", new Date().toISOString().slice(0, 10))
        .is("plan_paused_at", null)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

    const { data: toBusiness } = await admin
        .from("qr_codes")
        .insert({ business_id: state.businessId, label: "E2E Opens Business" })
        .select("id")
        .single();

    const { data: toOffer } = await admin
        .from("qr_codes")
        .insert({ business_id: state.businessId, label: "E2E Opens Offer", offer_id: offer!.id })
        .select("id")
        .single();

    try {
        // The business page: its own words, and not the newest offer's.
        await page.goto(`/poster/${toBusiness!.id}?size=a4`);
        await expect(
            page.getByRole("heading", { name: "See what's on at E2E Test Business" }),
        ).toBeVisible({ timeout: 10_000 });
        await expect(page.getByText(offer!.discount, { exact: true })).toHaveCount(0);
        // "Claim it" has nothing to point at on a poster that opens a
        // list of offers.
        await expect(page.getByText(/Every offer is free to claim/)).toBeVisible();
        await expect(page.getByText(/Claim it free on Promotello/)).toHaveCount(0);

        // An offer: that offer's words, and the claim it carries. The
        // line under the headline is what the offer is, not its title,
        // which is usually the discount said a second time.
        await page.goto(`/poster/${toOffer!.id}?size=a4`);
        await expect(page.getByRole("heading", { name: offer!.discount })).toBeVisible();
        await expect(page.getByText(offer!.description, { exact: true })).toBeVisible();
        await expect(page.getByText(/Claim it free on Promotello/)).toBeVisible();
    } finally {
        await admin.from("qr_codes").delete().eq("id", toBusiness!.id);
        await admin.from("qr_codes").delete().eq("id", toOffer!.id);
    }
});

// The same rule while the code is being made: the preview and the two
// placeholders follow the dropdown rather than always showing an offer.
test("the designer previews what the chosen target will print", async ({ page }) => {
    const state = JSON.parse(fs.readFileSync(STATE_PATH, "utf8"));
    const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
        auth: { persistSession: false },
    });

    const { data: offer } = await admin
        .from("offers")
        .select("id, title, discount")
        .eq("business_id", state.businessId)
        .eq("approval_status", "approved")
        .gte("expires_at", new Date().toISOString().slice(0, 10))
        .is("plan_paused_at", null)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

    await page.goto(`/business/${state.businessId}/qr/new`);

    // It opens on the business page, so that is what is previewed.
    await expect(page.locator("#qr-target")).toHaveValue("business");
    await expect(page.locator("#poster-eyebrow")).toHaveAttribute("placeholder", "Scan for offers");
    await expect(page.locator("#poster-headline")).toHaveAttribute(
        "placeholder",
        "See what's on at E2E Test Business",
    );
    const preview = page.locator("#create-qr [data-slot=poster-preview] article");
    await expect(preview.getByRole("heading", { name: "See what's on at E2E Test Business" })).toBeVisible();

    // Pick an offer and the poster changes with it.
    await page.selectOption("#qr-target", offer!.id);
    await expect(page.locator("#poster-eyebrow")).toHaveAttribute("placeholder", "Exclusive offer");
    await expect(page.locator("#poster-headline")).toHaveAttribute("placeholder", offer!.discount);
    await expect(preview.getByRole("heading", { name: offer!.discount })).toBeVisible();
});

// The words under the headline are the business's to write: they start
// as the offer's description, and the poster prints what was kept.
test("an offer poster prints the description the business wrote", async ({ page }) => {
    const state = JSON.parse(fs.readFileSync(STATE_PATH, "utf8"));
    const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
        auth: { persistSession: false },
    });

    const { data: offer } = await admin
        .from("offers")
        .select("id, description, discount")
        .eq("business_id", state.businessId)
        .eq("approval_status", "approved")
        .gte("expires_at", new Date().toISOString().slice(0, 10))
        .is("plan_paused_at", null)
        .limit(1)
        .single();

    const written = "Two scoops for the price of one, every afternoon.";

    const { data: code, error } = await admin
        .from("qr_codes")
        .insert({
            business_id: state.businessId,
            label: "E2E Poster Words",
            offer_id: offer!.id,
            poster_description: written,
        })
        .select("id")
        .single();

    expect(
        error,
        "supabase/migrations/20261206120000_qr_poster_description.sql isn't applied",
    ).toBeNull();

    try {
        await page.goto(`/poster/${code!.id}?size=a4`);
        await expect(page.getByText(written, { exact: true })).toBeVisible({ timeout: 10_000 });
        await expect(page.getByText(offer!.description, { exact: true })).toHaveCount(0);
    } finally {
        if (code) await admin.from("qr_codes").delete().eq("id", code.id);
    }
});

// The field only belongs to an offer poster: a business-page poster has
// no description to start from and no line to put one on.
test("the description field appears only for an offer", async ({ page }) => {
    const state = JSON.parse(fs.readFileSync(STATE_PATH, "utf8"));
    const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
        auth: { persistSession: false },
    });

    const { data: offer } = await admin
        .from("offers")
        .select("id, description")
        .eq("business_id", state.businessId)
        .eq("approval_status", "approved")
        .gte("expires_at", new Date().toISOString().slice(0, 10))
        .is("plan_paused_at", null)
        .limit(1)
        .single();

    await page.goto(`/business/${state.businessId}/qr/new`);
    await expect(page.locator("#qr-target")).toHaveValue("business");
    await expect(page.locator("#poster-description")).toHaveCount(0);

    await page.selectOption("#qr-target", offer!.id);
    await expect(page.locator("#poster-description")).toHaveValue(offer!.description);

    // What is typed is what the preview prints.
    const preview = page.locator("#create-qr [data-slot=poster-preview] article");
    await page.locator("#poster-description").fill("Two scoops for one, every afternoon.");
    await expect(preview.getByText("Two scoops for one, every afternoon.")).toBeVisible();

    // Going back to the business page takes the field away again.
    await page.selectOption("#qr-target", "business");
    await expect(page.locator("#poster-description")).toHaveCount(0);
});

// The paper size is chosen on the print page, where the sheet is in
// front of you; and the poster stays in view while the form is filled.
test("the form has no paper size, and the preview follows you down", async ({ page }) => {
    const state = JSON.parse(fs.readFileSync(STATE_PATH, "utf8"));

    await page.setViewportSize({ width: 1280, height: 760 });
    await page.goto(`/business/${state.businessId}/qr/new`);
    await expect(page.locator("#qr-label")).toBeVisible({ timeout: 15_000 });

    await expect(page.locator("#poster-size")).toHaveCount(0);

    const poster = page.locator("#create-qr [data-slot=poster-preview] article");
    const start = (await poster.boundingBox())!.y;

    await page.mouse.wheel(0, 240);
    await page.waitForTimeout(350);

    const label = page.locator("#qr-label");
    const pinned = (await poster.boundingBox())!.y;

    // The form has moved up; the poster has stopped under the header
    // rather than going with it.
    expect((await label.boundingBox())!.y, "the form scrolled").toBeLessThan(start);
    expect(pinned, "the poster is still on screen").toBeLessThan(start);
    expect(pinned, "and below the sticky header").toBeGreaterThan(90);
});

// The first code is made on the QR page, because there is nothing else
// on it. After that the page is the list of what they have, and the form
// has a page of its own.
test("the form is on the page for a first code, and on /qr/new after that", async ({ page }) => {
    const state = JSON.parse(fs.readFileSync(STATE_PATH, "utf8"));
    const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
        auth: { persistSession: false },
    });

    const { data: existing } = await admin
        .from("qr_codes")
        .select("id")
        .eq("business_id", state.businessId)
        .is("archived_at", null);

    // Start from nothing, and put back whatever was there.
    const parked = (existing ?? []).map((code) => code.id);
    if (parked.length) {
        await admin.from("qr_codes").update({ archived_at: new Date().toISOString() }).in("id", parked);
    }

    let madeId: string | undefined;

    try {
        await page.goto(`/business/${state.businessId}/qr`);
        await expect(page.locator("#qr-label"), "the first one is made here").toBeVisible({
            timeout: 20_000,
        });

        const { data: made } = await admin
            .from("qr_codes")
            .insert({ business_id: state.businessId, label: "E2E Existing Code" })
            .select("id")
            .single();
        madeId = made!.id;

        // With one in hand the page is a list: no form, a way to the form.
        await page.reload();
        await expect(page.getByRole("heading", { name: "E2E Existing Code" })).toBeVisible({
            timeout: 20_000,
        });
        await expect(page.locator("#qr-label")).toHaveCount(0);

        // Making another leads the grid rather than trailing it.
        const first = await page.evaluate(() => {
            const grid = document.querySelector("section .grid");
            return (grid?.firstElementChild?.textContent ?? "").trim();
        });
        expect(first).toContain("Add another poster");

        await page.getByRole("button", { name: "Make a poster" }).click();
        await page.waitForURL(`**/business/${state.businessId}/qr/new`);
        await expect(page.locator("#qr-label")).toBeVisible();

        // And making one there lands back on the list.
        await page.locator("#qr-label").fill("E2E Second Code");
        await page.getByRole("button", { name: "Make this poster" }).click();
        await page.waitForURL(`**/business/${state.businessId}/qr?created=1`, { timeout: 25_000 });
        await expect(page.getByText("Poster made")).toBeVisible();
        await expect(page.getByRole("heading", { name: "E2E Second Code" })).toBeVisible();
    } finally {
        await admin.from("qr_codes").delete().eq("business_id", state.businessId).eq("label", "E2E Second Code");
        if (madeId) await admin.from("qr_codes").delete().eq("id", madeId);
        if (parked.length) await admin.from("qr_codes").update({ archived_at: null }).in("id", parked);
    }
});

// The card by the till. An offer poster sells one deal; this one sells
// the reason to come back, and the scan lands on the card rather than
// the top of the business page.
test("a poster can be made for the loyalty card", async ({ page, request }) => {
    const state = JSON.parse(fs.readFileSync(STATE_PATH, "utf8"));
    const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
        auth: { persistSession: false },
    });

    const { data: card } = await admin
        .from("loyalty_programs")
        .insert({
            business_id: state.businessId,
            name: `E2E Poster card ${Date.now()}`,
            stamps_required: 9,
            reward: "A free coffee",
            terms: "One stamp per visit.",
            is_active: true,
        })
        .select("id")
        .single();

    let codeId: string | undefined;

    try {
        await page.goto(`/business/${state.businessId}/qr/new`);
        await expect(page.locator("#qr-target")).toBeVisible({ timeout: 20_000 });

        await page.locator("#qr-label").fill("By the till");
        await page.selectOption("#qr-target", "loyalty");

        // The card's own words, offered as the poster's.
        await expect(page.locator("#poster-eyebrow")).toHaveAttribute("placeholder", "Collect 9 stamps");
        await expect(page.locator("#poster-headline")).toHaveAttribute("placeholder", "Get a free coffee");
        await expect(page.locator("#poster-description")).toHaveValue("One stamp per visit.");

        await page.getByRole("button", { name: "Make this poster" }).click();
        await page.waitForURL(`**/business/${state.businessId}/qr?created=1`, { timeout: 25_000 });

        const { data: made } = await admin
            .from("qr_codes")
            .select("id, code, offer_id, loyalty_program_id")
            .eq("business_id", state.businessId)
            .eq("label", "By the till")
            .single();
        codeId = made!.id;

        expect(made!.loyalty_program_id, "the code points at the card").toBe(card!.id);
        expect(made!.offer_id, "and at nothing else").toBeNull();
        await expect(page.getByText("Opens your loyalty card")).toBeVisible();

        // The printed sheet says what the card takes and what it gives.
        await page.goto(`/poster/${codeId}?size=a4`);
        await expect(page.getByText("Collect 9 stamps")).toBeVisible({ timeout: 15_000 });
        await expect(page.getByRole("heading", { name: "Get a free coffee" })).toBeVisible();
        await expect(page.getByText("One stamp per visit.")).toBeVisible();
        // A stamp card asks to be joined, not claimed.
        await expect(page.getByText(/Join free on Promotello and collect a stamp/)).toBeVisible();
        await expect(page.getByText(/Claim it free on Promotello/)).toHaveCount(0);

        // And a scan lands on the card, not the top of the page.
        const scan = await request.get(`/q/${made!.code}`, { maxRedirects: 0 });
        expect(scan.status()).toBe(307);
        expect(scan.headers()["location"]).toContain(`#loyalty-${card!.id}`);
    } finally {
        if (codeId) await admin.from("qr_codes").delete().eq("id", codeId);
        await admin.from("loyalty_programs").delete().eq("id", card!.id);
    }
});

// A poster is printed once and stays in a window for months. Deleting the
// offer behind it used to leave a code advertising a deal that no longer
// exists, with nothing to say about it at either end.
test("a poster for a deleted offer still lands somewhere, and both sides are told", async ({ page, request }) => {
    const state = JSON.parse(fs.readFileSync(STATE_PATH, "utf8"));
    const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
        auth: { persistSession: false },
    });

    const title = `E2E Deleted Offer ${Date.now()}`;
    const { data: offer } = await admin
        .from("offers")
        .insert({
            business_id: state.businessId,
            created_by: state.businessUserId,
            slug: `e2e-deleted-qr-${Date.now()}`,
            title,
            category: "Testing",
            discount: "5% off",
            description: "An offer that is about to be deleted.",
            availability: "Available now",
            expires_at: "2030-12-31",
            terms: "For automated tests only.",
            approval_status: "pending",
            redemption_count: 0,
        })
        .select("id")
        .single();

    const { data: code } = await admin
        .from("qr_codes")
        .insert({ business_id: state.businessId, label: "E2E Ended Poster", offer_id: offer!.id })
        .select("id, code")
        .single();

    try {
        await admin.from("offers").delete().eq("id", offer!.id);

        // The delete takes offer_id with it, so the title is kept instead.
        const { data: after } = await admin
            .from("qr_codes")
            .select("offer_id, former_target")
            .eq("id", code!.id)
            .single();

        expect(after!.offer_id).toBeNull();
        expect(after!.former_target).toBe(title);

        // The scan still resolves, and carries the reason.
        const scan = await request.get(`/q/${code!.code}`, { maxRedirects: 0 });
        expect(scan.status()).toBe(307);

        const location = scan.headers()["location"];
        expect(location).toContain(`/businesses/${state.businessId}`);
        expect(location).toContain("ended=offer");

        // Someone standing in the shop is told why this isn't the page the
        // poster promised. The uuid address redirects to the slug, so this
        // also proves the reason survives that redirect.
        await page.goto(location);
        await expect(page.getByRole("heading", { name: "That offer has ended." })).toBeVisible({ timeout: 10_000 });
        await expect(page.getByRole("link", { name: /See what/ })).toBeVisible();

        // And the business is told, with the repair in reach.
        await page.goto(`/business/${state.businessId}/qr`);
        const card = page.locator('[data-slot="card"]').filter({ hasText: "E2E Ended Poster" });
        await expect(card.getByText(/You deleted this offer/)).toBeVisible({ timeout: 10_000 });
        await expect(card.getByText(/no reprint/)).toBeVisible();
        await expect(card.getByRole("button", { name: "Point it there" })).toBeVisible();
    } finally {
        await admin.from("qr_codes").delete().eq("id", code!.id);
        await admin.from("offers").delete().eq("id", offer!.id);
    }
});

// A poster is an arrangement and a palette, and both have to survive the
// trip to the printer: the business picks them on a form and then looks
// at a different page, rendered by a different component, days later.
test("a poster keeps the layout and the colours it was made with", async ({ page }) => {
    const { businessId } = JSON.parse(fs.readFileSync(STATE_PATH, "utf8"));
    const client = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { persistSession: false } },
    );
    const label = `E2E layout ${Date.now()}`;

    await page.goto(`/business/${businessId}/qr/new`);
    await expect(page.locator("#qr-label")).toBeVisible({ timeout: 20_000 });
    await page.locator("#qr-label").fill(label);

    // Four arrangements, each its own real poster at thumbnail size.
    await expect(page.getByRole("button", { name: /Classic/ })).toBeVisible();
    await page.getByRole("button", { name: /^Bold/ }).click();

    // Their own two colours, from their own logo.
    await page.getByRole("button", { name: "Your own colours" }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByText("Your own colours")).toBeVisible();

    await dialog.getByLabel("Band colour, as a hex code").fill("#FFE14D");
    await dialog.getByLabel("Pill colour, as a hex code").fill("#2B2B2B");
    await dialog.getByRole("button", { name: "Use these colours" }).click();
    await expect(dialog).toBeHidden();

    await page.getByRole("button", { name: "Make this poster" }).click();
    await expect(page.getByText("Poster made")).toBeVisible({ timeout: 15_000 });

    const { data: made } = await client
        .from("qr_codes")
        .select("id, poster_layout, poster_colour, poster_header, poster_accent")
        .eq("business_id", businessId)
        .eq("label", label)
        .single();

    try {
        expect(made!.poster_layout).toBe("bold");
        expect(made!.poster_colour).toBe("custom");
        expect(made!.poster_header).toBe("#FFE14D");
        expect(made!.poster_accent).toBe("#2B2B2B");

        // The printed sheet is the one they chose, in their colour —
        // and the type on it is dark, because white would vanish on
        // that yellow.
        await page.goto(`/poster/${made!.id}`);
        const poster = page.locator("article").first();
        await expect(poster).toHaveCSS("background-color", "rgb(255, 225, 77)");
        await expect(poster).toHaveCSS("color", "rgb(23, 35, 59)");

        // Two to a sheet, to cut down the middle.
        await page.goto(`/poster/${made!.id}?size=a5x2`);
        await expect(page.locator("article")).toHaveCount(2);
    } finally {
        await client.from("qr_codes").delete().eq("id", made!.id);
    }
});

// Saving a poster as a PDF names the file after the page. One title for
// every poster meant a business printing its second one was asked
// whether to overwrite its first.
test("every poster and every code file has its own name", async ({ page, request }) => {
    const { businessId } = JSON.parse(fs.readFileSync(STATE_PATH, "utf8"));
    const client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
        auth: { autoRefreshToken: false, persistSession: false },
    });
    const made: string[] = [];

    for (const label of [`E2E window ${Date.now()}`, `E2E till ${Date.now()}`]) {
        const { data } = await client
            .from("qr_codes")
            .insert({ business_id: businessId, label })
            .select("id")
            .single();
        made.push(data!.id);
    }

    try {
        const titles: string[] = [];

        for (const id of made) {
            for (const size of ["a4", "a5"]) {
                await page.goto(`/poster/${id}?size=${size}`);
                await expect(page.locator("article").first()).toBeVisible({ timeout: 20_000 });
                titles.push(await page.title());
            }
        }

        // The business, the spot and the paper, and no " | Promotello":
        // the browser builds a filename out of this.
        // The business, the spot, the paper and the code: two spots
        // called the same thing still save under their own names.
        expect(titles[0]).toMatch(/^E2E Test Business - QR poster - E2E window \d+ \(A4\) - [a-z0-9]+$/);
        expect(new Set(titles).size, JSON.stringify(titles)).toBe(titles.length);

        // And the code on its own, where two spots can share a name.
        const files = await Promise.all(
            made.map(async (id) => {
                const response = await request.get(`/business/${businessId}/qr/${id}/image`);
                return response.headers()["content-disposition"] ?? "";
            }),
        );

        expect(files[0]).toMatch(/filename="promotello-qr-e2e-window-\d+-[a-z0-9]+\.png"/);
        expect(new Set(files).size, JSON.stringify(files)).toBe(files.length);
    } finally {
        for (const id of made) await client.from("qr_codes").delete().eq("id", id);
    }
});

// The headline is balanced, and so is the line under it: a description
// that leaves one word alone on its last line is the commonest way a
// poster looks unfinished.
test("the poster's description is balanced across its lines", async ({ page }) => {
    const { businessId } = JSON.parse(fs.readFileSync(STATE_PATH, "utf8"));

    await page.goto(`/business/${businessId}/qr/new`);

    const target = page.getByLabel("What should it open?");
    await expect(target).toBeVisible({ timeout: 20_000 });

    // The description belongs to an offer poster.
    const offer = await target.locator("option").evaluateAll((options) => {
        const match = options.find(
            (option) =>
                option.textContent?.startsWith("Offer:") && !(option as HTMLOptionElement).disabled,
        ) as HTMLOptionElement | undefined;
        return match?.value ?? null;
    });
    expect(offer, "the test business has an approved offer to point at").not.toBeNull();
    await target.selectOption(offer!);

    await page.getByLabel("Description").fill(
        "Every cocktail on the list, Monday to Thursday from five until close, for anyone who scans",
    );

    const poster = page.locator("article").filter({ hasText: "Point your phone camera here" }).last();
    await expect(poster.getByText(/Every cocktail on the list/)).toHaveCSS("text-wrap-style", "balance");
});

// A poster that opens a loyalty card can draw the card. "Get a free
// coffee" on a window says nothing about how: a row of stamps does.
test("a loyalty code is offered layouts that draw the card", async ({ browser }) => {
    const { businessId } = JSON.parse(fs.readFileSync(STATE_PATH, "utf8"));
    const client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
        auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: open } = await client
        .from("loyalty_programs")
        .select("id")
        .eq("business_id", businessId)
        .eq("is_active", true)
        .is("closed_at", null);
    for (const row of open ?? []) {
        await client.from("loyalty_programs").update({ closed_at: new Date().toISOString() }).eq("id", row.id);
    }

    const { data: program } = await client
        .from("loyalty_programs")
        .insert({
            business_id: businessId,
            name: `E2E Poster card ${Date.now()}`,
            stamps_required: 9,
            reward: "A free coffee",
            terms: "One stamp per visit.",
            card_colour: "custom",
            card_header: "#0B5FFF",
            card_accent: "#FFD400",
            stamp_icon: "coffee",
            is_active: true,
        })
        .select("id")
        .single();

    const page = await (await browser.newContext({ storageState: BUSINESS_AUTH })).newPage();

    try {
        await page.goto(`/business/${businessId}/qr/new`);
        const target = page.getByLabel("What should it open?");
        await expect(target).toBeVisible({ timeout: 20_000 });

        // Nothing to draw a card from: four layouts, as before.
        await expect(page.getByRole("button", { name: "Stamp card" })).toHaveCount(0);
        await expect(page.getByRole("button", { name: "Stamp strip" })).toHaveCount(0);

        await target.selectOption("loyalty");

        // Six now, and the one that shows the card is already chosen.
        const stampCard = page.getByRole("button", { name: "Stamp card" });
        await expect(stampCard).toBeVisible();
        await expect(page.getByRole("button", { name: "Stamp strip" })).toBeVisible();
        await expect(stampCard).toHaveAttribute("aria-pressed", "true");

        // The card is drawn in its own colours, not the poster's.
        const preview = page.locator("article").filter({ hasText: "Point your phone camera here" }).last();
        await expect(
            preview.locator('[style*="rgb(11, 95, 255)"], [style*="#0B5FFF"]').first(),
        ).toBeVisible();

        // On a wall the card's panel invites a scan; a card in somebody's
        // phone is the one shown to staff, with a code on it.
        await expect(preview).toContainText("Scan to get your own");
        await expect(preview).not.toContainText("Show this to staff");
        await expect(preview).not.toContainText("4F8A2C91D0");

        // One code on the sheet: the card's. A second copy above it
        // would be the same scan twice.
        await expect(preview.locator('[class*="rounded-xl"] > svg, svg').nth(0)).toBeVisible();

        // The card is the app's card, so its band ranges left behind the
        // logo. The sheet's text is centred, and the card inherited that
        // until it was told not to: the name floated over the line under
        // it, lined up with neither it nor the logo.
        const name = preview.getByText("E2E Test Business", { exact: true }).last();
        const under = preview.getByText(/stamps for a free coffee/).last();
        const [nameBox, underBox] = await Promise.all([name.boundingBox(), under.boundingBox()]);
        expect(Math.abs((nameBox?.x ?? 0) - (underBox?.x ?? 1))).toBeLessThan(1);

        // The strip doesn't draw the card, so it carries the words the
        // card would have said, balanced like the headline above them.
        await page.getByRole("button", { name: "Stamp strip" }).click();
        await expect(preview.getByText(/One stamp per visit/)).toHaveCSS(
            "text-wrap-style",
            "balance",
        );
        await page.getByRole("button", { name: "Stamp card" }).click();

        // Pointing it somewhere else can't leave a layout behind with
        // nothing left to draw.
        await target.selectOption("business");
        await expect(page.getByRole("button", { name: "Stamp card" })).toHaveCount(0);
        await expect(page.getByRole("button", { name: "Classic" })).toHaveAttribute("aria-pressed", "true");
    } finally {
        await client.from("loyalty_programs").delete().eq("id", program!.id);
    }
});
