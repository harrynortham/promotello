import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

export const STATE_PATH = path.join(process.cwd(), "tests", ".test-state.json");
export const CUSTOMER_AUTH = path.join(process.cwd(), "tests", ".auth", "customer.json");
export const BUSINESS_AUTH = path.join(process.cwd(), "tests", ".auth", "business.json");

// Use a run-scoped suffix so parallel CI runs and re-runs never collide.
const RUN_ID = Date.now();
export const BUSINESS_EMAIL = `e2e_biz_${RUN_ID}@test.internal`;
export const CUSTOMER_EMAIL = `e2e_cust_${RUN_ID}@test.internal`;
export const TEST_PASSWORD = "E2eTestPass1!";

async function globalSetup() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
        throw new Error(
            "NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set to run E2E tests",
        );
    }

    const admin = createClient(supabaseUrl, serviceRoleKey, {
        auth: { autoRefreshToken: false, persistSession: false },
    });

    // Create test users with email pre-confirmed so no inbox flow is needed.
    const { data: bizData, error: bizErr } = await admin.auth.admin.createUser({
        email: BUSINESS_EMAIL,
        password: TEST_PASSWORD,
        email_confirm: true,
    });
    if (bizErr || !bizData.user) throw new Error(`Could not create business user: ${bizErr?.message}`);
    const businessUserId = bizData.user.id;

    const { data: custData, error: custErr } = await admin.auth.admin.createUser({
        email: CUSTOMER_EMAIL,
        password: TEST_PASSWORD,
        email_confirm: true,
    });
    if (custErr || !custData.user) throw new Error(`Could not create customer user: ${custErr?.message}`);
    const customerUserId = custData.user.id;

    // Create an approved business owned by the business user.
    const { data: business, error: bizInsertErr } = await admin
        .from("businesses")
        .insert({
            name: "E2E Test Business",
            category: "Testing",
            description: "Automated test business — safe to delete.",
            approval_status: "approved",
            created_by: businessUserId,
        })
        .select("id")
        .single();
    if (bizInsertErr || !business) throw new Error(`Could not create business: ${bizInsertErr?.message}`);

    await admin.from("business_members").insert({
        business_id: business.id,
        user_id: businessUserId,
        role: "owner",
    });

    // Put the main test business on Pro so the offer tests aren't limited
    // by the Free plan. Placeholder IDs: nothing is created in Stripe.
    const { error: subscriptionErr } = await admin.from("subscriptions").insert({
        business_id: business.id,
        stripe_subscription_id: `sub_e2e_${RUN_ID}`,
        stripe_customer_id: `cus_e2e_${RUN_ID}`,
        status: "active",
    });
    if (subscriptionErr) throw new Error(`Could not create Pro subscription: ${subscriptionErr.message}`);

    // A Free business that already has its 1 live offer, for the plan limit tests.
    const freeBusinessId = await createOwnedBusiness(admin, "E2E Free Business", businessUserId);
    const { error: freeOfferErr } = await admin.from("offers").insert({
        business_id: freeBusinessId,
        created_by: businessUserId,
        slug: `e2e-free-${RUN_ID}`,
        title: "E2E Free Plan Offer",
        category: "Testing",
        discount: "5% off",
        description: "The one live offer allowed on the Free plan.",
        availability: "Available now",
        expires_at: "2030-12-31",
        terms: "For automated tests only.",
        approval_status: "approved",
        redemption_count: 0,
    });
    if (freeOfferErr) throw new Error(`Could not create free plan offer: ${freeOfferErr.message}`);

    // A business with no subscription history, for the Checkout test.
    const billingBusinessId = await createOwnedBusiness(admin, "E2E Billing Business", businessUserId);

    // One live offer and one paused by the Free limit; upgrading should restore the paused one.
    const { error: billingOffersErr } = await admin.from("offers").insert(
        [
            { suffix: "live", plan_paused_at: null },
            { suffix: "paused", plan_paused_at: new Date().toISOString() },
        ].map(({ suffix, plan_paused_at }) => ({
            business_id: billingBusinessId,
            created_by: businessUserId,
            slug: `e2e-billing-${suffix}-${RUN_ID}`,
            title: `E2E Billing ${suffix} offer`,
            category: "Testing",
            discount: "5% off",
            description: "Offer for the upgrade test.",
            availability: "Available now",
            expires_at: "2030-12-31",
            terms: "For automated tests only.",
            approval_status: "approved",
            redemption_count: 0,
            plan_paused_at,
        })),
    );
    if (billingOffersErr) throw new Error(`Could not create billing offers: ${billingOffersErr.message}`);

    // Offer for the claim test — no pre-existing redemption.
    const claimSlug = `e2e-claim-${RUN_ID}`;
    const { data: claimOffer, error: claimErr } = await admin
        .from("offers")
        .insert({
            business_id: business.id,
            created_by: businessUserId,
            slug: claimSlug,
            title: "E2E Claim Test Offer",
            category: "Testing",
            discount: "10% off",
            description: "A test offer for the claim flow.",
            availability: "Available now",
            expires_at: "2030-12-31",
            terms: "For automated tests only.",
            approval_status: "approved",
            redemption_count: 0,
        })
        .select("id, slug")
        .single();
    if (claimErr || !claimOffer) throw new Error(`Could not create claim offer: ${claimErr?.message}`);

    // Offer for the redeem test — already claimed by the customer.
    const redeemSlug = `e2e-redeem-${RUN_ID}`;
    const { data: redeemOffer, error: redeemErr } = await admin
        .from("offers")
        .insert({
            business_id: business.id,
            created_by: businessUserId,
            slug: redeemSlug,
            title: "E2E Redeem Test Offer",
            category: "Testing",
            discount: "20% off",
            description: "A test offer for the redeem flow.",
            availability: "Available now",
            expires_at: "2030-12-31",
            terms: "For automated tests only.",
            approval_status: "approved",
            redemption_count: 0,
        })
        .select("id, slug")
        .single();
    if (redeemErr || !redeemOffer) throw new Error(`Could not create redeem offer: ${redeemErr?.message}`);

    // Pre-claim the redeem offer as the customer so the business owner
    // has a real code to mark as used in the redeem test.
    const { data: redemption, error: redemptionErr } = await admin
        .from("offer_redemptions")
        .insert({ offer_id: redeemOffer.id, user_id: customerUserId })
        .select("redemption_code")
        .single();
    if (redemptionErr || !redemption) throw new Error(`Could not pre-claim offer: ${redemptionErr?.message}`);

    const state = {
        businessUserId,
        customerUserId,
        businessEmail: BUSINESS_EMAIL,
        customerEmail: CUSTOMER_EMAIL,
        testPassword: TEST_PASSWORD,
        businessId: business.id,
        freeBusinessId,
        billingBusinessId,
        claimOfferSlug: claimOffer.slug,
        preClaimedCode: redemption.redemption_code,
    };

    fs.mkdirSync(path.dirname(STATE_PATH), { recursive: true });
    fs.writeFileSync(STATE_PATH, JSON.stringify(state, null, 2));
    fs.mkdirSync(path.join(process.cwd(), "tests", ".auth"), { recursive: true });
}

async function createOwnedBusiness(
    admin: SupabaseClient,
    name: string,
    ownerId: string,
) {
    const { data, error } = await admin
        .from("businesses")
        .insert({
            name,
            category: "Testing",
            description: "Automated test business — safe to delete.",
            approval_status: "approved",
            created_by: ownerId,
        })
        .select("id")
        .single();
    if (error || !data) throw new Error(`Could not create ${name}: ${error?.message}`);

    const { error: memberErr } = await admin.from("business_members").insert({
        business_id: data.id,
        user_id: ownerId,
        role: "owner",
    });
    if (memberErr) throw new Error(`Could not add owner to ${name}: ${memberErr.message}`);

    return data.id as string;
}

export default globalSetup;
