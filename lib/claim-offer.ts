import type { SupabaseClient, User } from "@supabase/supabase-js";

import { voucherConfirmationEmail } from "@/lib/account-emails";
import { sendOfferStockAlert } from "@/lib/business-notifications";
import { sendEmails } from "@/lib/email";

// Claiming an offer happens two ways, and they end the same.
//
// Signed in, the button on the offer page does it in the browser. Signed
// out, the same button says "Log in to claim this deal" — both halves of
// that sentence — and carries ?claim=1 to the sign-in, which finishes it
// here. Handing the button back to be pressed a second time asks twice
// for the same thing, which is what claiming a preview used to do too.

type VoucherRow = {
    redemption_code: string;
    offer_id: string;
    offers: {
        title: string;
        description: string | null;
        terms: string | null;
        discount: string;
        expires_at: string | null;
        businesses: { name: string } | null;
    } | null;
};

// The offer somebody asked to claim as they signed in, from the path they
// were heading to. Anything else, including a plain offer link somebody
// followed to sign in, is left alone.
export function offerBeingClaimed(next: string) {
    const [path, query = ""] = next.split("?");

    if (!path.startsWith("/offers/") || new URLSearchParams(query).get("claim") !== "1") {
        return null;
    }

    const slug = path.slice("/offers/".length);

    return /^[a-z0-9-]+$/i.test(slug) ? slug : null;
}

// Claims it for them, unless they already have it. RLS only shows an
// approved offer, and redeem_offer() checks everything else — expired,
// fully claimed, claimed already — so a failure here means they see the
// offer page saying so, which is the same answer the button gives.
export async function claimOffer(supabase: SupabaseClient, slug: string, user: User) {
    const { data: offer } = await supabase
        .from("offers")
        .select("id")
        .eq("slug", slug)
        .maybeSingle();

    if (!offer) {
        return { redemptionId: null };
    }

    const { data: existing } = await supabase
        .from("offer_redemptions")
        .select("id")
        .eq("offer_id", offer.id)
        .eq("user_id", user.id)
        .maybeSingle();

    if (existing) {
        return { redemptionId: null };
    }

    const { data, error } = await supabase.rpc("redeem_offer", { requested_offer_id: offer.id });

    if (error) {
        return { redemptionId: null, error };
    }

    const row = Array.isArray(data) ? data[0] : data;
    const redemptionId = row && typeof row === "object" && "id" in row && typeof row.id === "string" ? row.id : null;

    return { redemptionId };
}

// The voucher email, and the low-stock line to the business. Shared, so a
// claim finished at sign-in is the same claim as one made with the button.
export async function sendVoucherFor(supabase: SupabaseClient, user: User, redemptionId: string) {
    if (!user.email) {
        return { ok: false };
    }

    // RLS: customers can only read their own vouchers.
    const { data: voucher } = await supabase
        .from("offer_redemptions")
        .select(
            "redemption_code, offer_id, offers ( title, description, terms, discount, expires_at, businesses ( name ) )",
        )
        .eq("id", redemptionId)
        .eq("user_id", user.id)
        .maybeSingle<VoucherRow>();

    if (!voucher?.offers) {
        return { ok: false };
    }

    const { failed } = await sendEmails([
        voucherConfirmationEmail({
            to: user.email,
            redemptionId,
            code: voucher.redemption_code,
            offerTitle: voucher.offers.title,
            description: voucher.offers.description,
            terms: voucher.offers.terms,
            discount: voucher.offers.discount,
            businessName: voucher.offers.businesses?.name ?? "the business",
            expiresAt: voucher.offers.expires_at,
        }),
    ]);

    // Tell the business if this claim ran the offer low or out. Its
    // failure mustn't affect the customer.
    await sendOfferStockAlert(voucher.offer_id).catch((error) =>
        console.error("Offer stock alert failed", error),
    );

    // Skipped sends (sending not set up, test addresses) aren't failures.
    return { ok: failed === 0 };
}
