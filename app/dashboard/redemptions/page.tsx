import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { FiArrowRight } from "react-icons/fi";


import { VoucherGrid, VoucherTabs, WalletEmpty, WalletError, WalletHeader, WalletLoading, statusPages } from "./voucher-list";
import type { StatusedVoucher, StatusFilter } from "./voucher-status";
import { getGroupedWallet } from "./wallet";

export const metadata: Metadata = {
    title: "My vouchers",
};

// How many used and expired vouchers to show before "See all".
const PREVIEW = 3;

function Section({ status, items, limit }: { status: StatusFilter; items: StatusedVoucher[]; limit?: number }) {
    const page = statusPages[status];
    const shown = limit ? items.slice(0, limit) : items;

    return (
        <section aria-labelledby={`${status}-heading`}>
            <div className="flex items-end justify-between gap-4">
                <h2 id={`${status}-heading`} className="text-2xl font-semibold tracking-tight">
                    {page.label} <span className="text-[#17233B]/50">({items.length})</span>
                </h2>

                {limit && items.length > limit && (
                    <Link href={page.href} className="inline-flex shrink-0 items-center gap-1 text-sm font-medium hover:underline">
                        See all {items.length}
                        <FiArrowRight aria-hidden="true" />
                    </Link>
                )}
            </div>

            <div className="mt-5">
                {items.length === 0 ? (
                    <p className="rounded-2xl border border-dashed border-[#17233B]/15 bg-white px-5 py-6 text-[#17233B]/65">{page.empty}</p>
                ) : (
                    <VoucherGrid items={shown} />
                )}
            </div>
        </section>
    );
}

async function WalletOverview() {
    await connection();

    const { error, total, groups, counts } = await getGroupedWallet("/dashboard/redemptions");

    return (
        <section className="mx-auto max-w-6xl space-y-8 text-[#17233B]">
            <WalletHeader
                title="My vouchers"
                description="Tap a voucher to show its QR code at the till. The ones ending soonest are first."
            />

            <VoucherTabs active="all" counts={counts} />

            {error ? (
                <WalletError />
            ) : total === 0 ? (
                <WalletEmpty title="No vouchers yet" description={statusPages.ready.empty} />
            ) : (
                <div className="space-y-12">
                    <Section status="ready" items={groups.ready} />

                    {groups.unavailable.length > 0 && (
                        <section aria-labelledby="unavailable-heading">
                            <h2 id="unavailable-heading" className="text-2xl font-semibold tracking-tight">
                                Not available right now
                            </h2>
                            <p className="mt-2 text-[#17233B]/65">These offers have been paused. Check with the business before you visit.</p>
                            <div className="mt-5">
                                <VoucherGrid items={groups.unavailable} />
                            </div>
                        </section>
                    )}

                    {groups.used.length > 0 && <Section status="used" items={groups.used} limit={PREVIEW} />}
                    {groups.expired.length > 0 && <Section status="expired" items={groups.expired} limit={PREVIEW} />}
                </div>
            )}
        </section>
    );
}

export default function CustomerRedemptionsPage() {
    return (
        <Suspense fallback={<WalletLoading />}>
            <WalletOverview />
        </Suspense>
    );
}
