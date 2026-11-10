"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { FiClock, FiCopy, FiGift, FiMapPin } from "react-icons/fi";

import { Button } from "@/components/ui/button";
import { VoucherQr } from "@/components/voucher-qr";
import { storedImage } from "@/lib/images";
import { businessPath } from "@/lib/slugs";

import type { VoucherStatus, WalletRedemption } from "./voucher-status";

const statusLabels: Record<VoucherStatus, string> = {
    ready: "Ready to use",
    used: "Used",
    expired: "Expired",
    unavailable: "Check availability",
};

const stamps: Record<VoucherStatus, string | null> = {
    ready: null,
    used: "Used",
    expired: "Expired",
    unavailable: null,
};

const stubNotes: Record<VoucherStatus, string> = {
    ready: "Show this to staff when you pay. They can scan it or type the code.",
    used: "The business has marked this voucher as used.",
    expired: "The offer's published expiry date has passed.",
    unavailable: "We can't confirm current availability. Contact the business or support before visiting.",
};

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

// One voucher on its own page: the same ticket as in the wallet, torn
// open. The offer on top, the perforation across the middle, and the
// stub underneath holding the thing staff need — the QR at a size that
// scans across a counter, and the code to read out if it won't.
export function VoucherCard({
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
    const image = storedImage(offer?.imageUrl);
    const stamp = stamps[status];

    const directionsUrl = business?.address
        ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(business.address)}`
        : null;

    async function copyCode() {
        try {
            await navigator.clipboard.writeText(redemption.code);
            setCopyMessage("Code copied.");
        } catch {
            setCopyMessage("Couldn't copy the code. You can still show it on screen.");
        }
    }

    return (
        <div className="space-y-6">
            <article className="relative flex flex-col rounded-2xl border border-[#17233B]/10 bg-white shadow-sm">
                <div className="relative aspect-[16/10] overflow-hidden rounded-t-2xl bg-[#FFF4E8]">
                    {image ? (
                        <Image
                            src={image}
                            alt=""
                            fill
                            sizes="(min-width: 640px) 36rem, 100vw"
                            className={`object-cover ${isReady ? "" : "grayscale"}`}
                            priority
                        />
                    ) : (
                        <FiGift aria-hidden="true" className="absolute left-1/2 top-1/2 size-12 -translate-x-1/2 -translate-y-1/2 text-[#FF593F]/70" />
                    )}

                    {stamp && (
                        <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 -rotate-12 rounded-lg border-2 border-[#17233B]/55 bg-white/85 px-5 py-2 text-base font-bold uppercase tracking-[0.2em] text-[#17233B]/70">
                            {stamp}
                        </span>
                    )}
                </div>

                <div className="px-6 pb-6 pt-5">
                    {business ? (
                        <Link
                            href={businessPath(business)}
                            className="text-sm font-medium text-[#17233B]/65 underline-offset-4 hover:underline"
                        >
                            {business.name}
                        </Link>
                    ) : (
                        <p className="text-sm text-[#17233B]/65">Business details unavailable</p>
                    )}

                    {offer?.discount && (
                        <p className={`mt-1 text-3xl font-semibold leading-tight ${isReady ? "text-[#FF593F]" : "text-[#17233B]/70"}`}>
                            {offer.discount}
                        </p>
                    )}

                    <h2 className="mt-1.5 text-lg font-medium leading-snug">
                        {offer?.title ?? "Offer details unavailable"}
                    </h2>
                </div>

                {/* The tear, punched through both edges. */}
                <div className="relative">
                    <span className="absolute -left-3 top-1/2 size-6 -translate-y-1/2 rounded-full bg-[#FFF8F0]" />
                    <span className="absolute -right-3 top-1/2 size-6 -translate-y-1/2 rounded-full bg-[#FFF8F0]" />
                    <div className="mx-3.5 border-t border-dashed border-[#17233B]/25" />
                </div>

                {/* The stub: the same navy the offer page and the voucher
                    email use for a claimed code, so it is recognisably the
                    same object in all three places. */}
                <div
                    className={`rounded-b-2xl px-6 py-7 text-center ${isReady ? "bg-[#17233B] text-white" : "bg-[#17233B]/[0.04] text-[#17233B]"}`}
                >
                    <p className={`text-xs font-semibold uppercase tracking-[0.16em] ${isReady ? "text-white/65" : "text-[#17233B]/60"}`}>
                        {isReady ? "Your redemption code" : statusLabels[status]}
                    </p>

                    {isReady && <VoucherQr code={redemption.code} className="mx-auto mt-5 size-56" />}

                    <p
                        className={`mt-4 break-all font-mono text-3xl font-bold tracking-[0.18em] sm:text-4xl ${isReady ? "" : "text-[#17233B]/65 line-through"}`}
                    >
                        {redemption.code}
                    </p>

                    <p className={`mx-auto mt-4 max-w-sm text-sm leading-6 ${isReady ? "text-white/70" : "text-[#17233B]/65"}`}>
                        {stubNotes[status]}
                    </p>

                    {isReady && (
                        <div className="mt-5">
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={copyCode}
                                className="border-white/25 bg-transparent text-white hover:bg-white/10"
                            >
                                <FiCopy aria-hidden="true" />
                                Copy code
                            </Button>

                            <p role="status" className="mt-2 text-xs text-white/60">
                                {copyMessage}
                            </p>
                        </div>
                    )}
                </div>
            </article>

            {/* Everything that isn't the voucher itself. */}
            <section className="rounded-2xl border border-[#17233B]/10 bg-white p-6">
                <dl className="grid gap-4 text-sm sm:grid-cols-2">
                    <div>
                        <dt className="text-[#17233B]/65">Claimed</dt>
                        <dd className="mt-1 font-medium">{formatDate(redemption.claimedAt)}</dd>
                    </div>

                    {redemption.usedAt ? (
                        <div>
                            <dt className="text-[#17233B]/65">Used</dt>
                            <dd className="mt-1 font-medium">{formatDate(redemption.usedAt)}</dd>
                        </div>
                    ) : offer?.expiresAt ? (
                        <div>
                            <dt className="text-[#17233B]/65">Offer expires</dt>
                            <dd className="mt-1 font-medium">{formatDate(offer.expiresAt)}</dd>
                        </div>
                    ) : null}
                </dl>

                {offer?.availability && (
                    <div className="mt-5 flex items-start gap-2 text-sm leading-6 text-[#17233B]/70">
                        <FiClock aria-hidden="true" className="mt-1 size-4 shrink-0" />
                        <p>{offer.availability}</p>
                    </div>
                )}

                {business?.address && (
                    <div className="mt-3 flex items-start gap-2 text-sm leading-6 text-[#17233B]/70">
                        <FiMapPin aria-hidden="true" className="mt-1 size-4 shrink-0" />
                        <p>{business.address}</p>
                    </div>
                )}

                {offer?.terms && (
                    <details className="mt-5 rounded-xl border border-[#17233B]/10">
                        <summary className="cursor-pointer px-4 py-3 text-sm font-medium">Offer terms</summary>
                        <p className="whitespace-pre-line px-4 pb-4 text-sm leading-6 text-[#17233B]/70">{offer.terms}</p>
                    </details>
                )}

                <div className="mt-6 flex flex-wrap gap-3">
                    {offer?.slug && offer.approved && (
                        <Button render={<Link href={`/offers/${offer.slug}`} />} nativeButton={false} variant="outline" size="sm">
                            View offer page
                        </Button>
                    )}

                    {directionsUrl && (
                        <Button
                            render={<a href={directionsUrl} target="_blank" rel="noopener noreferrer" />}
                            nativeButton={false}
                            variant="outline"
                            size="sm"
                        >
                            <FiMapPin aria-hidden="true" />
                            Get directions
                        </Button>
                    )}

                    {!isReady && (
                        <Button render={<Link href="/contact" />} nativeButton={false} variant="ghost" size="sm">
                            Need help?
                        </Button>
                    )}
                </div>
            </section>
        </div>
    );
}
