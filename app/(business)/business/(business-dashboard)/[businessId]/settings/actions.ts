"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { CURRENT_SUBSCRIPTION_STATUSES } from "@/lib/billing";
import { confirmsName } from "@/lib/close-business";
import { createStripeClient } from "@/utils/stripe/server";
import { createClient } from "@/utils/supabase/server";

// Closing one business, for someone who runs several. Nothing is deleted:
// the listing goes, nobody new can join or claim, and the stamps and
// vouchers customers are holding stay theirs. See the migration
// 20261207150000_closing_a_business.sql for why it is a flag and not a
// cascade.

async function requireUser() {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login?next=/business/dashboard");
    }

    return { supabase, user };
}

// Cancel at period end rather than immediately: they have paid to the end of
// the month, and closing shouldn't also be a refund conversation. Returns
// what happened so the page can say it.
export async function cancelSubscriptionForClose(businessId: string) {
    const supabase = await createClient();

    const { data: subscription } = await supabase
        .from("subscriptions")
        .select("stripe_subscription_id, status")
        .eq("business_id", businessId)
        .in("status", CURRENT_SUBSCRIPTION_STATUSES)
        .maybeSingle();

    if (!subscription) {
        return { cancelled: false };
    }

    try {
        const stripe = createStripeClient();
        await stripe.subscriptions.update(subscription.stripe_subscription_id, {
            cancel_at_period_end: true,
        });
    } catch (error) {
        console.error("Close business: could not cancel the subscription", error);
        return { cancelled: false, failed: true };
    }

    // The webhook writes the status back; nothing is mirrored here.
    return { cancelled: true };
}

export async function closeBusiness(formData: FormData) {
    const businessId = String(formData.get("businessId") ?? "");
    const typedName = String(formData.get("confirmName") ?? "").trim();
    const page = `/business/${businessId}/settings`;

    const { supabase } = await requireUser();

    const { data: business } = await supabase
        .from("businesses")
        .select("name")
        .eq("id", businessId)
        .maybeSingle();

    // Typing the name, not the word DELETE: with five businesses in the
    // switcher, DELETE is how you close the wrong one.
    if (!business || !confirmsName(typedName, business.name)) {
        redirect(`${page}?error=name`);
    }

    // Billing first. A business closed but still charging is the one outcome
    // there is no excuse for.
    const billing = await cancelSubscriptionForClose(businessId);

    if (billing.failed) {
        redirect(`${page}?error=billing`);
    }

    const { error } = await supabase.rpc("close_business", {
        requested_business_id: businessId,
    });

    if (error) {
        const reason = { "42501": "owner", P0008: "already" }[error.code ?? ""] ?? "close";
        redirect(`${page}?error=${reason}`);
    }

    revalidatePath("/business/dashboard");
    revalidatePath(`/business/${businessId}`);

    // The chooser already handles "several" and "none", so whichever they
    // have left, it is the right place to land.
    redirect("/business/dashboard?closed=1");
}

export async function reopenBusiness(formData: FormData) {
    const businessId = String(formData.get("businessId") ?? "");
    const { supabase } = await requireUser();

    const { error } = await supabase.rpc("reopen_business", {
        requested_business_id: businessId,
    });

    if (error) {
        redirect(`/business/${businessId}?error=reopen`);
    }

    revalidatePath("/business/dashboard");
    revalidatePath(`/business/${businessId}`);
    redirect(`/business/${businessId}?reopened=1`);
}
