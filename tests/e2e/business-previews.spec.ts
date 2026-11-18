import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import { previewLink } from "../../lib/previews";
import { STATE_PATH, BUSINESS_AUTH } from "../global-setup";
import { enterSignInCode } from "../sign-in";

const options = { auth: { autoRefreshToken: false, persistSession: false } };
const admin = () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, options);
const password = "E2e-Preview-Pass-123!";

test("an admin builds a preview, and the owner claims it", async ({ browser }) => {
    test.setTimeout(90_000);
    const { businessUserId } = JSON.parse(fs.readFileSync(STATE_PATH, "utf8"));
    const name = `E2E Preview Bakery ${Date.now()}`;
    const ownerEmail = `e2e-preview-owner-${Date.now()}@test.internal`;
    let businessId: string | undefined;
    let ownerId: string | undefined;

    await admin().from("platform_admins").insert({ user_id: businessUserId });

    try {
        // 1. The admin writes the lead down, then builds its page.
        //
        // A preview is built from a lead now, so everything about
        // reaching them — the name, who to write to, the address — is
        // typed once, here, and the build page only asks what a lead
        // cannot answer.
        const adminPage = await (await browser.newContext({ storageState: BUSINESS_AUTH })).newPage();
        await adminPage.goto("/admin/sales/new");
        await adminPage.locator("#name").fill(name);
        await adminPage.locator("#categoryId option").nth(1).waitFor({ state: "attached" });
        await adminPage.locator("#categoryId").selectOption({ index: 1 });
        await adminPage.locator("#addressLine1").fill("1 Test Street");
        await adminPage.locator("#region").selectOption("Bishopston");
        await adminPage.locator("#postalCode").fill("BS7 8AA");
        await adminPage.locator("#contactName").fill("Sam");
        await adminPage.getByRole("button", { name: "Add to the pipeline" }).click();

        await expect(adminPage.getByRole("heading", { name })).toBeVisible({ timeout: 15_000 });
        // Rendered as a link but exposed with role="button" by the Button
        // primitive, so match what is actually in the tree.
        await adminPage.getByRole("button", { name: "Build the preview" }).click();

        await adminPage.locator("#description").fill("A neighbourhood bakery on a test street.");
        await adminPage.locator("#sampleOffer").fill("Free cinnamon bun with any coffee");
        await adminPage.locator("#sampleReward").fill("a free loaf");
        await adminPage.getByRole("button", { name: "Build it" }).click();

        // Back on the lead, which is where the link and the sending live.
        await expect(adminPage.getByText("The link they get")).toBeVisible({ timeout: 20_000 });

        const { data: row } = await admin()
            .from("business_previews")
            .select("business_id, token, businesses!inner ( name, approval_status, slug )")
            .eq("businesses.name", name)
            .single();
        businessId = row!.business_id;
        const business = Array.isArray(row!.businesses) ? row!.businesses[0] : row!.businesses;
        expect(business.approval_status).toBe("pending");
        const previewPath = previewLink(row!.token, business.name);

        // Admins checking the page aren't counted as views.
        await adminPage.goto(previewPath);
        await expect(adminPage.getByRole("heading", { name: `Hi Sam, here's ${name} on Promotello.` })).toBeVisible();

        // 2. Customers can't see it.
        const visitor = await (await browser.newContext()).newPage();
        await visitor.goto(`/businesses/${business.slug}`);
        await expect(visitor.getByRole("heading", { name: /couldn.t find that place/ })).toBeVisible();

        // 3. The owner opens the link, signed out.
        await visitor.goto(previewPath);
        await expect(visitor.getByRole("heading", { name: `Hi Sam, here's ${name} on Promotello.` })).toBeVisible();
        // The card on the preview is LoyaltyCardScreen, which says it
        // this way; the business page's callout says "Collect 9 stamps,
        // get a free loaf".
        await expect(visitor.getByText("9 stamps for a free loaf")).toBeVisible();
        await expect(visitor.getByText("Free cinnamon bun with any coffee").first()).toBeVisible();

        const { data: viewed } = await admin().from("business_previews").select("view_count").eq("business_id", businessId).single();
        expect(viewed!.view_count).toBe(1);

        // 4. They sign in and claim it.
        const { data: created } = await admin().auth.admin.createUser({ email: ownerEmail, password, email_confirm: true });
        ownerId = created.user!.id;

        const owner = await (await browser.newContext()).newPage();
        await owner.goto(`/login?next=${encodeURIComponent(previewPath)}&email=${encodeURIComponent(ownerEmail)}`);
        // They pressed Claim, which asked them to sign in, so signing in
        // finishes it: they land on their business rather than back on the
        // page that sold it to them.
        await enterSignInCode(owner, ownerEmail);
        await owner.waitForURL(`**/business/setup/${businessId}?welcome=1`, { waitUntil: "commit", timeout: 30_000 });

        // Pressing Claim and signing in is where setting up starts, and the
        // funnel counts it: nothing else records that moment.
        const { data: started, error: startedError } = await admin()
            .from("onboarding_events")
            .select("step, event")
            .eq("user_id", ownerId)
            .eq("step", "signup_started");

        expect(
            startedError?.message ?? "",
            "apply supabase/migrations/20261211090000_onboarding_funnel.sql first",
        ).not.toMatch(/onboarding_events/);
        expect(started?.length, "the claim was recorded as a start").toBeGreaterThan(0);

        // The admin has left the team; the owner got a welcome email.
        const { data: members } = await admin().from("business_members").select("user_id, role").eq("business_id", businessId);
        expect(members).toEqual([{ user_id: ownerId, role: "owner" }]);

        const { data: sends } = await admin().from("business_lifecycle_sends").select("kind").eq("business_id", businessId);
        expect(sends!.map((send) => send.kind)).toContain("welcome");

        // The link now says it's been claimed.
        await visitor.goto(previewPath);
        await expect(visitor.getByRole("heading", { name: `${name} has an owner now.` })).toBeVisible();
        // Signed out, the way in is the thing to offer. (The header has a
        // Sign in button of its own, so this asks for the card's words.)
        await expect(visitor.getByText(/If that was you, sign in/)).toBeVisible();

        // The owner opening their own link again — which is how almost
        // everybody sees this page — gets their business, not a sign-in
        // button they have no use for.
        await owner.goto(previewPath);
        await expect(owner.getByRole("heading", { name: `${name} is yours.` })).toBeVisible();
        await expect(owner.getByRole("button", { name: "Sign in" })).toHaveCount(0);

        await owner.getByRole("button", { name: `Open ${name}` }).click();
        await owner.waitForURL(`**/business/${businessId}`, { waitUntil: "commit", timeout: 30_000 });

        // Signed in as somebody who isn't on this business — the admin,
        // who handed it over and left the team — gets the truth and a way
        // to say it wasn't them, and no sign-in button either.
        await adminPage.goto(previewPath);
        await expect(adminPage.getByText(/not by the account you.re signed in with/)).toBeVisible();
        await expect(adminPage.getByRole("button", { name: "Sign in" })).toHaveCount(0);
        await expect(adminPage.getByRole("button", { name: /It wasn.t me/ })).toBeVisible();
    } finally {
        await admin().from("platform_admins").delete().eq("user_id", businessUserId);
        // The lead the preview was built from, which the business no
        // longer takes with it: preview_business_id is set null on
        // delete, so the row would outlive the run.
        await admin().from("leads").delete().eq("name", name);
        if (businessId) await admin().from("businesses").delete().eq("id", businessId);
        if (ownerId) await admin().auth.admin.deleteUser(ownerId);
    }
});

