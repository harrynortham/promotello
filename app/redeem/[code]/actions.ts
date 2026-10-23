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

// Gift vouchers from automations ("G…" codes).
export async function markGiftUsed(formData: FormData) {
    const code = String(formData.get("code") ?? "");
    const voucherId = String(formData.get("voucherId") ?? "");

    const { error } = await (await createClient()).rpc("mark_reward_voucher_used", {
        requested_voucher_id: voucherId,
    });

    redirect(`/redeem/${code}?${error ? "error=failed" : "done=1"}`);
}
