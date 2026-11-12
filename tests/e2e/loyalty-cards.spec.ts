import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import { STATE_PATH, BUSINESS_AUTH, CUSTOMER_AUTH } from "../global-setup";
import { enterSignInCode } from "../sign-in";

test("business sets up a loyalty card, customer joins, staff stamp it", async ({ browser }) => {
    const { businessId } = JSON.parse(fs.readFileSync(STATE_PATH, "utf8"));
    const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
        auth: { autoRefreshToken: false, persistSession: false },
    });
    // Named per run: one business can't have two live cards with the
    // same name, so a fixed name passes once and fails ever after.
    const cardName = `E2E Coffee card ${Date.now()}`;

    const business = await (await browser.newContext({ storageState: BUSINESS_AUTH })).newPage();
    const customer = await (await browser.newContext({ storageState: CUSTOMER_AUTH })).newPage();

    // Owner starts a programme (the test business is on Pro).
    await business.goto(`/business/${businessId}/loyalty`, { waitUntil: "networkidle" });
    // A card is named now that a business can run more than one.
    await business.locator("#card-name:visible").fill(cardName);
    await business.locator("#stamps-required:visible").selectOption("5");
    await business.locator("#reward:visible").fill("A free coffee");
    await business.getByRole("button", { name: "Start loyalty card" }).click();
    await expect(business.getByText("Loyalty card saved")).toBeVisible({ timeout: 10_000 });

    // Customer joins from the business page and gets a card with a code.
    await customer.goto(`/businesses/${businessId}`);
    await expect(customer.getByText("Collect 5 stamps, get a free coffee")).toBeVisible();
    await customer.getByRole("button", { name: "Join the loyalty card" }).click();
    // Joining lands on that card's own page, with the code on it.
    await customer.waitForURL(/\/loyalty\/[0-9a-f-]+$/, { timeout: 10_000 });

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

    await admin.from("loyalty_programs").delete().eq("business_id", businessId).eq("name", cardName);
});

test("a Free business can build a loyalty card, but publishing it needs Pro", async ({ browser }) => {
    const { freeBusinessId } = JSON.parse(fs.readFileSync(STATE_PATH, "utf8"));
    const page = await (await browser.newContext({ storageState: BUSINESS_AUTH })).newPage();

    await page.goto(`/business/${freeBusinessId}/loyalty`);

    // The card is the thing being sold, so the editor is open to everyone:
    // a Free business can design one and see what it looks like.
    await expect(page.getByRole("heading", { name: "Reward your regulars" })).toBeVisible();
    await expect(page.locator("#stamps-required:visible")).toBeVisible();
    await expect(page.locator("#reward:visible")).toBeVisible();

    // Putting it in front of customers is what Pro buys.
    await expect(page.getByText(/pro feature/i)).toBeVisible();
    await expect(page.getByRole("button", { name: "Start free trial to publish" })).toBeVisible();
});

test("a visitor who isn't signed in is offered the two doors, not a form", async ({ page }) => {
    const { businessId } = JSON.parse(fs.readFileSync(STATE_PATH, "utf8"));
    const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
        auth: { autoRefreshToken: false, persistSession: false },
    });

    // Its own card, so this doesn't stand on one another test left behind.
    const { data: open } = await admin
        .from("loyalty_programs")
        .select("id")
        .eq("business_id", businessId)
        .eq("is_active", true)
        .is("closed_at", null);
    for (const row of open ?? []) {
        await admin.from("loyalty_programs").update({ closed_at: new Date().toISOString() }).eq("id", row.id);
    }

    const { data: seeded } = await admin
        .from("loyalty_programs")
        .insert({
            business_id: businessId,
            name: `E2E Visitor card ${Date.now()}`,
            stamps_required: 7,
            reward: "a free coffee",
            is_active: true,
        })
        .select("id")
        .single();

    try {
        await page.goto(`/businesses/${businessId}`);
        const loyalty = page.locator('[id^="loyalty-"]').first();
        await expect(loyalty).toBeVisible();

        // The same two doors as claiming an offer, and no form: nobody
        // has to type a name and an email before they have said yes.
        await expect(loyalty.locator("input[name=name], input[name=email]")).toHaveCount(0);

        const login = loyalty.getByRole("button", { name: "Log in to get your card" });
        const signUp = loyalty.getByRole("link", { name: "Create a free account" });
        await expect(login).toBeVisible();
        await expect(signUp).toBeVisible();

        // Both carry what was pressed, so it can be finished afterwards.
        for (const door of [login, signUp]) {
            const href = await door.getAttribute("href");
            expect(decodeURIComponent(href ?? ""), "carries ?join=1 back to this page").toMatch(
                /next=\/businesses\/[a-z0-9-]+\?join=1$/,
            );
        }
    } finally {
        await admin.from("loyalty_programs").delete().eq("id", seeded!.id);
    }
});

