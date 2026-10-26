import { addressParts } from "@/lib/address";
import { createClient } from "@/utils/supabase/server";

import type { WalletRedemption } from "./redemption-list";

// The signed-in customer's vouchers: offers they claimed, and gift vouchers
// from businesses' automations. Pass an id to load just that one. Rows are
// limited to the customer's own by RLS and the user_id filter.

function firstRelation<T>(value: T | T[] | null): T | null {
    return Array.isArray(value) ? value[0] ?? null : value;
}

const giftLabels: Record<string, string> = {
    welcome: "Welcome gift",
    birthday: "Birthday treat",
    winback: "Come-back gift",
};

export async function getWallet(userId: string, id?: string): Promise<{ vouchers: WalletRedemption[]; error: boolean }> {
    const supabase = await createClient();

    let claimed = supabase
        .from("offer_redemptions")
        .select(
            `
                id,
                redemption_code,
                redeemed_at,
                used_at,
                offers (
                    slug,
                    title,
                    discount,
                    availability,
                    expires_at,
                    terms,
                    approval_status,
                    businesses (
                        id,
                        slug,
                        name,
                        approval_status,
                        business_locations (
                            name,
                            address_line_1,
                            city,
                            region,
                            postal_code
                        )
                    )
                )
            `,
        )
        .eq("user_id", userId)
        .order("redeemed_at", { ascending: false, nullsFirst: false });

    let gifts = supabase
        .from("reward_vouchers")
        .select("id, code, kind, reward, created_at, expires_at, used_at, businesses ( id, slug, name )")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

    if (id) {
        claimed = claimed.eq("id", id);
        gifts = gifts.eq("id", id);
    }

    const [{ data, error }, { data: giftRows }] = await Promise.all([claimed, gifts]);

    if (error) {
        return { vouchers: [], error: true };
    }

    const redemptions: WalletRedemption[] = (data ?? []).map((redemption) => {
        const offer = firstRelation(redemption.offers);
        const business = offer ? firstRelation(offer.businesses) : null;
        const locations = business?.business_locations;
        const location = locations ? firstRelation(locations) : null;

        return {
            id: redemption.id,
            code: redemption.redemption_code,
            claimedAt: redemption.redeemed_at,
            usedAt: redemption.used_at,
            offer: offer
                ? {
                    slug: offer.slug,
                    title: offer.title,
                    discount: offer.discount,
                    availability: offer.availability,
                    expiresAt: offer.expires_at,
                    terms: offer.terms,
                    approved: offer.approval_status === "approved" && business?.approval_status === "approved",
                }
                : null,
            business: business
                ? { id: business.id, slug: business.slug, name: business.name, address: addressParts(location).join(", ") }
                : null,
        };
    });

    const giftVouchers: WalletRedemption[] = (giftRows ?? []).map((gift) => {
        const business = firstRelation(gift.businesses);

        return {
            id: gift.id,
            code: gift.code,
            claimedAt: gift.created_at,
            usedAt: gift.used_at,
            offer: {
                slug: null,
                title: gift.reward,
                discount: giftLabels[gift.kind] ?? "Gift",
                availability: "One use. Show the code or QR to staff.",
                expiresAt: gift.expires_at,
                terms: "A personal gift from the business. It can't be swapped for cash.",
                approved: true,
            },
            business: business ? { id: business.id, slug: business.slug, name: business.name, address: "" } : null,
        };
    });

    const vouchers = [...giftVouchers, ...redemptions].sort((a, b) => (b.claimedAt ?? "").localeCompare(a.claimedAt ?? ""));

    return { vouchers, error: false };
}
