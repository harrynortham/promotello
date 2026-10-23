"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import {
    CURRENT_SUBSCRIPTION_STATUSES,
    FOUNDING_MEMBER_LIMIT,
    TRIAL_DAYS,
    countFoundingMembers,
    getPlanPriceIds,
    isPlanKey,
} from "@/lib/billing";
import { createStripeClient } from "@/utils/stripe/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { createClient } from "@/utils/supabase/server";

// Tags these sessions in the Stripe Dashboard so this flow can be tracked.
const CHECKOUT_INTEGRATION_IDENTIFIER = "promotello_pro_signup_qhzkvmta";

export async function startCheckout(formData: FormData) {
    const businessId = String(formData.get("businessId") ?? "");
    const plan = formData.get("plan");
    const billingPath = `/business/${businessId}/billing`;

    if (!isPlanKey(plan)) {
        redirect(`${billingPath}?error=invalid_plan`);
    }

    const { user, business } = await requireBillingManager(businessId);
    const admin = createAdminClient();

    const { data: existing, error: existingError } = await admin
        .from("subscriptions")
        .select("status")
        .eq("business_id", businessId);

    if (existingError) {
        throw existingError;
    }

    if (
        existing.some((subscription) =>
            CURRENT_SUBSCRIPTION_STATUSES.includes(subscription.status),
        )
    ) {
        redirect(`${billingPath}?error=already_subscribed`);
    }

    const priceIds = await getPlanPriceIds();

    if (
        plan === "pro_founding_monthly" &&
        (await countFoundingMembers()) >= FOUNDING_MEMBER_LIMIT
    ) {
        redirect(`${billingPath}?error=founding_full`);
    }

    const stripe = createStripeClient();
    const customerId = await getOrCreateStripeCustomer({
        businessId,
        businessName: business.name,
        email: user.email,
    });

    // One free trial per business: only if it has never subscribed before.
    const trialEligible = existing.length === 0;
    const origin = await getOrigin();

    const session = await stripe.checkout.sessions.create({
        mode: "subscription",
        customer: customerId,
        client_reference_id: businessId,
        line_items: [{ price: priceIds[plan], quantity: 1 }],
        subscription_data: {
            trial_period_days: trialEligible ? TRIAL_DAYS : undefined,
            metadata: { business_id: businessId },
        },
        success_url: `${origin}${billingPath}?checkout=success`,
        cancel_url: `${origin}${billingPath}?checkout=cancelled`,
        integration_identifier: CHECKOUT_INTEGRATION_IDENTIFIER,
    });

    if (!session.url) {
        throw new Error("Stripe did not return a Checkout URL");
    }

    redirect(session.url);
}

export async function openBillingPortal(formData: FormData) {
    const businessId = String(formData.get("businessId") ?? "");
    const billingPath = `/business/${businessId}/billing`;

    await requireBillingManager(businessId);

    const { data: customer, error } = await createAdminClient()
        .from("billing_customers")
        .select("stripe_customer_id")
        .eq("business_id", businessId)
        .maybeSingle();

    if (error) {
        throw error;
    }

    if (!customer) {
        redirect(`${billingPath}?error=no_customer`);
    }

    const origin = await getOrigin();
    const session = await createStripeClient().billingPortal.sessions.create({
        customer: customer.stripe_customer_id,
        return_url: `${origin}${billingPath}`,
        configuration: process.env.STRIPE_PORTAL_CONFIGURATION_ID || undefined,
    });

    redirect(session.url);
}

async function requireBillingManager(businessId: string) {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login");
    }

    const { data: membership } = await supabase
        .from("business_members")
        .select("role, businesses ( name )")
        .eq("business_id", businessId)
        .eq("user_id", user.id)
        .maybeSingle();

    const business = Array.isArray(membership?.businesses)
        ? membership.businesses[0]
        : membership?.businesses;

    if (!membership || !["owner", "admin"].includes(membership.role) || !business) {
        redirect(`/business/${businessId}`);
    }

    return { user, business };
}

async function getOrCreateStripeCustomer({
    businessId,
    businessName,
    email,
}: {
    businessId: string;
    businessName: string;
    email: string | undefined;
}) {
    const admin = createAdminClient();

    const { data: existing, error } = await admin
        .from("billing_customers")
        .select("stripe_customer_id")
        .eq("business_id", businessId)
        .maybeSingle();

    if (error) {
        throw error;
    }

    if (existing) {
        return existing.stripe_customer_id;
    }

    // The idempotency key stops a double-click creating two customers.
    const customer = await createStripeClient().customers.create(
        {
            name: businessName,
            email,
            metadata: { business_id: businessId },
        },
        { idempotencyKey: `create-customer-${businessId}` },
    );

    const { error: insertError } = await admin
        .from("billing_customers")
        .upsert(
            { business_id: businessId, stripe_customer_id: customer.id },
            { onConflict: "business_id", ignoreDuplicates: true },
        );

    if (insertError) {
        throw insertError;
    }

    return customer.id;
}

async function getOrigin() {
    const requestHeaders = await headers();
    const origin = requestHeaders.get("origin");

    if (origin) {
        return origin;
    }

    const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
    const protocol = requestHeaders.get("x-forwarded-proto") ?? "https";

    return `${protocol}://${host}`;
}