test("a scanned card lands on its own page, all of it on a phone", async ({ browser }) => {
    test.setTimeout(120_000);
    const { businessId } = JSON.parse(fs.readFileSync(STATE_PATH, "utf8"));
    const client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
        auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: open } = await client
        .from("loyalty_programs").select("id")
        .eq("business_id", businessId).eq("is_active", true).is("closed_at", null);
    for (const row of open ?? []) {
        await client.from("loyalty_programs").update({ closed_at: new Date().toISOString() }).eq("id", row.id);
    }

    const { data: program } = await client
        .from("loyalty_programs")
        .insert({
            business_id: businessId,
            name: `E2E Card page ${Date.now()}`,
            stamps_required: 8,
            reward: "a free coffee",
            terms: "One stamp per visit.",
            card_colour: "navy",
            stamp_icon: "coffee",
            is_active: true,
        })
        .select("id")
        .single();

    const { data: code } = await client
        .from("qr_codes")
        .insert({ business_id: businessId, label: `E2E card page ${Date.now()}`, loyalty_program_id: program!.id })
        .select("code")
        .single();

    try {
        // The shortest phone anybody is holding at a counter.
        const page = await (
            await browser.newContext({ storageState: CUSTOMER_AUTH, viewport: { width: 375, height: 667 } })
        ).newPage();

        await page.goto(`/q/${code!.code}`);
        await page.waitForURL(/\/loyalty\//, { timeout: 25_000 });

        const card = page.locator("article").first();
        await expect(card).toBeVisible({ timeout: 20_000 });

        // The whole card — the stamps, the code and the QR under it —
        // inside the screen of the shortest phone anybody is holding,
        // without scrolling.
        const box = await card.boundingBox();
        expect(box!.y, "nothing above it but the header").toBeLessThan(120);
        expect(box!.y + box!.height, "and its last line is on screen").toBeLessThan(667);

        // Nothing else on the page to read past.
        await expect(page.getByText("Get a birthday treat")).toHaveCount(0);
        await expect(page.getByRole("link", { name: "All my loyalty cards" })).toBeVisible();
    } finally {
        await client.from("qr_codes").delete().eq("code", code!.code);
        await client.from("loyalty_programs").delete().eq("id", program!.id);
    }
});

