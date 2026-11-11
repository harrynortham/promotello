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

test("editing an approved offer sends it back for review", async () => {
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

// Notifications belong to one account. Nothing in the browser inserts
// one, and the only column a person may write is read_at.
test("notifications are one person's, and read_at is all they can write", async () => {
    const { businessUserId, customerUserId } = state();
    const supabase = admin();

    const { data: theirs, error: seeded } = await supabase
        .from("notifications")
        .insert({
            user_id: businessUserId,
            type: "offer_approved",
            title: "E2E someone else's notification",
            href: "/business/dashboard",
        })
        .select("id")
        .single();
    expect(seeded).toBeNull();

    try {
        const customer = createClient(url, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, options);
        const { customerEmail, testPassword } = state();
        await customer.auth.signInWithPassword({ email: customerEmail, password: testPassword });

        // Can't read it.
        const { data: read } = await customer.from("notifications").select("id").eq("id", theirs!.id);
        expect(read ?? []).toEqual([]);

        // Can't mark it read, or delete it.
        await customer.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", theirs!.id);
        await customer.from("notifications").delete().eq("id", theirs!.id);

        const { data: untouched } = await supabase
            .from("notifications")
            .select("read_at")
            .eq("id", theirs!.id)
            .maybeSingle();
        expect(untouched, "somebody else's notification is still there").not.toBeNull();
        expect(untouched!.read_at, "and still unread").toBeNull();

        // Can't write one of their own either: there is no insert policy.
        const { error: inserted } = await customer.from("notifications").insert({
            user_id: customerUserId,
            type: "offer_approved",
            title: "E2E notification from a browser",
        });
        expect(inserted).not.toBeNull();

        // On their own, read_at and nothing else.
        const { data: mine } = await supabase
            .from("notifications")
            .insert({ user_id: customerUserId, type: "offer_approved", title: "E2E my own notification" })
            .select("id")
            .single();

        const { error: readAt } = await customer
            .from("notifications")
            .update({ read_at: new Date().toISOString() })
            .eq("id", mine!.id);
        expect(readAt).toBeNull();

        for (const change of [{ title: "Something else" }, { href: "/elsewhere" }, { user_id: businessUserId }]) {
            const { error } = await customer.from("notifications").update(change).eq("id", mine!.id);
            expect(error, `updating ${Object.keys(change)[0]}`).not.toBeNull();
        }

        await supabase.from("notifications").delete().eq("id", mine!.id);
    } finally {
        await supabase.from("notifications").delete().eq("id", theirs!.id);
    }
});

// The response headers from next.config.ts. The camera one is here
// because denying it doesn't look like a bug: the page loads, the button
// appears, and getUserMedia rejects only once a member of staff points a
// phone at a customer's code.
test("the headers lock the site down without locking out the scanner", async ({ page }) => {
    const response = await page.goto("/");
    const headers = response!.headers();

    const policy = headers["permissions-policy"];
    expect(policy).toContain("camera=(self)");
    expect(policy).toContain("microphone=()");
    expect(policy).toContain("geolocation=(self)");

    expect(headers["x-frame-options"]).toBe("DENY");
    expect(headers["content-security-policy"]).toContain("frame-ancestors 'none'");
    expect(headers["x-content-type-options"]).toBe("nosniff");
    expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
});
