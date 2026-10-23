"use client";

import Link from "next/link";
import { useState } from "react";
import {
    FiArrowRight,
    FiCheck,
    FiClock,
    FiCopy,
    FiGift,
    FiMapPin,
} from "react-icons/fi";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { VoucherQr } from "@/components/voucher-qr";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export type WalletRedemption = {
    id: string;
    code: string;
    claimedAt: string | null;
    usedAt: string | null;
    offer: {
        slug: string;
        title: string;
        discount: string;
        availability: string;
        expiresAt: string | null;
        terms: string;
        approved: boolean;
    } | null;
    business: {
        id: string;
        name: string;
        address: string;
    } | null;
};

type RedemptionListProps = {
    redemptions: WalletRedemption[];
    today: string;
};

type VoucherStatus = "ready" | "used" | "expired" | "unavailable";
type VoucherFilter = "all" | "ready" | "used" | "expired";

const statusLabels: Record<VoucherStatus, string> = {
    ready: "Ready to use",
    used: "Used",
    expired: "Expired",
    unavailable: "Check availability",
};

const statusClasses: Record<VoucherStatus, string> = {
    ready: "border-emerald-200 bg-emerald-50 text-emerald-800",
    used: "border-border bg-muted text-muted-foreground",
    expired: "border-amber-200 bg-amber-50 text-amber-900",
    unavailable: "border-border bg-muted text-muted-foreground",
};

const filters: {
    value: VoucherFilter;
    label: string;
}[] = [
        { value: "all", label: "All vouchers" },
        { value: "ready", label: "Ready to use" },
        { value: "used", label: "Used" },
        { value: "expired", label: "Expired" },
    ];

function getStatus(
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

function formatDate(value: string | null) {
    if (!value) {
        return "Date unavailable";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return "Date unavailable";
    }

    return new Intl.DateTimeFormat("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
        timeZone: "UTC",
    }).format(date);
}