test("both lists on the loyalty page turn a page at a time", async ({ browser }) => {
    test.setTimeout(180_000);
    const { businessId } = JSON.parse(fs.readFileSync(STATE_PATH, "utf8"));
    const client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
        auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: open } = await client
        .from("loyalty_programs").select("id")
        .eq("business_id", businessId).eq("is_active", true).is("closed_at", null);
    for (const row of open ?? []) {
        await client.from("loyalty_programs").update({ closed_at: new Date().toISOString() }).eq("id", row.id);
    }

    const stamp = Date.now();
    const made: string[] = [];

    // Seven closed cards and one on offer, so both lists have pages.
    for (let index = 0; index < 7; index += 1) {
        const { data } = await client
            .from("loyalty_programs")
            .insert({
                business_id: businessId,
                name: `E2E Old card ${stamp}-${index}`,
                stamps_required: 6,
                reward: "a free coffee",
                is_active: true,
                closed_at: new Date().toISOString(),
            })
            .select("id")
            .single();
        made.push(data!.id);
    }

    const { data: live } = await client
        .from("loyalty_programs")
        .insert({
            business_id: businessId,
            name: `E2E Live card ${stamp}`,
            stamps_required: 6,
            reward: "a free coffee",
            is_active: true,
        })
        .select("id")
        .single();
    made.push(live!.id);

    // Twelve cards issued, so the issued list has two pages.
    const holders = Array.from({ length: 12 }, (_, index) => ({
        program_id: live!.id,
        guest_token: crypto.randomUUID(),
        guest_name: `E2E holder ${index}`,
        guest_email: `e2e_holder_${stamp}_${index}@test.internal`,
    }));
    const { error: seeded } = await client.from("loyalty_cards").insert(holders);
    expect(seeded, "the holders were seeded").toBeNull();

    const page = await (await browser.newContext({ storageState: BUSINESS_AUTH })).newPage();

    try {
        await page.goto(`/business/${businessId}/loyalty`);

        const issued = page.locator("#issued");
        await expect(issued).toBeVisible({ timeout: 20_000 });

        // Ten to a page, and the date says what happened: a card was
        // issued to somebody, which is the business's side of joining.
        await expect(issued.getByRole("listitem")).toHaveCount(10);
        await expect(issued.getByText("Page 1 of 2")).toBeVisible();
        await expect(issued.getByText(/^Issued \d+ \w+$/).first()).toBeVisible();

        const collecting = page.locator("#collecting");
        await expect(collecting.getByRole("listitem")).toHaveCount(5);
        await expect(collecting.getByText("Page 1 of 2")).toBeVisible();

        // Turning one page leaves the other where it was.
        await issued.getByRole("button", { name: "Next" }).click();
        await page.waitForURL(/issued=2/, { timeout: 15_000 });
        await expect(page.locator("#issued").getByRole("listitem")).toHaveCount(2);
        await expect(page.locator("#collecting").getByText("Page 1 of 2")).toBeVisible();

        await page.locator("#collecting").getByRole("button", { name: "Next" }).click();
        await page.waitForURL(/collecting=2/, { timeout: 15_000 });
        await expect(page.locator("#collecting").getByRole("listitem")).toHaveCount(2);
        await expect(page.locator("#issued").getByText("Page 2 of 2"), "and keeps the first").toBeVisible();
    } finally {
        for (const id of made) await client.from("loyalty_programs").delete().eq("id", id);
    }
});

// Staff stamping a card should be looking at the card the customer is
// holding out, not a drawing of one in the default colours.
test("the stamping page shows the card itself, and the dashboard links to it", async ({ browser }) => {
    test.setTimeout(120_000);
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
            name: `E2E Staff view ${Date.now()}`,
            stamps_required: 8,
            reward: "a free coffee",
            terms: "One stamp per visit.",
            card_colour: "custom",
            card_header: "#0B5FFF",
            card_accent: "#FFD400",
            stamp_icon: "coffee",
            is_active: true,
        })
        .select("id")
        .single();

    // A customer holding one.
    const customer = await (await browser.newContext({ storageState: CUSTOMER_AUTH })).newPage();
    await customer.goto(`/businesses/${businessId}`);
    await customer.getByRole("button", { name: "Join the loyalty card" }).click();
    await customer.waitForURL(/\/loyalty\/[0-9a-f-]+$/, { timeout: 20_000 });
    const code = (await customer.locator("p.font-mono").first().textContent())?.trim() ?? "";

    const staff = await (await browser.newContext({ storageState: BUSINESS_AUTH })).newPage();

    try {
        // The dashboard lists it, with a way to open it.
        await staff.goto(`/business/${businessId}/loyalty`);
        const row = staff.getByRole("listitem").filter({ hasText: code });
        await expect(row).toBeVisible({ timeout: 20_000 });
        await row.getByRole("button", { name: "Show card" }).click();

        await staff.waitForURL(`**/stamp/${code}`, { timeout: 20_000 });

        // The card as the customer carries it: their colours, their
        // stamp, their code — and the button to stamp it.
        const card = staff.locator("article").first();
        await expect(card).toContainText("8 stamps for a free coffee");
        await expect(card).toContainText(code);
        await expect(card.locator("div").first()).toHaveCSS("background-color", "rgb(11, 95, 255)");
        await expect(staff.getByRole("button", { name: "Add a stamp" })).toBeVisible();

        // The business's own header and footer, not the customer's.
        await expect(staff.getByRole("contentinfo").getByRole("button", { name: "Customer area" })).toBeVisible();
    } finally {
        await client.from("loyalty_programs").delete().eq("id", program!.id);
    }
});

