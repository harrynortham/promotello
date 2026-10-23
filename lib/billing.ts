import type { SupabaseClient } from "@supabase/supabase-js";

import { createStripeClient } from "@/utils/stripe/server";
import { createAdminClient } from "@/utils/supabase/admin";

export const TRIAL_DAYS = 30;
export const FOUNDING_MEMBER_LIMIT = 50;

// Must match the limit in public.enforce_offer_plan_limit().
export const FREE_LIVE_OFFER_LIMIT = 1;

// Subscription states that give a business Pro features. Must match
// public.business_has_pro(); past_due keeps Pro while Stripe retries.
export const PRO_SUBSCRIPTION_STATUSES = ["trialing", "active", "past_due"];

export type PlanKey = "pro_founding_monthly" | "pro_monthly" | "pro_yearly";

export const plans: Record<
    PlanKey,
    { name: string; price: string; interval: string; note?: string }
> = {
    pro_founding_monthly: {
        name: "Pro · founding member",
        price: "£19",
        interval: "month",
        note: "Locked for life",
    },
    pro_monthly: {
        name: "Pro",
        price: "£24",
        interval: "month",
    },
    pro_yearly: {
        name: "Pro yearly",
        price: "£240",
        interval: "year",
        note: "2 months free",
    },
};

export function isPlanKey(value: unknown): value is PlanKey {
    return typeof value === "string" && value in plans;
}

// Subscriptions in these states still belong to the business, so it should
// manage them in the portal rather than start a second one.
export const CURRENT_SUBSCRIPTION_STATUSES = [
    "trialing",
    "active",
    "past_due",
    "unpaid",
    "paused",
];

let priceIdsPromise: Promise<Record<PlanKey, string>> | null = null;

// Prices are looked up by lookup key so the same code works in test and
// live mode. Cached for the life of the server process.
export function getPlanPriceIds() {
    priceIdsPromise ??= (async () => {
        const stripe = createStripeClient();
        const { data } = await stripe.prices.list({
            lookup_keys: Object.keys(plans),
            active: true,
        });

        const ids = Object.fromEntries(
            data.map((price) => [price.lookup_key, price.id]),
        );

        for (const key of Object.keys(plans)) {
            if (!ids[key]) {
                throw new Error(`Stripe price with lookup key "${key}" not found`);
            }
        }

        return ids as Record<PlanKey, string>;
    })().catch((error) => {
        priceIdsPromise = null;
        throw error;
    });

    return priceIdsPromise;
}

// Businesses that have taken a founding place. Cancelled members keep
// counting, so the first 50 places can't be reused.
export async function countFoundingMembers() {
    const priceIds = await getPlanPriceIds();

    const { data, error } = await createAdminClient()
        .from("subscriptions")
        .select("business_id")
        .eq("price_id", priceIds.pro_founding_monthly)
        .not("status", "in", "(incomplete,incomplete_expired)");

    if (error) {
        throw error;
    }

    return new Set(data.map((row) => row.business_id)).size;
}

// Reads with the caller's client: members can see their business's
// subscriptions under RLS.
export async function businessHasPro(
    supabase: SupabaseClient,
    businessId: string,
) {
    const { data, error } = await supabase
        .from("subscriptions")
        .select("id")
        .eq("business_id", businessId)
        .in("status", PRO_SUBSCRIPTION_STATUSES)
        .limit(1);

    if (error) {
        throw error;
    }

    return data.length > 0;
}

type OfferForPlan = {
    approval_status: string;
    expires_at: string;
    plan_paused_at: string | null;
};

// Same definition of "live" as the database trigger.
export function isLiveOffer(offer: OfferForPlan) {
    const today = new Date().toISOString().slice(0, 10);

    return (
        ["pending", "approved"].includes(offer.approval_status) &&
        offer.expires_at >= today &&
        offer.plan_paused_at === null
    );
}

export async function planKeyForPriceId(priceId: string | null) {
    if (!priceId) {
        return null;
    }

    const ids = await getPlanPriceIds();
    const match = Object.entries(ids).find(([, id]) => id === priceId);

    return match ? (match[0] as PlanKey) : null;
}
