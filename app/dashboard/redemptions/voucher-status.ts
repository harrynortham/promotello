import type { WalletRedemption } from "./redemption-list";

// Shared by the vouchers list and each voucher's page.
export type VoucherStatus = "ready" | "used" | "expired" | "unavailable";

export function getStatus(
    redemption: WalletRedemption,
    today: string,
): VoucherStatus {
    if (redemption.usedAt) {
        return "used";
    }

    if (!redemption.offer) {
        return "unavailable";
    }

    if (
        redemption.offer.expiresAt &&
        redemption.offer.expiresAt.slice(0, 10) < today
    ) {
        return "expired";
    }

    if (!redemption.offer.approved) {
        return "unavailable";
    }

    return "ready";
}