// All three ways of asking end in the same place, and asking for a card
// somebody already holds is not a failure — a page left open in another
// tab, or a poster scanned on the way past every week.
test("asking twice for the same card is not an error", async ({ browser }) => {
    test.setTimeout(120_000);
    const { businessId, customerUserId } = JSON.parse(fs.readFileSync(STATE_PATH, "utf8"));
    const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
        auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: open } = await admin
        .from("loyalty_programs")
        .select("id")
        .eq("business_id", businessId)
        .eq("is_active", true)
        .is("closed_at", null);
    for (const row of open ?? []) {
        await admin.from("loyalty_programs").update({ closed_at: new Date().toISOString() }).eq("id", row.id);
    }

    const { data: program } = await admin
        .from("loyalty_programs")
        .insert({
            business_id: businessId,
            name: `E2E Twice ${Date.now()}`,
            stamps_required: 5,
            reward: "a free coffee",
            is_active: true,
        })
        .select("id")
        .single();

    const page = await (await browser.newContext({ storageState: CUSTOMER_AUTH })).newPage();

    try {
        await page.goto(`/businesses/${businessId}`);
        await page.getByRole("button", { name: "Join the loyalty card" }).click();
        await page.waitForURL(/\/loyalty\/[0-9a-f-]+$/, { timeout: 20_000 });

        // The same press again, from a page that hasn't caught up.
        await page.goBack();
        await page.getByRole("button", { name: "Join the loyalty card" }).click();
        await page.waitForURL(/\/loyalty\/[0-9a-f-]+$/, { timeout: 20_000 });
        await expect(page.getByText(/isn't available right now/)).toHaveCount(0);

        const { count } = await admin
            .from("loyalty_cards")
            .select("id", { count: "exact", head: true })
            .eq("program_id", program!.id)
            .eq("user_id", customerUserId);
        expect(count, "one card, not two").toBe(1);
    } finally {
        await admin.from("loyalty_programs").delete().eq("id", program!.id);
    }
});

// Pressing "Log in to get your card" is one thing asked for, not two:
// the card is theirs by the time they land on it.
test("logging in from the card panel joins the card and lands on it", async ({ page }) => {
    test.setTimeout(120_000);
    const { businessId } = JSON.parse(fs.readFileSync(STATE_PATH, "utf8"));
    const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
        auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: open } = await admin
        .from("loyalty_programs")
        .select("id")
        .eq("business_id", businessId)
        .eq("is_active", true)
        .is("closed_at", null);
    for (const row of open ?? []) {
        await admin.from("loyalty_programs").update({ closed_at: new Date().toISOString() }).eq("id", row.id);
    }

    const { data: program } = await admin
        .from("loyalty_programs")
        .insert({
            business_id: businessId,
            name: `E2E Join on sign-in ${Date.now()}`,
            stamps_required: 6,
            reward: "a free coffee",
            is_active: true,
        })
        .select("id")
        .single();

    const email = `e2e_join_${Date.now()}@test.internal`;
    const { data: created, error } = await admin.auth.admin.createUser({
        email,
        email_confirm: true,
        user_metadata: { full_name: "Jo Joiner" },
    });
    expect(error).toBeNull();

    try {
        await page.goto(`/businesses/${businessId}`);
        const loyalty = page.locator('[id^="loyalty-"]').first();
        await loyalty.getByRole("button", { name: "Log in to get your card" }).click();

        await page.waitForURL(/\/login\?next=/, { timeout: 20_000 });
        await enterSignInCode(page, email);

        // Straight to the card, already theirs.
        await page.waitForURL(/\/loyalty\/[0-9a-f-]+$/, { timeout: 25_000 });
        await expect(page.getByText("6 stamps for a free coffee")).toBeVisible();

        const { data: card } = await admin
            .from("loyalty_cards")
            .select("id")
            .eq("program_id", program!.id)
            .eq("user_id", created.user!.id)
            .maybeSingle();
        expect(card, "the card was made for them").not.toBeNull();
    } finally {
        await admin.from("loyalty_programs").delete().eq("id", program!.id);
        await admin.auth.admin.deleteUser(created.user!.id);
    }
});