function VoucherCard({
    redemption,
    status,
}: {
    redemption: WalletRedemption;
    status: VoucherStatus;
}) {
    const [copyMessage, setCopyMessage] = useState("");

    const offer = redemption.offer;
    const business = redemption.business;
    const isReady = status === "ready";

    const directionsUrl = business?.address
        ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
            business.address,
        )}`
        : null;

    async function copyCode() {
        try {
            await navigator.clipboard.writeText(redemption.code);
            setCopyMessage("Code copied.");
        } catch {
            setCopyMessage(
                "Couldn’t copy the code. You can still show it on screen.",
            );
        }
    }

    return (
        <Card className="overflow-hidden rounded-3xl shadow-none">
            <CardHeader>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                        {business ? (
                            <Link
                                href={`/businesses/${business.id}`}
                                className="text-sm font-medium text-muted-foreground underline-offset-4 hover:underline"
                            >
                                {business.name}
                            </Link>
                        ) : (
                            <p className="text-sm text-muted-foreground">
                                Business details unavailable
                            </p>
                        )}

                        <CardTitle className="mt-2 text-2xl leading-tight">
                            {offer?.title ??
                                "Promotion details unavailable"}
                        </CardTitle>

                        {offer?.discount && (
                            <p className="mt-3 font-semibold text-primary">
                                {offer.discount}
                            </p>
                        )}
                    </div>

                    <Badge
                        variant="outline"
                        className={`w-fit shrink-0 ${statusClasses[status]}`}
                    >
                        {statusLabels[status]}
                    </Badge>
                </div>
            </CardHeader>

            <CardContent>
                <div
                    className={`rounded-2xl border border-dashed p-5 text-center sm:p-7 ${isReady
                            ? "border-[#17233B]/20 bg-[#17233B] text-white"
                            : "border-border bg-muted/40"
                        }`}
                >
                    <p
                        className={`text-xs font-medium uppercase tracking-widest ${isReady
                                ? "text-white/65"
                                : "text-muted-foreground"
                            }`}
                    >
                        Your redemption code
                    </p>

                    {isReady && (
                        <VoucherQr code={redemption.code} className="mx-auto mt-4 size-44" />
                    )}

                    <p className="mt-3 break-all font-mono text-3xl font-semibold tracking-widest sm:text-4xl">
                        {redemption.code}
                    </p>

                    <p
                        className={`mt-4 text-sm leading-6 ${isReady
                                ? "text-white/70"
                                : "text-muted-foreground"
                            }`}
                    >
                        {status === "ready" &&
                            "Show this to staff when you pay. They can scan it or type the code."}

                        {status === "used" &&
                            "The business has marked this voucher as used."}

                        {status === "expired" &&
                            "The promotion’s published expiry date has passed."}

                        {status === "unavailable" &&
                            "We can’t confirm current availability. Contact the business or support before visiting."}
                    </p>
                </div>

                {isReady && (
                    <div className="mt-3 flex flex-wrap items-center gap-3">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={copyCode}
                        >
                            <FiCopy aria-hidden="true" />
                            Copy code
                        </Button>

                        <p
                            role="status"
                            className="text-xs text-muted-foreground"
                        >
                            {copyMessage}
                        </p>
                    </div>
                )}

                <div className="mt-6 grid gap-4 text-sm sm:grid-cols-2">
                    <div>
                        <p className="text-muted-foreground">
                            Claimed
                        </p>

                        <p className="mt-1 font-medium">
                            {formatDate(redemption.claimedAt)}
                        </p>
                    </div>

                    {redemption.usedAt ? (
                        <div>
                            <p className="text-muted-foreground">
                                Used
                            </p>

                            <p className="mt-1 font-medium">
                                {formatDate(redemption.usedAt)}
                            </p>
                        </div>
                    ) : offer?.expiresAt ? (
                        <div>
                            <p className="text-muted-foreground">
                                Promotion expires
                            </p>

                            <p className="mt-1 font-medium">
                                {formatDate(offer.expiresAt)}
                            </p>
                        </div>
                    ) : null}
                </div>

                {offer?.availability && (
                    <div className="mt-5 flex items-start gap-2 text-sm leading-7 text-muted-foreground">
                        <FiClock
                            aria-hidden="true"
                            className="mt-1.5 size-4 shrink-0"
                        />

                        <p>{offer.availability}</p>
                    </div>
                )}

                {business?.address && (
                    <div className="mt-3 flex items-start gap-2 text-sm leading-7 text-muted-foreground">
                        <FiMapPin
                            aria-hidden="true"
                            className="mt-1.5 size-4 shrink-0"
                        />

                        <p>{business.address}</p>
                    </div>
                )}

                {offer?.terms && (
                    <details className="mt-5 rounded-xl border">
                        <summary className="cursor-pointer px-4 py-3 text-sm font-medium">
                            Offer terms
                        </summary>

                        <p className="whitespace-pre-line px-4 pb-4 text-sm leading-7 text-muted-foreground">
                            {offer.terms}
                        </p>
                    </details>
                )}

                <Separator className="my-6" />

                <div className="flex flex-wrap gap-3">
                    {isReady && offer && (
                        <Button
                            render={
                                <Link href={`/offers/${offer.slug}`} />
                            }
                            nativeButton={false}
                            variant="outline"
                            size="sm"
                        >
                            View offer
                            <FiArrowRight aria-hidden="true" />
                        </Button>
                    )}

                    {directionsUrl && (
                        <Button
                            render={
                                <a
                                    href={directionsUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                />
                            }
                            nativeButton={false}
                            variant="outline"
                            size="sm"
                        >
                            <FiMapPin aria-hidden="true" />
                            Get directions
                        </Button>
                    )}

                    {!isReady && (
                        <Button
                            render={<Link href="/contact" />}
                            nativeButton={false}
                            variant="ghost"
                            size="sm"
                        >
                            Need help?
                        </Button>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}

export default function RedemptionList({
    redemptions,
    today,
}: RedemptionListProps) {
    const [filter, setFilter] = useState<VoucherFilter>("all");

    const vouchers = redemptions.map((redemption) => ({
        redemption,
        status: getStatus(redemption, today),
    }));

    const readyCount = vouchers.filter(
        (voucher) => voucher.status === "ready",
    ).length;

    const usedCount = vouchers.filter(
        (voucher) => voucher.status === "used",
    ).length;

    const expiredCount = vouchers.filter(
        (voucher) => voucher.status === "expired",
    ).length;

    const filteredVouchers = vouchers.filter(
        (voucher) =>
            filter === "all" || voucher.status === filter,
    );

    return (
        <section className="mx-auto max-w-5xl space-y-8 py-6">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <Badge variant="outline">
                        Your voucher wallet
                    </Badge>

                    <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
                        My vouchers
                    </h1>

                    <p className="mt-3 max-w-xl leading-7 text-muted-foreground">
                        Your claimed deals, ready when you need them.
                        Check the details before visiting and show your
                        code to the business.
                    </p>
                </div>

                <Button
                    render={<Link href="/explore" />}
                    nativeButton={false}
                    className="w-fit shrink-0"
                >
                    Explore deals
                    <FiArrowRight aria-hidden="true" />
                </Button>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
                {[
                    {
                        label: "Ready to use",
                        count: readyCount,
                        icon: FiGift,
                    },
                    {
                        label: "Used",
                        count: usedCount,
                        icon: FiCheck,
                    },
                    {
                        label: "Expired",
                        count: expiredCount,
                        icon: FiClock,
                    },
                ].map((item) => {
                    const Icon = item.icon;

                    return (
                        <Card
                            key={item.label}
                            className="rounded-2xl shadow-none"
                        >
                            <CardContent className="flex items-center justify-between gap-4 p-5">
                                <div>
                                    <p className="text-sm text-muted-foreground">
                                        {item.label}
                                    </p>

                                    <p className="mt-2 text-3xl font-semibold">
                                        {item.count}
                                    </p>
                                </div>

                                <Icon
                                    aria-hidden="true"
                                    className="size-5 text-muted-foreground"
                                />
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            <nav
                aria-label="Filter vouchers"
                className="flex flex-wrap gap-2"
            >
                {filters.map((item) => (
                    <Button
                        key={item.value}
                        type="button"
                        variant={
                            filter === item.value
                                ? "default"
                                : "outline"
                        }
                        size="sm"
                        aria-pressed={filter === item.value}
                        onClick={() => setFilter(item.value)}
                    >
                        {item.label}
                    </Button>
                ))}
            </nav>

            <p
                role="status"
                className="text-sm text-muted-foreground"
            >
                {filteredVouchers.length} voucher
                {filteredVouchers.length === 1 ? "" : "s"} shown
            </p>

            {filteredVouchers.length === 0 ? (
                <Card className="rounded-3xl border-dashed shadow-none">
                    <CardContent className="px-6 py-12 text-center">
                        <FiGift
                            aria-hidden="true"
                            className="mx-auto size-8 text-primary"
                        />

                        <h2 className="mt-5 text-xl font-semibold">
                            {redemptions.length === 0
                                ? "Your next discovery starts here."
                                : "No vouchers in this section."}
                        </h2>

                        <p className="mx-auto mt-3 max-w-md leading-7 text-muted-foreground">
                            {redemptions.length === 0
                                ? "Claim an offer and its code will appear here, ready for your visit."
                                : "Choose another filter to see your other vouchers."}
                        </p>

                        <Button
                            render={<Link href="/explore" />}
                            nativeButton={false}
                            variant="outline"
                            className="mt-6"
                        >
                            Browse local deals
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-6">
                    {filteredVouchers.map(
                        ({ redemption, status }) => (
                            <VoucherCard
                                key={redemption.id}
                                redemption={redemption}
                                status={status}
                            />
                        ),
                    )}
                </div>
            )}
        </section>
    );
}