test("an unknown preview link shows a friendly message", async ({ page }) => {
    await page.goto("/business/preview/00000000-0000-4000-8000-000000000000");
    await expect(page.getByRole("heading", { name: "This preview isn't available" })).toBeVisible();
});

// Pressing Claim used to land on a page headed "Win your next customer",
// offering to help them add their business and prepare their first offer
// — both of which we had already done, on the page they had just been
// looking at. The thing that sold them evaporated at the moment of
// highest intent (docs/LAUNCH-FUNNEL.md).
test("claiming a preview asks for a login to claim, not to start from nothing", async ({ page }) => {
    const claiming = `/business/register?next=${encodeURIComponent(
        previewLink("11111111-2222-3333-4444-555555555555", "Little Loaf"),
    )}`;

    await page.goto(claiming);
    await expect(page.getByRole("heading", { name: "Claim your page.", level: 1 })).toBeVisible({
        timeout: 30_000,
    });
    await expect(page.getByText("Your page is already built")).toBeVisible();
    await expect(page.getByText("prepare your first offer")).toHaveCount(0);

    // A business arriving cold has nothing built, so it still gets told
    // what is about to happen.
    await page.goto("/business/register");
    await expect(page.getByRole("heading", { name: "Win your next customer.", level: 1 })).toBeVisible({
        timeout: 30_000,
    });
    await expect(page.getByText("prepare your first offer")).toBeVisible();
});
