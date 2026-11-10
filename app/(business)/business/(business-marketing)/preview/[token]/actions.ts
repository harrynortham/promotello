"use server";

import { redirect } from "next/navigation";

import { claimPreview as claimFor } from "@/lib/claim-preview";
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

    const { businessId, error } = await claimFor(supabase, token, user.email);

    if (!businessId) {
        redirect(`${previewLink(token, name)}?error=${encodeURIComponent(error ?? "We couldn't claim this business.")}`);
    }

    redirect(`/business/${businessId}?welcome=1`);
}
