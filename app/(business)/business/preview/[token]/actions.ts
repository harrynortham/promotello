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
    // Always the preview link, including when the claim was pressed on
    // /@theirhandle. It is not just where they came from: afterSignIn()
    // recognises a preview in `next` and finishes the claim itself, so
    // somebody who had to make an account lands on their business
    // rather than back on a button they have already pressed. Sending
    // them anywhere else costs them a second tap.
    const back = previewLink(token, name);
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
        redirect(`/business/register?next=${encodeURIComponent(back)}`);
    }

    const { businessId, error } = await claimFor(supabase, token, user.email);

    if (!businessId) {
        redirect(`${back}?error=${encodeURIComponent(error ?? "We couldn't claim this business.")}`);
    }

    redirect(`/business/setup/${businessId}?welcome=1`);
}
