"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/utils/supabase/server";

// A page we built for a business carries our words, our sample offer and
// often a stand-in photo, so it is never sent for review on their behalf.
// They look, change what they want, then ask.
export async function requestBusinessReview(formData: FormData) {
    const businessId = String(formData.get("businessId") ?? "");
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
        redirect(`/business/${businessId}?error=review`);
    }

    revalidatePath(`/business/${businessId}`);
    redirect(`/business/${businessId}?sent=1`);
}