// One card each, for now. The table and the screens can carry more, so
// this is a decision waiting to be taken rather than a wall.
test("a business runs one loyalty card, and stamps from the same page", async ({ browser }) => {
    test.setTimeout(120_000);

    const { businessId } = JSON.parse(fs.readFileSync(STATE_PATH, "utf8"));
    const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
        auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: seeded } = await admin
        .from("loyalty_programs")
        .insert({
            business_id: businessId,
            name: `E2E One card ${Date.now()}`,
            stamps_required: 7,
            reward: "a free coffee",
            is_active: true,
        })
        .select("id, name")
        .single();

    try {
        const page = await (await browser.newContext({ storageState: BUSINESS_AUTH })).newPage();
        await page.goto(`/business/${businessId}/loyalty`);

    // Where another card used to be offered, staff stamp one. The panel
    // is the first thing under the page's own heading now: "Your
    // loyalty cards" above a single card said nothing twice.
    await expect(page.getByRole("heading", { name: "Reward your regulars" })).toBeVisible({
        timeout: 20_000,
    });
    await expect(page.getByText("Stamp a card")).toBeVisible();
    await expect(page.getByRole("button", { name: "Find card" })).toBeVisible();

    // The camera, for staff already holding a phone. Whether it opens
    // depends on the device, so what is checked here is that asking for
    // it says something either way rather than failing silently.
    await page.getByRole("button", { name: "Scan a card" }).click();
    const scanner = page.getByRole("dialog");
    await expect(scanner.getByText("Scan the customer's card")).toBeVisible();

        // Either the viewfinder or the reason there isn't one — what is
        // not allowed is a dialog that opens on nothing.
        const viewfinder = await scanner.locator("video").count();
        const refused = await scanner.getByText(/camera/i).count();
        expect(viewfinder + refused).toBeGreaterThan(0);

        await page.keyboard.press("Escape");
    await expect(page.getByText("Add another card")).toHaveCount(0);

        // The page that makes a card is where the deal is changed, and
        // it says what that costs the people already collecting.
        await page.goto(`/business/${businessId}/loyalty/new`);
        await expect(page.getByRole("heading", { name: "Start a new card" })).toBeVisible({
            timeout: 20_000,
        });
        await expect(page.getByText(`${seeded!.name} stops being handed out`)).toBeVisible();

        // The card itself is changed on its own page.
        await page.goto(`/business/${businessId}/loyalty/${seeded!.id}/edit`);
        await expect(page.getByRole("heading", { name: seeded!.name, level: 1 })).toBeVisible({
            timeout: 20_000,
        });
        // Pause is gone: a card is either handed out or it isn't, and
        // either way the people holding one keep collecting.
        await expect(page.getByRole("button", { name: "Stop handing this out" })).toBeVisible();
    } finally {
        await admin.from("loyalty_programs").delete().eq("id", seeded!.id);
    }
});

