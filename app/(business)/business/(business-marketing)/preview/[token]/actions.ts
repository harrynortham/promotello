"use server";

import { redirect } from "next/navigation";

import { sendLifecycleEmails } from "@/lib/business-lifecycle";
import { alertNewBusiness } from "@/lib/business-review-emails";
import { previewLink } from "@/lib/previews";
import { createClient } from "@/utils/supabase/server";

// The signed-in visitor becomes the owner of the previewed business.
export async function claimPreview(formData: FormData) {
    const token = String(formData.get("token") ?? "");
    const name = String(formData.get("name") ?? "");
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect(`/business/register?next=${encodeURIComponent(previewLink(token, name))}`);
    }

    const { data: businessId, error } = await supabase.rpc("claim_business_preview", { requested_token: token });

    if (error || !businessId) {
        redirect(`${previewLink(token, name)}?error=${encodeURIComponent(error?.message ?? "We couldn't claim this business.")}`);
    }

    const { due } = await sendLifecycleEmails(businessId).catch(() => ({ due: 0 }));

    // It stays hidden until an admin approves it, so let them know.
    if (due > 0 && user.email) {
        await alertNewBusiness(businessId, user.email, true).catch(() => undefined);
    }

    redirect(`/business/${businessId}?welcome=1`);
}
