"use client";

import Link from "next/link";

import { Button } from "@/components/ui/button";

type Redemption = {
    id: string;
    redemption_code: string;
    redeemed_at: string;
    used_at: string | null;
    offers:
    | {
        slug: string;
        title: string;
        discount: string;
        businesses:
        | {
            name: string;
        }
        | {
            name: string;
        }[]
        | null;
    }
    | {
        slug: string;
        title: string;
        discount: string;
        businesses:
        | {
            name: string;
        }
        | {
            name: string;
        }[]
        | null;
    }[]
    | null;
};

function getOffer(
    offers: Redemption["offers"],
) {
    return Array.isArray(offers) ? offers[0] : offers;
}

function getBusinessName(
    businesses:
        | {
            name: string;
        }
        | {
            name: string;
        }[]
        | null
        | undefined,
) {
    if (!businesses) {
        return "Local business";
    }

    return Array.isArray(businesses)
        ? businesses[0]?.name ?? "Local business"
        : businesses.name;
}

export default function RedemptionList({
    redemptions,
}: {
    redemptions: Redemption[];
}) {
    return (
        <main className="min-h-screen bg-[#FFF8F0] px-6 py-10 text-[#17233B] sm:py-16">
            <div className="mx-auto max-w-4xl">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#FF593F]">
                            Customer account
                        </p>

                        <h1 className="mt-3 text-4xl font-semibold tracking-tight">
                            My redemptions
                        </h1>

                        <p className="mt-3 text-[#17233B]/65">
                            Keep track of the offers you have redeemed.
                        </p>
                    </div>

                    <Button
                        render={<Link href="/#offers" />}
                        nativeButton={false}
                        variant="default"
                        size="sm"
                    >
                        Browse deals
                    </Button>
                </div>

                {redemptions.length === 0 ? (
                    <section className="mt-10 rounded-3xl bg-white p-8 text-center shadow-sm sm:p-12">
                        <h2 className="text-2xl font-semibold">
                            No redemptions yet
                        </h2>

                        <p className="mx-auto mt-3 max-w-md leading-7 text-[#17233B]/65">
                            When you redeem an offer, your redemption code and offer details
                            will appear here.
                        </p>

                        <Button
                            render={<Link href="/#offers" />}
                            nativeButton={false}
                            variant="default"
                            className="mt-7"
                        >
                            Explore deals
                        </Button>
                    </section>
                ) : (
                    <section className="mt-10 grid gap-6">
                        {redemptions.map((redemption) => {
                            const offer = getOffer(redemption.offers);

                            if (!offer) {
                                return null;
                            }

                            const businessName = getBusinessName(offer.businesses);
                            const isUsed = Boolean(redemption.used_at);

                            return (
                                <article
                                    key={redemption.id}
                                    className="rounded-3xl bg-white p-6 shadow-sm sm:p-8"
                                >
                                    <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
                                        <div>
                                            <p className="text-sm font-medium text-[#17233B]/60">
                                                {businessName}
                                            </p>

                                            <h2 className="mt-2 text-2xl font-semibold">
                                                {offer.title}
                                            </h2>

                                            <p className="mt-2 font-semibold text-[#FF593F]">
                                                {offer.discount}
                                            </p>
                                        </div>

                                        <span
                                            className={`w-fit rounded-full px-3 py-1 text-xs font-semibold ${isUsed
                                                    ? "bg-slate-100 text-slate-700"
                                                    : "bg-emerald-100 text-emerald-800"
                                                }`}
                                        >
                                            {isUsed ? "Used" : "Active"}
                                        </span>
                                    </div>

                                    <div className="mt-6 rounded-2xl bg-[#17233B] p-5 text-center text-white">
                                        <p className="text-sm text-white/70">
                                            Redemption code
                                        </p>

                                        <p className="mt-2 text-2xl font-bold tracking-[0.2em]">
                                            {redemption.redemption_code}
                                        </p>

                                        <p className="mt-3 text-sm text-white/70">
                                            {isUsed
                                                ? "This redemption has been marked as used."
                                                : "Show this code to the business."}
                                        </p>
                                    </div>

                                    <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-[#17233B]/10 pt-5">
                                        <p className="text-sm text-[#17233B]/60">
                                            Redeemed{" "}
                                            {new Date(
                                                redemption.redeemed_at,
                                            ).toLocaleDateString("en-GB", {
                                                day: "numeric",
                                                month: "long",
                                                year: "numeric",
                                            })}
                                        </p>

                                        <Button
                                            render={
                                                <Link href={`/offers/${offer.slug}`} />
                                            }
                                            nativeButton={false}
                                            variant="outline"
                                            size="sm"
                                        >
                                            View offer
                                        </Button>
                                    </div>
                                </article>
                            );
                        })}
                    </section>
                )}
            </div>
        </main>
    );
}