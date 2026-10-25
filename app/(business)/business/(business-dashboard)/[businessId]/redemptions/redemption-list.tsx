"use client";

import Link from "next/link";
import { useState } from "react";
import { createClient } from "@/utils/supabase/client";
import RedemptionLookup from "./redemption-lookup";

type Redemption = {
    id: string;
    redemption_code: string;
    redeemed_at: string | null;
    created_at: string;
    offers:
    | {
        title: string;
        business_id: string;
    }
    | {
        title: string;
        business_id: string;
    }[]
    | null;
};

type RedemptionListProps = {
    businessId: string;
    initialRedemptions: Redemption[];
};

export default function RedemptionList({
    businessId,
    initialRedemptions,
}: RedemptionListProps) {
    const [redemptions, setRedemptions] = useState(initialRedemptions);
    const [activeId, setActiveId] = useState("");
    const [errorMessage, setErrorMessage] = useState("");

    function getOfferTitle(redemption: Redemption) {
        if (Array.isArray(redemption.offers)) {
            return redemption.offers[0]?.title ?? "Unknown promotion";
        }

        return redemption.offers?.title ?? "Unknown promotion";
    }

    async function markAsUsed(redemptionId: string) {
        setActiveId(redemptionId);
        setErrorMessage("");

        const supabase = createClient();

        const { data, error } = await supabase.rpc("mark_redemption_used", {
            requested_redemption_id: redemptionId,
        });

        if (error) {
            setErrorMessage(error.message);
            setActiveId("");
            return;
        }

        setRedemptions((currentRedemptions) =>
            currentRedemptions.map((redemption) =>
                redemption.id === redemptionId
                    ? {
                        ...redemption,
                        redeemed_at: data.redeemed_at,
                    }
                    : redemption,
            ),
        );

        setActiveId("");
    }

    return (
        <main className="min-h-screen bg-[#FFF8F0] px-6 py-10 text-[#17233B] sm:py-16">
            <div className="mx-auto max-w-4xl">
                <Link
                    href={`/business/${businessId}/offers`}
                    className="text-sm font-semibold text-[#FF593F]"
                >
                    ← Back to promotions
                </Link>

                <header className="mt-8">
                    <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#FF593F]">
                        Customer redemptions
                    </p>

                    <h1 className="mt-3 text-4xl font-semibold tracking-tight">
                        Redemption codes
                    </h1>

                    <p className="mt-3 text-[#17233B]/65">
                        Validate customer codes and mark them as used.
                    </p>
                </header>

                <RedemptionLookup businessId={businessId} />

                {errorMessage && (
                    <div className="mt-8 rounded-2xl border border-red-200 bg-red-50 p-5 text-red-700">
                        {errorMessage}
                    </div>
                )}

                {redemptions.length === 0 ? (
                    <section className="mt-10 rounded-3xl bg-white p-10 text-center shadow-sm">
                        <h2 className="text-2xl font-semibold">No redemptions yet</h2>

                        <p className="mt-3 text-[#17233B]/65">
                            Customer redemption codes will appear here.
                        </p>
                    </section>
                ) : (
                    <section className="mt-10 space-y-5">
                        {redemptions.map((redemption) => (
                            <article
                                key={redemption.id}
                                className="rounded-3xl bg-white p-6 shadow-sm sm:p-8"
                            >
                                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                                    <div>
                                        <p className="text-sm text-[#17233B]/70">
                                            {getOfferTitle(redemption)}
                                        </p>

                                        <p className="mt-2 text-3xl font-bold tracking-[0.2em]">
                                            {redemption.redemption_code}
                                        </p>
                                    </div>

                                    <span
                                        className={`w-fit rounded-full px-3 py-1 text-xs font-semibold ${redemption.redeemed_at
                                            ? "bg-slate-100 text-slate-700"
                                            : "bg-emerald-100 text-emerald-800"
                                            }`}
                                    >
                                        {redemption.redeemed_at ? "Used" : "Available"}
                                    </span>
                                </div>

                                {!redemption.redeemed_at && (
                                    <button
                                        type="button"
                                        disabled={activeId === redemption.id}
                                        onClick={() => markAsUsed(redemption.id)}
                                        className="mt-6 rounded-xl bg-[#FF593F] px-5 py-3 font-semibold transition hover:bg-[#E94D36] disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                        {activeId === redemption.id
                                            ? "Marking as used…"
                                            : "Mark as used"}
                                    </button>
                                )}
                            </article>
                        ))}
                    </section>
                )}
            </div>
        </main>
    );
}