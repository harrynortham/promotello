import type { SupabaseClient } from "@supabase/supabase-js";

import { createStripeClient } from "@/utils/stripe/server";
import { createAdminClient } from "@/utils/supabase/admin";

export const TRIAL_DAYS = 30;

// A founding place is worth more than the £5 a month it saves, and a
// month is not long enough to find out whether a loyalty card brings
// anybody back — the second visit is the whole thing being sold, and it
// has not happened yet by day thirty. Three months is a season.
//
// Only the founding price gets it. trialDays() below is the one place
// that decides, so the emails, the dashboard copy and the Stripe session
// cannot say three different numbers.
export const FOUNDING_TRIAL_DAYS = 90;
export const FOUNDING_MEMBER_LIMIT = 50;

// "3 months" rather than "90 days", because that is how long a person
// hears it as — but derived, so changing FOUNDING_TRIAL_DAYS changes the
// sentence rather than leaving it quietly wrong.
export function freeFor(days: number) {
    // Months wherever it divides, including one. The two trials are
    // meant to be read against each other — three months against one —
    // and "90 days against 30 days" makes the reader do the division
    // themselves.
    if (days % 30 === 0) {
        const months = days / 30;

        return months === 1 ? "1 month" : `${months} months`;
    }

    return `${days} days`;
}


export function trialDays(plan: PlanKey) {
    return plan === "pro_founding_monthly" ? FOUNDING_TRIAL_DAYS : TRIAL_DAYS;
}

// Must match the limit in public.enforce_offer_plan_limit().
export const FREE_LIVE_OFFER_LIMIT = 1;

// Subscription states that give a business Pro features. Must match
// public.business_has_pro(); past_due keeps Pro while Stripe retries.
export const PRO_SUBSCRIPTION_STATUSES = ["trialing", "active", "past_due"];

export type PlanKey =
    | "pro_founding_monthly"
    | "pro_monthly"
    | "pro_yearly"
    | "growth_monthly"
    | "growth_yearly";

// Growth includes everything in Pro plus automations, quiet-hours offers,
// the monthly value report and events.
export type PlanTier = "free" | "pro" | "growth";

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
    growth_monthly: {
        name: "Growth",
        price: "£39",
        interval: "month",
    },
    growth_yearly: {
        name: "Growth yearly",
        price: "£390",
        interval: "year",
        note: "2 months free",
    },
};

// Must match the lookup keys' prefix check in the Stripe webhook.
export function tierForPlan(plan: PlanKey): Exclude<PlanTier, "free"> {
    return plan.startsWith("growth") ? "growth" : "pro";
}

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
// One free trial per business: startCheckout only offers one when the
// business has never subscribed. So a business that has had a trial and
// let it lapse is offered a card form, and telling it to "try Pro free"
// is advertising something it cannot have.
export async function hasEverSubscribed(
    supabase: SupabaseClient,
    businessId: string,
) {
    const { data, error } = await supabase
        .from("subscriptions")
        .select("id")
        .eq("business_id", businessId)
        .limit(1);

    if (error) {
        throw error;
    }

    return data.length > 0;
}

// Whether a business is on a paid plan, asked of the database rather
// than worked out here.
//
// This read the subscriptions table through the caller's own client,
// which is right for a business looking at its own dashboard and wrong
// for everybody else: the only select policy on that table is
// is_business_member, so a customer browsing the directory was not
// refused, they were handed nothing. No rows and no error, so this
// returned false for every business, every loyalty card told every
// customer it was closed, and nobody could join one
// (20270126090000_a_customer_can_see_the_card_is_open.sql).
//
// business_has_pro is SECURITY DEFINER and answers from inside, which
// is also what join_loyalty_program is gated on — so the page and the
// gate now read the same sentence instead of two copies of it that
// could disagree.
export async function businessHasPro(
    supabase: SupabaseClient,
    businessId: string,
) {
    const { data, error } = await supabase.rpc("business_has_pro", {
        requested_business_id: businessId,
    });

    if (error) {
        throw error;
    }

    return data === true;
}

// The business's plan: free, pro or growth. Uses the caller's client.
// The plan a business is on, and whether it is still the trial.
//
// businessTier answers "what can this business do", which is the same
// during a trial as after it. This answers "what does its badge say",
// where the trial is worth naming: a business in its first week should
// be able to tell at a glance that the clock is running.
export async function businessPlan(
    supabase: SupabaseClient,
    businessId: string,
): Promise<{ tier: PlanTier; trialing: boolean }> {
    const { data, error } = await supabase
        .from("subscriptions")
        .select("tier, status")
        .eq("business_id", businessId)
        .in("status", PRO_SUBSCRIPTION_STATUSES);

    if (error) {
        throw error;
    }

    if (data.length === 0) {
        return { tier: "free", trialing: false };
    }

    // The same choice businessTier makes, so the two never disagree:
    // Growth wins where a business somehow has both.
    const standing = data.find((row) => row.tier === "growth") ?? data[0];

    return {
        tier: standing.tier === "growth" ? "growth" : "pro",
        trialing: standing.status === "trialing",
    };
}

export async function businessTier(
    supabase: SupabaseClient,
    businessId: string,
): Promise<PlanTier> {
    const { data, error } = await supabase
        .from("subscriptions")
        .select("tier")
        .eq("business_id", businessId)
        .in("status", PRO_SUBSCRIPTION_STATUSES);

    if (error) {
        throw error;
    }

    if (data.some((row) => row.tier === "growth")) return "growth";
    return data.length > 0 ? "pro" : "free";
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
