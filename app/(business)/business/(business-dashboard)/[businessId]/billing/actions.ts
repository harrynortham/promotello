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

// Moves an existing subscription between Pro and Growth. Stripe prorates
// the difference; the webhook then updates the plan here.
export async function changePlan(formData: FormData) {
    const businessId = String(formData.get("businessId") ?? "");
    const plan = formData.get("plan");
    const billingPath = `/business/${businessId}/billing`;

    // Founding prices can only be chosen at sign-up.
    if (!isPlanKey(plan) || plan === "pro_founding_monthly") {
        redirect(`${billingPath}?error=invalid_plan`);
    }

    await requireBillingManager(businessId);

    const { data: current, error } = await createAdminClient()
        .from("subscriptions")
        .select("stripe_subscription_id")
        .eq("business_id", businessId)
        .in("status", CURRENT_SUBSCRIPTION_STATUSES)
        .maybeSingle();

    if (error) {
        throw error;
    }

    if (!current) {
        redirect(`${billingPath}?error=no_subscription`);
    }

    const stripe = createStripeClient();
    const priceIds = await getPlanPriceIds();
    const subscription = await stripe.subscriptions.retrieve(current.stripe_subscription_id);
    const item = subscription.items.data[0];

    if (item.price.id !== priceIds[plan]) {
        await stripe.subscriptions.update(subscription.id, {
            items: [{ id: item.id, price: priceIds[plan] }],
            proration_behavior: "create_prorations",
        });
    }

    redirect(`${billingPath}?changed=${plan}`);
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
