import Image from "next/image";
import Link from "next/link";
import { FiArrowRight, FiClock, FiGift } from "react-icons/fi";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

import { timingLabel, type StatusedVoucher, type StatusFilter } from "./voucher-status";

// The pieces of the vouchers pages and the dashboard's "Ready to use".

export const statusPages: Record<StatusFilter, { label: string; href: string; empty: string }> = {
    ready: {
        label: "Ready to use",
        href: "/dashboard/redemptions/ready",
        empty: "Claim an offer and its code appears here, ready to show when you pay.",
    },
    used: {
        label: "Used",
        href: "/dashboard/redemptions/used",
        empty: "Vouchers you've used at a business appear here.",
    },
    expired: {
        label: "Expired",
        href: "/dashboard/redemptions/expired",
        empty: "Vouchers whose offer ended before you used them appear here.",
    },
};

export function WalletHeader({ title, description }: { title: string; description: string }) {
    return (
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#FF593F]">Your vouchers</p>
                <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h1>
                <p className="mt-2 max-w-xl text-[#17233B]/65">{description}</p>
            </div>

            <Button render={<Link href="/offers" />} nativeButton={false} variant="outline" className="w-fit shrink-0">
                Find more offers
                <FiArrowRight aria-hidden="true" />
            </Button>
        </div>
    );
}

export function VoucherTabs({ active, counts }: { active: StatusFilter | "all"; counts: Record<StatusFilter, number> }) {
    const tabs = [
        { key: "all", label: "All", href: "/dashboard/redemptions", count: null },
        ...(Object.keys(statusPages) as StatusFilter[]).map((key) => ({
            key,
            label: statusPages[key].label,
            href: statusPages[key].href,
            count: counts[key],
        })),
    ];

    return (
        <nav aria-label="Vouchers" className="flex flex-wrap gap-2">
            {tabs.map((tab) => {
                const current = tab.key === active;

                return (
                    <Link
                        key={tab.key}
                        href={tab.href}
                        aria-current={current ? "page" : undefined}
                        className={`inline-flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition ${
                            current
                                ? "border-[#17233B] bg-[#17233B] text-white"
                                : "border-[#17233B]/15 bg-white text-[#17233B] hover:border-[#17233B]/40"
                        }`}
                    >
                        {tab.label}
                        {tab.count !== null && (
                            <span className={`rounded-full px-2 py-0.5 text-xs ${current ? "bg-white/15" : "bg-[#17233B]/5"}`}>
                                {tab.count}
                            </span>
                        )}
                    </Link>
                );
            })}
        </nav>
    );
}

export function CompactVoucher({ item }: { item: StatusedVoucher }) {
    const { voucher, status } = item;
    const offer = voucher.offer;
    const isReady = status === "ready";
    const timing = timingLabel(item);

    return (
        <Link
            href={`/dashboard/redemptions/${voucher.id}`}
            className={`group flex overflow-hidden rounded-2xl border border-[#17233B]/10 bg-white transition hover:shadow-md ${isReady ? "" : "opacity-80 hover:opacity-100"}`}
        >
            <div className="relative flex w-24 shrink-0 items-center justify-center bg-[#FFF4E8] sm:w-28">
                {offer?.imageUrl ? (
                    <Image src={offer.imageUrl} alt="" fill sizes="112px" className={`object-cover ${isReady ? "" : "grayscale"}`} />
                ) : (
                    <FiGift aria-hidden="true" className="size-7 text-[#FF593F]" />
                )}
            </div>

            <div className="min-w-0 flex-1 p-4">
                <p className="truncate text-sm text-[#17233B]/70">{voucher.business?.name ?? "Business"}</p>
                <p className="mt-0.5 line-clamp-2 font-semibold leading-snug">{offer?.title ?? "Offer details unavailable"}</p>

                {timing && (
                    <p className={`mt-1.5 inline-flex items-center gap-1 text-xs font-medium ${timing.urgent ? "text-amber-700" : "text-[#17233B]/60"}`}>
                        <FiClock aria-hidden="true" />
                        {timing.text}
                    </p>
                )}

                <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
                    {isReady && (
                        <span className="inline-flex rounded-lg bg-[#17233B] px-2.5 py-1 font-mono text-sm font-semibold tracking-widest text-white">
                            {voucher.code}
                        </span>
                    )}
                    <span className={`inline-flex items-center gap-1 text-sm font-medium group-hover:underline ${isReady ? "text-[#FF593F]" : "text-[#17233B]/70"}`}>
                        {isReady ? "Show QR code" : "View details"}
                        <FiArrowRight aria-hidden="true" />
                    </span>
                </div>
            </div>
        </Link>
    );
}

export function VoucherGrid({ items }: { items: StatusedVoucher[] }) {
    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {items.map((item) => (
                <CompactVoucher key={item.voucher.id} item={item} />
            ))}
        </div>
    );
}

export function WalletEmpty({ title, description }: { title: string; description: string }) {
    return (
        <div className="rounded-3xl border border-dashed border-[#17233B]/20 bg-white px-6 py-12 text-center">
            <FiGift aria-hidden="true" className="mx-auto size-8 text-[#FF593F]" />
            <h2 className="mt-4 text-xl font-semibold">{title}</h2>
            <p className="mx-auto mt-2 max-w-md text-[#17233B]/65">{description}</p>
            <Button render={<Link href="/offers" />} nativeButton={false} className="mt-6">
                Browse offers
                <FiArrowRight aria-hidden="true" />
            </Button>
        </div>
    );
}

export function WalletLoading() {
    return (
        <section role="status" aria-label="Loading your vouchers" className="mx-auto max-w-6xl space-y-8">
            <Skeleton className="h-24 w-full max-w-md" />
            <Skeleton className="h-10 w-full max-w-lg rounded-full" />
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3].map((item) => (
                    <Skeleton key={item} className="h-36 rounded-2xl" />
                ))}
            </div>
        </section>
    );
}

export function WalletError() {
    return (
        <Alert variant="destructive">
            <AlertTitle>We couldn’t load your vouchers</AlertTitle>
            <AlertDescription>Please refresh the page and try again.</AlertDescription>
        </Alert>
    );
}
