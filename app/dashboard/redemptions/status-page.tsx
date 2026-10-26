import { Suspense } from "react";
import { connection } from "next/server";

import { VoucherGrid, VoucherTabs, WalletEmpty, WalletError, WalletHeader, WalletLoading, statusPages } from "./voucher-list";
import type { StatusFilter } from "./voucher-status";
import { getGroupedWallet } from "./wallet";

// The Ready to use, Used and Expired pages: one status's vouchers in full.

const descriptions: Record<StatusFilter, string> = {
    ready: "Tap one to show its QR code at the till. The ones ending soonest are first.",
    used: "Vouchers you've used, most recent first.",
    expired: "Offers that ended before you used them.",
};

async function StatusVouchers({ status }: { status: StatusFilter }) {
    await connection();

    const page = statusPages[status];
    const { error, groups, counts } = await getGroupedWallet(page.href);
    const items = groups[status];

    return (
        <section className="mx-auto max-w-6xl space-y-8 text-[#17233B]">
            <WalletHeader title={page.label} description={descriptions[status]} />

            <VoucherTabs active={status} counts={counts} />

            {error ? (
                <WalletError />
            ) : items.length === 0 ? (
                <WalletEmpty title={`No ${page.label.toLowerCase()} vouchers`} description={page.empty} />
            ) : (
                <VoucherGrid items={items} />
            )}
        </section>
    );
}

export function StatusVouchersPage({ status }: { status: StatusFilter }) {
    return (
        <Suspense fallback={<WalletLoading />}>
            <StatusVouchers status={status} />
        </Suspense>
    );
}