// The whole promise, end to end: a card is joined and stamped, the deal
// changes, and the people holding the old card are left exactly where
// they were.
test("changing the deal leaves the old card's holders alone", async ({ browser }) => {
    test.setTimeout(180_000);

    const { businessId, businessSlug } = JSON.parse(fs.readFileSync(STATE_PATH, "utf8"));
    const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
        auth: { autoRefreshToken: false, persistSession: false },
    });

    const run = Date.now();
    const firstName = `E2E Old deal ${run}`;
    const secondName = `E2E New deal ${run}`;
    const made: string[] = [];

    try {
        // A card on offer, with somebody collecting it.
        const { data: first } = await admin
            .from("loyalty_programs")
            .insert({
                business_id: businessId,
                name: firstName,
                stamps_required: 5,
                reward: "A free coffee",
                is_active: true,
            })
            .select("id")
            .single();
        made.push(first!.id);

        const business = await (await browser.newContext({ storageState: BUSINESS_AUTH })).newPage();
        const customer = await (await browser.newContext({ storageState: CUSTOMER_AUTH })).newPage();

        await customer.goto(`/businesses/${businessSlug}`);
        await customer.getByRole("button", { name: "Join the loyalty card" }).click();
        await customer.waitForURL(/\/loyalty\/[0-9a-f-]+$/, { timeout: 20_000 });

        const code = (await customer.locator("p.font-mono").first().textContent())?.trim() ?? "";
        expect(code).toMatch(/^[A-Z0-9]{10}$/);

        await business.goto(`/stamp/${code}`);
        await business.getByRole("button", { name: "Add a stamp" }).click();
        await expect(business.getByText("Stamp added")).toBeVisible({ timeout: 15_000 });

        // The business changes the deal.
        await business.goto(`/business/${businessId}/loyalty/new`);
        await expect(business.getByText(`${firstName} stops being handed out`)).toBeVisible({
            timeout: 20_000,
        });
        await expect(business.getByText(/1 customer is collecting 5 stamps/)).toBeVisible();

        await business.locator("#card-name:visible").fill(secondName);
        await business.locator("#stamps-required:visible").selectOption("8");
        await business.locator("#reward:visible").fill("A free lunch");
        await business.getByRole("button", { name: "Start the new card" }).click();
        await business.waitForURL(`**/business/${businessId}/loyalty?saved=1`, { timeout: 25_000 });

        const { data: cards } = await admin
            .from("loyalty_programs")
            .select("id, name, closed_at, is_active")
            .eq("business_id", businessId)
            .in("name", [firstName, secondName]);

        const old = cards!.find((card) => card.name === firstName)!;
        const fresh = cards!.find((card) => card.name === secondName)!;
        made.push(fresh.id);

        expect(old.closed_at, "the old card stopped being handed out").not.toBeNull();
        expect(old.is_active, "and still works for the people holding it").toBe(true);
        expect(fresh.closed_at, "the new card is the one on offer").toBeNull();

        // The dashboard says which is which.
        await expect(business.getByText("Still being collected")).toBeVisible({ timeout: 20_000 });
        await expect(
            business.getByRole("listitem").filter({ hasText: firstName }),
        ).toBeVisible();
        await expect(business.getByText("On offer")).toBeVisible();

        // The old holder is stamped exactly as before.
        await business.goto(`/stamp/${code}`);
        await admin
            .from("loyalty_cards")
            .update({ last_stamped_at: new Date(Date.now() - 20 * 60_000).toISOString() })
            .eq("card_code", code);
        await business.reload();
        await business.getByRole("button", { name: "Add a stamp" }).click();
        await expect(business.getByText("Stamp added")).toBeVisible({ timeout: 15_000 });
        await expect(business.getByText("2 of 5 stamps")).toBeVisible();

        // A customer arriving now is offered the new deal, and only it.
        const visitor = await (await browser.newContext()).newPage();
        await visitor.goto(`/businesses/${businessSlug}`);
        await expect(visitor.getByText("Collect 8 stamps, get a free lunch")).toBeVisible({
            timeout: 20_000,
        });
        await expect(visitor.getByText("Collect 5 stamps, get a free coffee")).toHaveCount(0);

        // And the old card's terms can't be rewritten under its holder.
        const owner = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
            { auth: { autoRefreshToken: false, persistSession: false } },
        );
        const state = JSON.parse(fs.readFileSync(STATE_PATH, "utf8"));
        await owner.auth.signInWithPassword({ email: state.businessEmail, password: state.testPassword });

        const rewritten = await owner
            .from("loyalty_programs")
            .update({ stamps_required: 20 })
            .eq("id", old.id);
        expect(rewritten.error?.code, "the deal is frozen in the database").toBe("P0006");

        // Its name is not the promise, so that still moves.
        const renamed = await owner
            .from("loyalty_programs")
            .update({ name: `${firstName} (old)` })
            .eq("id", old.id);
        expect(renamed.error, "the name is not the promise").toBeNull();
    } finally {
        for (const id of made) await admin.from("loyalty_programs").delete().eq("id", id);
    }
});

