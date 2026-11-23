"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";

import { alertBusinessReady, emailBusinessReviewed } from "@/lib/business-review-emails";
import { businessApproved } from "@/lib/notifications";
import { notifyBusinessManagers } from "@/lib/notify";
import { createAdminClient } from "@/utils/supabase/admin";
import { createClient } from "@/utils/supabase/server";

// Nobody's page is sent for them. A page we built carries our words and
// often a stand-in photo; a page somebody set up themselves has whatever
// they have got round to. Either way they look at it, change what isn't
// right, and ask — and asking is the only way into the approval queue.
export async function requestBusinessReview(formData: FormData) {
    const businessId = String(formData.get("businessId") ?? "");
    // Sent from the setup flow, where the next thing is their first offer
    // rather than the dashboard.
    const fromSetup = formData.get("from") === "setup";
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login?next=/business/dashboard");
    }

    const { data: reviewed, error } = await supabase.rpc("request_business_review", {
        requested_business_id: businessId,
    });

    if (error && error.code !== "P0009") {
        redirect(
            fromSetup
                ? `/business/setup/${businessId}?step=review&error=review`
                : `/business/${businessId}?error=review`,
        );
    }

    // A page we built goes live the moment they send it, so nothing
    // else is ever going to tell them (20270113090000). The admin page's
    // notifyBusinessReviewed can't: it checks for a platform admin, and
    // the person who just pressed this is the business.
    const live = (reviewed as { approval_status?: string } | null)?.approval_status === "approved";

    // P0009 is "already asked", so this only fires the once.
    if (!error && user.email) {
        const email = user.email;

        after(async () => {
            if (live) {
                await emailBusinessReviewed(businessId, "approved").catch(() => undefined);

                const admin = createAdminClient();

                const [{ data: business }, { count: offers }] = await Promise.all([
                    admin.from("businesses").select("id, name").eq("id", businessId).maybeSingle(),
                    // So the notification does not ask for an offer they
                    // have already written.
                    admin
                        .from("offers")
                        .select("id", { count: "exact", head: true })
                        .eq("business_id", businessId)
                        .in("approval_status", ["pending", "approved"]),
                ]);

                if (business) {
                    await notifyBusinessManagers(
                        businessId,
                        businessApproved(business, (offers ?? 0) > 0),
                    ).catch(() => undefined);
                }
            }

            await alertBusinessReady(businessId, email, live).catch(() => undefined);
        });
    }

    revalidatePath(`/business/${businessId}`);

    redirect(
        fromSetup
            ? `/business/setup/${businessId}?step=offer&sent=${live ? "live" : "1"}`
            : `/business/${businessId}?sent=${live ? "live" : "1"}`,
    );
}
