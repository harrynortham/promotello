"use server";

import { redirect } from "next/navigation";

import { claimPreview as claimFor } from "@/lib/claim-preview";
import { trackOnboarding } from "@/lib/onboarding-events";
import { previewLink, tokenFromPreviewSegment } from "@/lib/previews";
import { createClient } from "@/utils/supabase/server";

// The signed-in visitor becomes the owner of the previewed business.
export async function claimPreview(formData: FormData) {
    const token = String(formData.get("token") ?? "");
    const name = String(formData.get("name") ?? "");
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    // Pressing Claim is where setting up starts, whether it sends them off
    // to make an account or straight into the flow. redirect() throws, so
    // this is written before either happens.
    await trackOnboarding("signup_started", {
        userId: user?.id ?? null,
        previewToken: tokenFromPreviewSegment(token),
        metadata: { from: "preview_claim", signed_in: user ? "yes" : "no" },
    });

    if (!user) {
        redirect(`/business/register?next=${encodeURIComponent(previewLink(token, name))}`);
    }

    const { businessId, error } = await claimFor(supabase, token, user.email);

    if (!businessId) {
        redirect(`${previewLink(token, name)}?error=${encodeURIComponent(error ?? "We couldn't claim this business.")}`);
    }

    redirect(`/business/setup/${businessId}?welcome=1`);
}