// Editing a card draws it beside the fields, because a colour and a
// stamp are choices nobody can make from their names alone.
test("the card on the edit page follows what is typed", async ({ browser }) => {
    const { businessId } = JSON.parse(fs.readFileSync(STATE_PATH, "utf8"));
    const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
        auth: { autoRefreshToken: false, persistSession: false },
    });

    // One card per business takes joiners, so make room for this one.
    const { data: onOffer } = await admin
        .from("loyalty_programs")
        .select("id")
        .eq("business_id", businessId)
        .eq("is_active", true)
        .is("closed_at", null);
    for (const row of onOffer ?? []) {
        await admin.from("loyalty_programs").update({ closed_at: new Date().toISOString() }).eq("id", row.id);
    }

    const { data: program } = await admin
        .from("loyalty_programs")
        .insert({
            business_id: businessId,
            name: `E2E Live preview ${Date.now()}`,
            stamps_required: 9,
            reward: "A free coffee",
            card_colour: "navy",
            stamp_icon: "coffee",
            is_active: true,
        })
        .select("id")
        .single();

    const page = await (await browser.newContext({ storageState: BUSINESS_AUTH })).newPage();

    try {
        await page.goto(`/business/${businessId}/loyalty/${program!.id}/edit`);

        const preview = page.locator("aside").filter({ hasText: "The card customers carry" });
        await expect(preview).toContainText("9 stamps for a free coffee", { timeout: 20_000 });

        await page.locator("#reward").fill("A free pastry");
        await expect(preview).toContainText("9 stamps for a free pastry");

        await page.locator("#stamps-required").selectOption("5");
        await expect(preview).toContainText("5 stamps for a free pastry");
        await expect(preview).toContainText("3 of 5 stamps");

        // Eight to a row, so a card of eight is one row and nine is
        // eight and one, rather than wherever the width ran out.
        await page.locator("#stamps-required").selectOption("12");
        const stampRow = preview.getByRole("img", { name: /of 12 stamps collected/ });
        await expect(stampRow).toHaveCSS("grid-template-columns", /(\S+ ){7}\S+$/);

        // Nothing is saved until it is saved.
        const { data: unchanged } = await admin
            .from("loyalty_programs")
            .select("reward, stamps_required")
            .eq("id", program!.id)
            .single();
        expect(unchanged).toEqual({ reward: "A free coffee", stamps_required: 9 });
    } finally {
        await admin.from("loyalty_programs").delete().eq("id", program!.id);
    }
});

// A closed card keeps hold of its name. Two cards called "Coffee card",
// one still being collected and one on offer, can only be told apart by
// where they sit on the page.
test("a name a closed card is still using is refused", async ({ browser }) => {
    const { businessId } = JSON.parse(fs.readFileSync(STATE_PATH, "utf8"));
    const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
        auth: { autoRefreshToken: false, persistSession: false },
    });
    const taken = `E2E Retired card ${Date.now()}`;
    const made: string[] = [];

    const { data: onOffer } = await admin
        .from("loyalty_programs")
        .select("id")
        .eq("business_id", businessId)
        .eq("is_active", true)
        .is("closed_at", null);
    for (const row of onOffer ?? []) {
        await admin.from("loyalty_programs").update({ closed_at: new Date().toISOString() }).eq("id", row.id);
    }

    // One closed card holding the name, and one on offer to rename.
    const { data: retired } = await admin
        .from("loyalty_programs")
        .insert({
            business_id: businessId,
            name: taken,
            stamps_required: 6,
            reward: "A free tea",
            is_active: true,
            closed_at: new Date().toISOString(),
        })
        .select("id")
        .single();
    made.push(retired!.id);

    const { data: current } = await admin
        .from("loyalty_programs")
        .insert({
            business_id: businessId,
            name: `${taken} two`,
            stamps_required: 6,
            reward: "A free tea",
            is_active: true,
        })
        .select("id")
        .single();
    made.push(current!.id);

    const page = await (await browser.newContext({ storageState: BUSINESS_AUTH })).newPage();

    try {
        // The database refuses it outright.
        const clash = await admin.from("loyalty_programs").update({ name: taken }).eq("id", current!.id);
        expect(clash.error?.code, "one name per business, closed cards included").toBe("23505");

        // And the dashboard says so in words rather than failing quietly.
        await page.goto(`/business/${businessId}/loyalty/${current!.id}/edit`);
        await page.locator("#card-name").fill(taken);
        await page.getByRole("button", { name: "Save changes" }).click();

        await page.waitForURL(`**/business/${businessId}/loyalty?error=name`, { timeout: 20_000 });
        await expect(page.getByText(/You have had a card with that name before/)).toBeVisible();

        const { data: kept } = await admin
            .from("loyalty_programs")
            .select("name")
            .eq("id", current!.id)
            .single();
        expect(kept!.name, "the card kept its own name").toBe(`${taken} two`);
    } finally {
        for (const id of made) await admin.from("loyalty_programs").delete().eq("id", id);
    }
});

