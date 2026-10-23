"use server";

import { redirect } from "next/navigation";

import { createClient } from "@/utils/supabase/server";

export async function markVoucherUsed(formData: FormData) {
    const code = String(formData.get("code") ?? "");
    const redemptionId = String(formData.get("redemptionId") ?? "");

    const supabase = await createClient();

    // Checks the caller works at the business that owns the offer.
    const { error } = await supabase.rpc("mark_redemption_used", {
        requested_redemption_id: redemptionId,
    });

    redirect(`/redeem/${code}?${error ? "error=failed" : "done=1"}`);
}
