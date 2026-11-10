"use server";

import { sendVoucherFor } from "@/lib/claim-offer";
import { createClient } from "@/utils/supabase/server";

// Emails the signed-in customer their voucher code after claiming. The
// claim finished at sign-in sends the same email from lib/claim-offer.
export async function sendVoucherConfirmation(redemptionId: string) {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return { ok: false };
    }

    return sendVoucherFor(supabase, user, redemptionId);
}