// A business's own two colours, and a stamp that looks like what it
// sells. Both are chosen in the same picker the poster uses.
test("a card can be saved in the business's own colours, with any stamp", async ({ browser }) => {
    const { businessId } = JSON.parse(fs.readFileSync(STATE_PATH, "utf8"));
    const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
        auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: onOffer } = await admin
        .from("loyalty_programs")
        .select("id")
        .eq("business_id", businessId)
        .eq("is_active", true)
        .is("closed_at", null);
    for (const row of onOffer ?? []) {
        await admin.from("loyalty_programs").update({ closed_at: new Date().toISOString() }).eq("id", row.id);
    }

    const { data: program } = await admin
        .from("loyalty_programs")
        .insert({
            business_id: businessId,
            name: `E2E Own colours ${Date.now()}`,
            stamps_required: 9,
            reward: "A free trim",
            card_colour: "navy",
            stamp_icon: "check",
            is_active: true,
        })
        .select("id")
        .single();

    const page = await (await browser.newContext({ storageState: BUSINESS_AUTH })).newPage();

    try {
        await page.goto(`/business/${businessId}/loyalty/${program!.id}/edit`);

        await page.getByRole("button", { name: "Your own colours" }).click();
        const dialog = page.getByRole("dialog");
        await dialog.getByLabel("Band colour, as a hex code").fill("#0B5FFF");
        await dialog.getByLabel("Stamps colour, as a hex code").fill("#FFD400");
        await dialog.getByRole("button", { name: "Use these colours" }).click();
        await expect(dialog).toBeHidden();

        // A stamp for a barber, which the six icons never had.
        await page.getByRole("button", { name: "Scissors" }).click();

        const preview = page.locator("aside").filter({ hasText: "The card customers carry" });
        // The band is the card's first child; the aside's is a wrapper.
        await expect(preview.locator("article > div").first()).toHaveCSS(
            "background-color",
            "rgb(11, 95, 255)",
        );

        await page.getByRole("button", { name: "Save changes" }).click();
        await page.waitForURL(`**/business/${businessId}/loyalty?saved=1`, { timeout: 20_000 });

        const { data: saved } = await admin
            .from("loyalty_programs")
            .select("card_colour, card_header, card_accent, stamp_icon")
            .eq("id", program!.id)
            .single();
        expect(saved).toEqual({
            card_colour: "custom",
            card_header: "#0B5FFF",
            card_accent: "#FFD400",
            stamp_icon: "scissors",
        });

        // And the card a customer would see is drawn in them — the same
        // card as the preview, down to the sample code and its QR.
        await page.goto(`/business/${businessId}/loyalty`);
        const card = page.locator("article").filter({ hasText: "stamps for a free trim" }).first();
        await expect(card.locator("div").first()).toHaveCSS("background-color", "rgb(11, 95, 255)");
        await expect(card).toContainText("4F8A2C91D0");
        await expect(card.locator("svg").last()).toBeVisible();

        // Back on one of the six, the hexes are cleared rather than left
        // behind for a card that is no longer custom.
        await page.goto(`/business/${businessId}/loyalty/${program!.id}/edit`);
        await page.getByRole("button", { name: "Forest" }).click();
        await page.getByRole("button", { name: "Save changes" }).click();
        await page.waitForURL(`**/business/${businessId}/loyalty?saved=1`, { timeout: 20_000 });

        const { data: named } = await admin
            .from("loyalty_programs")
            .select("card_colour, card_header, card_accent")
            .eq("id", program!.id)
            .single();
        expect(named).toEqual({ card_colour: "forest", card_header: null, card_accent: null });
    } finally {
        await admin.from("loyalty_programs").delete().eq("id", program!.id);
    }
});
