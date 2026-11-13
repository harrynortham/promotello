import { Suspense } from "react";
import type { Metadata } from "next";
import { connection } from "next/server";

import { ShowMore } from "@/components/listing-ui";
import { pageOf } from "@/lib/listing-filters";

import { VoucherFilter, VoucherGrid, WalletEmpty, WalletError, WalletHeader, WalletLoading, statusPages } from "./voucher-list";
import { getGroupedWallet } from "./wallet";

export const metadata: Metadata = {
    title: "My vouchers",
};

// A screenful at a time, so a wallet that has been collecting vouchers
// for a year opens as fast as an empty one.
const PER_SCREEN = 12;

type PageProps = { searchParams: Promise<{ show?: string }> };

async function WalletOverview({ searchParams }: PageProps) {
    await connection();

    const { show } = await searchParams;
    const { error, total, all, counts } = await getGroupedWallet("/dashboard/redemptions");
    const page = pageOf(all, show, PER_SCREEN);

    return (
        <section className="mx-auto max-w-6xl space-y-8 text-[#17233B]">
            <WalletHeader
                title="My vouchers"
                description="Tap a voucher to show its QR code at the till. The one you claimed last is first, then the ones ending soonest."
                filter={<VoucherFilter active="all" counts={counts} />}
            />

            {error ? (
                <WalletError />
            ) : total === 0 ? (
                <WalletEmpty title="No vouchers yet" description={statusPages.ready.empty} />
            ) : (
                <div>
                    <VoucherGrid items={page.shown} />

                    <ShowMore
                        shown={page.shown.length}
                        total={page.total}
                        paged={page.paged}
                        capped={page.capped}
                        nextHref={page.more ? `/dashboard/redemptions?show=${page.more}` : null}
                        noun="vouchers"
                    />
                </div>
            )}
        </section>
    );
}

export default function CustomerRedemptionsPage(props: PageProps) {
    return (
        <Suspense fallback={<WalletLoading />}>
            <WalletOverview {...props} />
        </Suspense>
    );
}
