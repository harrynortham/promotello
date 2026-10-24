import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import fs from "fs";

import { lifecycleEmail, type LifecycleDue } from "../../lib/business-lifecycle";
import { STATE_PATH } from "../global-setup";

// The setup and trial emails: what's due when, and that each is sent once.
// Test addresses (@test.internal) are never actually emailed.

const admin = () =>
    createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
        auth: { persistSession: false },
    });

async function claim(businessId: string) {
    const { data, error } = await admin().rpc("claim_business_lifecycle_emails", { only_business: businessId });
    expect(error).toBeNull();
    return (data ?? []) as LifecycleDue[];
}

const daysAgo = (days: number) => new Date(Date.now() - days * 86_400_000).toISOString();

test.describe("business setup and trial emails", () => {
    let businessId: string;

    test.beforeEach(async () => {
        const { businessUserId } = JSON.parse(fs.readFileSync(STATE_PATH, "utf8"));
        const { data, error } = await admin()
            .from("businesses")
            .insert({ name: `E2E Lifecycle ${Date.now()}`, category: "Testing", approval_status: "approved", created_by: businessUserId })
            .select("id")
            .single();
        expect(error).toBeNull();
        businessId = data!.id;
        await admin().from("business_members").insert({ business_id: businessId, user_id: businessUserId, role: "owner" });
    });

    test.afterEach(async () => {
        await admin().from("businesses").delete().eq("id", businessId);
    });

    test("a new business gets a welcome email, once", async () => {
        const first = await claim(businessId);
        expect(first.map((due) => due.kind)).toEqual(["welcome"]);
        expect(first[0].emails[0]).toMatch(/@test\.internal$/);

        const email = lifecycleEmail(first[0], first[0].emails[0])!;
        expect(email.subject).toContain("Welcome to Promotello");
        expect(email.text).toContain("Post your first offer");

        expect(await claim(businessId)).toEqual([]);
    });

    test("after two days, a nudge for the first missing step; none once set up", async () => {
        await admin().from("businesses").update({ created_at: daysAgo(3) }).eq("id", businessId);

        const [nudge] = await claim(businessId);
        expect(nudge.kind).toBe("setup_nudge_1");
        const email = lifecycleEmail(nudge, nudge.emails[0])!;
        expect(email.subject).toMatch(/^Post your first offer for E2E Lifecycle/);
        expect(email.text).toContain(`/business/${businessId}/offers/new`);
        expect(email.text).toContain("Turn off setup tips");

        // Fully set up: nothing to nudge about.
        expect(lifecycleEmail({ ...nudge, details: { ...nudge.details, has_offer: true, has_loyalty: true, has_poster: true } }, "a@b.c")).toBeNull();
    });

    test("businesses that signed up long ago get no setup emails", async () => {
        await admin().from("businesses").update({ created_at: daysAgo(40) }).eq("id", businessId);
        expect(await claim(businessId)).toEqual([]);
    });

    test("a trial ending within five days gets a notice with what it achieved", async () => {
        await admin().from("businesses").update({ created_at: daysAgo(26) }).eq("id", businessId);
        await admin().from("subscriptions").insert({
            business_id: businessId,
            stripe_subscription_id: `sub_e2e_lifecycle_${Date.now()}`,
            stripe_customer_id: `cus_e2e_lifecycle_${Date.now()}`,
            status: "trialing",
            trial_end: new Date(Date.now() + 4 * 86_400_000).toISOString(),
        });

        const [notice] = await claim(businessId);
        expect(notice.kind).toBe("trial_ending");
        const email = lifecycleEmail(notice, notice.emails[0])!;
        expect(email.subject).toMatch(/^Your Promotello trial ends on \d+ \w+$/);
        expect(email.text).toContain("carries on automatically");
        expect(await claim(businessId)).toEqual([]);
    });
});
