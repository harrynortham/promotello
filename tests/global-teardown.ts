import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import Stripe from "stripe";
import { STATE_PATH } from "./global-setup";

async function globalTeardown() {
    if (!fs.existsSync(STATE_PATH)) return;

    const state = JSON.parse(fs.readFileSync(STATE_PATH, "utf8"));

    try {
        const admin = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!,
            { auth: { autoRefreshToken: false, persistSession: false } },
        );

        // Delete child rows first in case foreign keys don't cascade to auth.users.
        await admin.from("offer_redemptions").delete().eq("user_id", state.customerUserId);
        const businessIds = [state.businessId, state.freeBusinessId, state.billingBusinessId];
        for (const businessId of businessIds) {
            if (!businessId) continue;

            // Remove any sandbox Stripe customer (and its subscriptions) created by the billing test.
            const { data: billingCustomer } = await admin
                .from("billing_customers")
                .select("stripe_customer_id")
                .eq("business_id", businessId)
                .maybeSingle();
            if (billingCustomer && process.env.STRIPE_SECRET_KEY) {
                const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
                await stripe.customers.del(billingCustomer.stripe_customer_id).catch((err) => {
                    console.warn(`[teardown] Stripe customer delete failed: ${err.message}`);
                });
            }

            // billing_customers and subscriptions cascade from businesses.
            await admin.from("offers").delete().eq("business_id", businessId);
            await admin.from("business_members").delete().eq("business_id", businessId);
            await admin.from("businesses").delete().eq("id", businessId);
        }

        for (const id of [state.businessUserId, state.customerUserId]) {
            if (!id) continue;
            const { error } = await admin.auth.admin.deleteUser(id);
            if (error) console.warn(`[teardown] deleteUser(${id}) failed: ${error.message}`);
        }
    } catch (err) {
        console.warn("[teardown] Error during cleanup:", err);
    } finally {
        try { fs.unlinkSync(STATE_PATH); } catch { /* already gone */ }
    }
}

export default globalTeardown;
