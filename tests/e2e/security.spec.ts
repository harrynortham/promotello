import { test, expect } from "@playwright/test";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import fs from "fs";
import { STATE_PATH } from "../global-setup";

// Checks from the pre-launch security review: things a signed-in business
// user, or anyone at all, must not be able to do with the public API.

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const options = { auth: { autoRefreshToken: false, persistSession: false } };
const admin = () => createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY!, options);
const state = () => JSON.parse(fs.readFileSync(STATE_PATH, "utf8"));

async function signedInBusinessUser(): Promise<SupabaseClient> {
    const { businessEmail, testPassword } = state();
    const client = createClient(url, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, options);
    const { error } = await client.auth.signInWithPassword({ email: businessEmail, password: testPassword });
    expect(error).toBeNull();
    return client;
}

test("nobody can look up a business's location through the slug helper", async () => {
    const anon = createClient(url, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, options);
    const { error } = await anon.rpc("business_slug_for", { target: { id: state().businessId, name: "x", public_id: "abcdef" } });
    expect(error).not.toBeNull();
});

test("business admins can't add people to their team without an invitation", async () => {
    const { businessId, customerUserId } = state();
    const client = await signedInBusinessUser();

    await client.from("business_members").insert({ business_id: businessId, user_id: customerUserId, role: "member" });

    const { data } = await admin()
        .from("business_members")
        .select("user_id")
        .eq("business_id", businessId)
        .eq("user_id", customerUserId);
    expect(data).toEqual([]);
});

test("old offer addresses can't be listed", async () => {
    const anon = createClient(url, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, options);
    const { data } = await anon.from("offer_slug_history").select("slug").limit(5);
    expect(data ?? []).toEqual([]);
});

test("logo uploads must be images", async () => {
    const { businessId } = state();
    const client = await signedInBusinessUser();

    const { error } = await client.storage
        .from("business-logos")
        .upload(`${businessId}/e2e-not-an-image-${Date.now()}.html`, new Blob(["<h1>hi</h1>"], { type: "text/html" }), {
            contentType: "text/html",
        });
    expect(error).not.toBeNull();
});

test("editing an approved offer on the Free plan sends it back for review", async () => {
    const { businessUserId } = state();
    const supabase = admin();

    // A Free business of the test user's, with one approved offer.
    const { data: business } = await supabase
        .from("businesses")
        .insert({ name: `E2E Review Edits ${Date.now()}`, category: "Testing", approval_status: "approved", created_by: businessUserId })
        .select("id")
        .single();
    await supabase.from("business_members").insert({ business_id: business!.id, user_id: businessUserId, role: "owner" });
    const { data: offer } = await supabase
        .from("offers")
        .insert({
            business_id: business!.id,
            created_by: businessUserId,
            slug: crypto.randomUUID(),
            title: "E2E Approved Offer",
            category: "Testing",
            discount: "10% off",
            description: "Approved before the edit.",
            availability: "Available now",
            expires_at: "2030-12-31",
            terms: "For automated tests only.",
            approval_status: "approved",
            redemption_count: 0,
        })
        .select("id")
        .single();

    try {
        const client = await signedInBusinessUser();
        const { error } = await client.from("offers").update({ title: "Something else entirely" }).eq("id", offer!.id);
        expect(error).toBeNull();

        const { data: edited } = await supabase.from("offers").select("approval_status").eq("id", offer!.id).single();
        expect(edited!.approval_status).toBe("pending");
    } finally {
        await supabase.from("businesses").delete().eq("id", business!.id);
    }
});
