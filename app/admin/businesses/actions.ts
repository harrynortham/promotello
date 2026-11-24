"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { emailBusinessReviewed, type ReviewDecision } from "@/lib/business-review-emails";
import {
    businessApproved,
    businessRejected,
    businessRestored,
    businessSuspended,
} from "@/lib/notifications";
import { notifyBusinessManagers } from "@/lib/notify";
import { createAdminClient } from "@/utils/supabase/admin";
import { createClient } from "@/utils/supabase/server";
import { createStripeClient } from "@/utils/stripe/server";

// Called after an admin approves, rejects or suspends a business: tells
// its owners. `previous` is the status it came from, which the row no
// longer knows — approving a suspended business is a restoration, and
// nothing about it reads like a first approval.
export async function notifyBusinessReviewed(
    businessId: string,
    decision: ReviewDecision,
    previous?: string | null,
) {
    const supabase = await createClient();
    const { data: isAdmin } = await supabase.rpc("is_platform_admin");

    if (!isAdmin) {
        return { sent: 0 };
    }

    const { sent } = await emailBusinessReviewed(businessId, decision, previous);

    // Beside the email, not instead of it: somebody who turned the email
    // off still hears, and a failed send doesn't take this with it.
    const { data: business } = await createAdminClient()
        .from("businesses")
        .select("id, name, review_reason, review_note, updated_at")
        .eq("id", businessId)
        .maybeSingle();

    // Whether they already have an offer, so the approval notification
    // does not ask for one they have written. Pending counts: it is
    // written, it is with us, and "add an offer" is not the next thing
    // they need to hear.
    const { count: offers } = await createAdminClient()
        .from("offers")
        .select("id", { count: "exact", head: true })
        .eq("business_id", businessId)
        .in("approval_status", ["pending", "approved"]);

    if (business) {
        // The reason comes off the row rather than from the browser:
        // review_business() has already checked there is one.
        const review = { reason: business.review_reason, note: business.review_note };

        // Suspensions and restorations are keyed on the moment, because
        // one business can go down and up more than once and must hear
        // about each time.
        const at = business.updated_at ?? new Date().toISOString();

        await notifyBusinessManagers(
            businessId,
            decision === "suspended"
                ? businessSuspended(business, at, review)
                : decision === "rejected"
                    ? businessRejected(business, review)
                    : previous === "suspended"
                        ? businessRestored(business, at)
                        : businessApproved(business, (offers ?? 0) > 0),
        );
    }

    return { sent };
}

// Take one photo off a business's page.
//
// There is no review queue: the business was approved before it went
// live, and twenty-five photos from one of them should not be
// twenty-five things to click. This is the lever for the one case that
// needs it, and it takes the file as well as the row.
export async function removeBusinessPhoto(formData: FormData) {
    const photoId = String(formData.get("photoId") ?? "");
    const businessId = String(formData.get("businessId") ?? "");

    const supabase = await createClient();
    const { data: isAdmin } = await supabase.rpc("is_platform_admin");

    if (!isAdmin) {
        redirect("/admin");
    }

    const { data: photo } = await supabase
        .from("business_photos")
        .select("storage_path")
        .eq("id", photoId)
        .maybeSingle();

    await supabase.from("business_photos").delete().eq("id", photoId);

    if (photo?.storage_path) {
        await supabase.storage.from("business-logos").remove([photo.storage_path]);
    }

    revalidatePath(`/admin/businesses/${businessId}`);
    redirect(`/admin/businesses/${businessId}?removed=photo`);
}

// Delete a business, for good.
//
// Stripe first, because once the row is gone the webhook has nothing to
// write back to and a live subscription would bill against a business
// that no longer exists. Cancelled outright rather than at period end,
// for the same reason: there is no period end to wait for.
//
// Then the RPC, which checks the caller is an admin and that the name
// was typed correctly, records what it destroyed, and deletes. Called
// with the admin's own session so auth.uid() is them in the audit row.
export async function deleteBusinessCompletely(businessId: string, confirmName: string) {
    const supabase = await createClient();

    const { data: subscription } = await supabase
        .from("subscriptions")
        .select("stripe_subscription_id, status")
        .eq("business_id", businessId)
        .not("stripe_subscription_id", "is", null)
        .maybeSingle();

    if (subscription?.stripe_subscription_id) {
        try {
            await createStripeClient().subscriptions.cancel(subscription.stripe_subscription_id);
        } catch (error) {
            // A subscription already cancelled at Stripe throws, and that
            // is not a reason to refuse: the thing we wanted is true.
            const message = error instanceof Error ? error.message : String(error);

            if (!/No such subscription|already canceled/i.test(message)) {
                console.error("Delete business: could not cancel the subscription", error);
                return { error: "The subscription could not be cancelled, so nothing was deleted." };
            }
        }
    }

    const { data, error } = await supabase.rpc("admin_delete_business", {
        requested_business_id: businessId,
        confirm_name: confirmName,
    });

    if (error) {
        return { error: error.message };
    }

    revalidatePath("/admin/businesses");

    return { summary: data as Record<string, string | number> };
}
