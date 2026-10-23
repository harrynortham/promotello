import { createClient } from "@supabase/supabase-js";
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
        claimOfferSlug: claimOffer.slug,
        preClaimedCode: redemption.redemption_code,
    };

    fs.mkdirSync(path.dirname(STATE_PATH), { recursive: true });
    fs.writeFileSync(STATE_PATH, JSON.stringify(state, null, 2));
    fs.mkdirSync(path.join(process.cwd(), "tests", ".auth"), { recursive: true });
}

export default globalSetup;
