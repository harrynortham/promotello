// Shared by the vouchers pages, each voucher's page and the dashboard.

import type { OfferSchedule } from "@/lib/schedule";

export type WalletRedemption = {
    id: string;
    code: string;
    claimedAt: string | null;
    usedAt: string | null;
    offer: {
        // Null for gift vouchers from automations, which have no offer page.
        slug: string | null;
        title: string;
        // What the offer covers, in the business's own words.
        description: string | null;
        discount: string;
        availability: string;
        // Set only when staff are held to the offer's times: outside it
        // the voucher won't mark as used, which the holder should hear
        // from us rather than from somebody behind a counter.
        window: OfferSchedule | null;
        expiresAt: string | null;
        terms: string;
        approved: boolean;
        imageUrl: string | null;
    } | null;
    business: {
        id: string;
        slug: string;
        name: string;
        address: string;
    } | null;
};

export type VoucherStatus = "ready" | "used" | "expired" | "unavailable";

export type StatusFilter = Exclude<VoucherStatus, "unavailable">;

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

export function todayInUk() {
    return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London" }).format(new Date());
}

export type StatusedVoucher = { voucher: WalletRedemption; status: VoucherStatus };

// Groups vouchers by status. Ready ones come soonest-ending first, so the
// ones about to run out are at the top; the rest newest first.
export function groupVouchers(vouchers: WalletRedemption[], today = todayInUk()) {
    const withStatus = vouchers.map((voucher) => ({ voucher, status: getStatus(voucher, today) }));
    const of = (status: VoucherStatus) => withStatus.filter((item) => item.status === status);

    const ready = of("ready").sort((a, b) =>
        (a.voucher.offer?.expiresAt ?? "9999").localeCompare(b.voucher.offer?.expiresAt ?? "9999"),
    );
    const used = of("used").sort((a, b) => (b.voucher.usedAt ?? "").localeCompare(a.voucher.usedAt ?? ""));

    return { ready, used, expired: of("expired"), unavailable: of("unavailable") };
}

// The wallet as one list: the one they just claimed, then the ones
// running out, then everything they can no longer use. The same shape
// the loyalty wallet is in (lib/loyalty-state.ts) — a list somebody
// reads from the top rather than a page of headings to get past.
//
// The newest goes first on its own. Somebody who has just scanned a
// poster or claimed an offer is holding the phone out to show it, and
// a voucher claimed thirty seconds ago is not the one ending soonest,
// so sorting by expiry alone buries exactly the one they want. After
// it, the ones running out are the ones worth using next, and a
// voucher with no end date falls back to when they claimed it.
export function sortVouchers(vouchers: StatusedVoucher[]) {
    const rank: Record<VoucherStatus, number> = { ready: 0, unavailable: 1, used: 2, expired: 3 };

    // When it last mattered: claimed for one they can still use, used
    // for one they have.
    const when = ({ voucher, status }: StatusedVoucher) =>
        (status === "used" ? voucher.usedAt : voucher.claimedAt) ?? "";

    const ending = ({ voucher }: StatusedVoucher) => voucher.offer?.expiresAt ?? "9999";

    const ready = vouchers
        .filter((item) => item.status === "ready")
        .sort((a, b) => when(b).localeCompare(when(a)));

    const [newest, ...rest] = ready;

    const inOrder = [
        ...(newest ? [newest] : []),
        ...rest.sort((a, b) => ending(a).localeCompare(ending(b)) || when(b).localeCompare(when(a))),
        ...vouchers
            .filter((item) => item.status !== "ready")
            .sort((a, b) => rank[a.status] - rank[b.status] || when(b).localeCompare(when(a))),
    ];

    return inOrder;
}

const shortDate = (value: string) =>
    new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(value));

// The one line of timing that matters for each kind of voucher.
export function timingLabel({ voucher, status }: StatusedVoucher, today = todayInUk()): { text: string; urgent: boolean } | null {
    if (status === "used" && voucher.usedAt) {
        return { text: `Used ${shortDate(voucher.usedAt)}`, urgent: false };
    }

    const expiresAt = voucher.offer?.expiresAt?.slice(0, 10);

    if (!expiresAt) {
        return null;
    }

    if (status === "expired") {
        return { text: `Ended ${shortDate(expiresAt)}`, urgent: false };
    }

    const daysLeft = Math.round((Date.parse(expiresAt) - Date.parse(today)) / 86_400_000);

    if (daysLeft === 0) return { text: "Ends today", urgent: true };
    if (daysLeft === 1) return { text: "Ends tomorrow", urgent: true };
    if (daysLeft <= 7) return { text: `Ends in ${daysLeft} days`, urgent: true };
    return { text: `Ends ${shortDate(expiresAt)}`, urgent: false };
}
