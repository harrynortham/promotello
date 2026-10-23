"use server";

import { voucherConfirmationEmail } from "@/lib/account-emails";
import { sendEmails } from "@/lib/email";
import { createClient } from "@/utils/supabase/server";

type VoucherRow = {
    redemption_code: string;
    offers: {
        title: string;
        discount: string;
        expires_at: string | null;
        businesses: { name: string } | null;
    } | null;
};

// Emails the signed-in customer their voucher code after claiming.
export async function sendVoucherConfirmation(redemptionId: string) {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user?.email) {
        return { ok: false };
    }

    // RLS: customers can only read their own vouchers.
    const { data: voucher } = await supabase
        .from("offer_redemptions")
        .select("redemption_code, offers ( title, discount, expires_at, businesses ( name ) )")
        .eq("id", redemptionId)
        .eq("user_id", user.id)
        .maybeSingle<VoucherRow>();

    if (!voucher?.offers) {
        return { ok: false };
    }

    const { failed } = await sendEmails([
        voucherConfirmationEmail({
            to: user.email,
            code: voucher.redemption_code,
            offerTitle: voucher.offers.title,
            discount: voucher.offers.discount,
            businessName: voucher.offers.businesses?.name ?? "the business",
            expiresAt: voucher.offers.expires_at,
        }),
    ]);

    // Skipped sends (sending not set up, test addresses) aren't failures.
    return { ok: failed === 0 };
}
