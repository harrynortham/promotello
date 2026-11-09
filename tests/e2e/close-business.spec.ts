import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import { STATE_PATH, BUSINESS_AUTH } from "../global-setup";

test.use({ storageState: BUSINESS_AUTH });

// Closing one business when you run several. The promise is that nothing is
// destroyed: a customer's card keeps naming the shop, and a poster already
// in a window still opens a page that explains.

function ownerClient(state: { businessEmail: string; testPassword: string }) {
    const client = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
        { auth: { autoRefreshToken: false, persistSession: false } },
    );

    return client.auth
        .signInWithPassword({ email: state.businessEmail, password: state.testPassword })
        .then(() => client);
}

function adminClient() {
    return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
        auth: { persistSession: false },
    });
}

async function seedBusiness(admin: ReturnType<typeof adminClient>, ownerId: string, name: string) {
    const { data: business } = await admin
        .from("businesses")
        .insert({
            name,
            slug: `e2e-close-${Date.now()}`,
            category: "Testing",
            description: "Automated test business — safe to delete.",
            approval_status: "approved",
            created_by: ownerId,
        })
        .select("id, slug")
        .single();

    await admin.from("business_members").insert({
        business_id: business!.id,
        user_id: ownerId,
        role: "owner",
    });

    return business!;
}

test("an owner closes one business, and everything else carries on", async ({ page }) => {
    const state = JSON.parse(fs.readFileSync(STATE_PATH, "utf8"));
    const admin = adminClient();
    const name = `E2E Closing Business ${Date.now()}`;
    const business = await seedBusiness(admin, state.businessUserId, name);

    try {
        await page.goto(`/business/${business.id}/settings`);
        await page.getByRole("button", { name: "Close this business" }).click();

        const confirm = page.getByRole("button", { name: `Close ${name}` });
        await expect(confirm).toBeDisabled();

        // Typing something else is not a confirmation.
        await page.getByLabel(/Type/).fill("Some Other Business");
        await expect(confirm).toBeDisabled();

        await page.getByLabel(/Type/).fill(name);
        await expect(confirm).toBeEnabled();
        await confirm.click();

        // Lands on the chooser, because they may well run others.
        await page.waitForURL(/\/business\/dashboard/, { timeout: 15_000 });

        const { data: closed } = await admin
            .from("businesses")
            .select("closed_at")
            .eq("id", business.id)
            .single();
        expect(closed!.closed_at).not.toBeNull();

        // The public page says what happened, by name, because its posters
        // are still up.
        await page.goto(`/businesses/${business.slug}`);
        await expect(page.getByRole("heading", { name: new RegExp(`${name} isn`) })).toBeVisible({
            timeout: 10_000,
        });

        // The owner can put it back.
        await page.goto(`/business/${business.id}`);
        await expect(page.getByText("This business is closed")).toBeVisible({ timeout: 10_000 });
        await page.getByRole("button", { name: `Reopen ${name}` }).click();

        await expect(page.getByText("is open again")).toBeVisible({ timeout: 15_000 });

        const { data: reopened } = await admin
            .from("businesses")
            .select("closed_at")
            .eq("id", business.id)
            .single();
        expect(reopened!.closed_at).toBeNull();
    } finally {
        await admin.from("businesses").delete().eq("id", business.id);
    }
});

test("a closed business keeps its customers' records, and takes no new ones", async () => {
    const state = JSON.parse(fs.readFileSync(STATE_PATH, "utf8"));
    const admin = adminClient();
    const name = `E2E Closed Records ${Date.now()}`;
    const business = await seedBusiness(admin, state.businessUserId, name);

    // A loyalty card is part of Pro, so the seeded business needs one.
    const stamp = Date.now();
    const { error: subscriptionError } = await admin.from("subscriptions").insert({
        business_id: business.id,
        stripe_subscription_id: `sub_e2e_close_${stamp}`,
        stripe_customer_id: `cus_e2e_close_${stamp}`,
        status: "active",
    });
    expect(subscriptionError, "could not seed a Pro subscription").toBeNull();

    const { data: program, error: programError } = await admin
        .from("loyalty_programs")
        .insert({
            business_id: business.id,
            name: "Closing card",
            stamps_required: 5,
            reward: "A free coffee",
            terms: "For automated tests only.",
            is_active: true,
        })
        .select("id")
        .single();

    expect(programError, "could not seed a loyalty card").toBeNull();

    try {
        // A customer who joined before it closed.
        const { data: card } = await admin
            .from("loyalty_cards")
            .insert({ program_id: program!.id, user_id: state.customerUserId, stamps: 3 })
            .select("id")
            .single();

        const owner = await ownerClient(state);
        const { error: closeError } = await owner.rpc("close_business", {
            requested_business_id: business.id,
        });
        expect(closeError).toBeNull();

        // Their stamps are still there, and still name the shop.
        const { data: kept } = await admin
            .from("loyalty_cards")
            .select("stamps, loyalty_programs ( businesses ( name ) )")
            .eq("id", card!.id)
            .single();

        expect(kept!.stamps).toBe(3);
        const program_ = kept!.loyalty_programs as unknown as { businesses: { name: string } };
        expect(program_.businesses.name).toBe(name);

        // But nobody new joins. Service role walks past RLS, so this is the
        // trigger answering, which is the point of it being a trigger.
        const { error } = await admin
            .from("loyalty_cards")
            .insert({ program_id: program!.id, user_id: state.businessUserId });

        expect(
            error?.code,
            "supabase/migrations/20261207150000_closing_a_business.sql isn't applied",
        ).toBe("P0007");
    } finally {
        await admin.from("businesses").delete().eq("id", business.id);
    }
});
