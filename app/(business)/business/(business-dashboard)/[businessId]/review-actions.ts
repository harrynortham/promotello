"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";

import { alertBusinessReady } from "@/lib/business-review-emails";
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

    const { error } = await supabase.rpc("request_business_review", {
        requested_business_id: businessId,
    });

    if (error && error.code !== "P0009") {
        redirect(
            fromSetup
                ? `/business/setup/${businessId}?step=review&error=review`
                : `/business/${businessId}?error=review`,
        );
    }

    // P0009 is "already asked", so this only fires the once.
    if (!error && user.email) {
        const email = user.email;
        after(() => alertBusinessReady(businessId, email).catch(() => undefined));
    }

    revalidatePath(`/business/${businessId}`);

    redirect(
        fromSetup
            ? `/business/setup/${businessId}?step=offer&sent=1`
            : `/business/${businessId}?sent=1`,
    );
}
