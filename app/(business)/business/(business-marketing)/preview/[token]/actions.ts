"use server";

import { redirect } from "next/navigation";

import { sendLifecycleEmails } from "@/lib/business-lifecycle";
import { createClient } from "@/utils/supabase/server";

// The signed-in visitor becomes the owner of the previewed business.
export async function claimPreview(formData: FormData) {
    const token = String(formData.get("token") ?? "");
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect(`/signup?next=${encodeURIComponent(`/business/preview/${token}`)}`);
    }

    const { data: businessId, error } = await supabase.rpc("claim_business_preview", { requested_token: token });

    if (error || !businessId) {
        redirect(`/business/preview/${token}?error=${encodeURIComponent(error?.message ?? "We couldn't claim this business.")}`);
    }

    await sendLifecycleEmails(businessId).catch(() => undefined);

    redirect(`/business/${businessId}?welcome=1`);
}
