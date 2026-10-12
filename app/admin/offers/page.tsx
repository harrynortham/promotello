"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

type Offer = {
    id: string;
    title: string;
    category: string;
    discount: string;
    description: string;
    availability: string;
    expires_at: string;
    terms: string;
    approval_status: "pending" | "approved" | "rejected" | "suspended";
    businesses:
    | {
        name: string;
    }
    | {
        name: string;
    }[]
    | null;
};

export default function AdminOffersPage() {
    const router = useRouter();

    const [offers, setOffers] = useState<Offer[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeOfferId, setActiveOfferId] = useState("");
    const [errorMessage, setErrorMessage] = useState("");

    async function loadOffers() {
        const supabase = createClient();

        const { data, error } = await supabase
            .from("offers")
            .select(
                `
          id,
          title,
          category,
          discount,
          description,
          availability,
          expires_at,
          terms,
          approval_status,
          businesses (
            name
          )
        `,
            )
            .eq("approval_status", "pending")
            .order("created_at", { ascending: true });

        if (error) {
            setErrorMessage(error.message);
        } else {
            setOffers((data ?? []) as Offer[]);
        }

        setIsLoading(false);
    }

    useEffect(() => {
        async function checkAccess() {
            const supabase = createClient();

            const {
                data: { user },
            } = await supabase.auth.getUser();

            if (!user) {
                router.replace("/login");
                return;
            }

            const { data: isAdmin, error } = await supabase.rpc(
                "is_platform_admin",
            );

            if (error || !isAdmin) {
                router.replace("/dashboard");
                return;
            }

            await loadOffers();
        }

        checkAccess();
    }, [router]);

    async function reviewOffer(
        offerId: string,
        decision: "approved" | "rejected",
    ) {
        setActiveOfferId(offerId);
        setErrorMessage("");

        const supabase = createClient();

        const { error } = await supabase.rpc("review_offer", {
            offer_id: offerId,
            decision,
        });

        if (error) {
            setErrorMessage(error.message);
            setActiveOfferId("");
            return;
        }

        setOffers((currentOffers) =>
            currentOffers.filter((offer) => offer.id !== offerId),
        );

        setActiveOfferId("");
    }

    function getBusinessName(offer: Offer) {
        if (Array.isArray(offer.businesses)) {
            return offer.businesses[0]?.name ?? "Unknown business";
        }

        return offer.businesses?.name ?? "Unknown business";
    }

    return (
        <main className="min-h-screen bg-[#FFF8F0] px-6 py-10 text-[#17233B] sm:py-16">
            <div className="mx-auto max-w-5xl">
                <Link
                    href="/dashboard"
                    className="text-sm font-semibold text-[#FF593F]"
                >
                    ← Back to dashboard
                </Link>

                <header className="mt-8">
                    <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#FF593F]">
                        Administration
                    </p>

                    <h1 className="mt-3 text-4xl font-semibold tracking-tight">
                        Promotion approvals
                    </h1>

                    <p className="mt-3 text-[#17233B]/65">
                        Review promotions submitted by businesses.
                    </p>
                </header>

                {errorMessage && (
                    <div className="mt-8 rounded-2xl border border-red-200 bg-red-50 p-5 text-red-700">
                        {errorMessage}
                    </div>
                )}

                {isLoading ? (
                    <div className="mt-10 h-48 animate-pulse rounded-3xl bg-white" />
                ) : offers.length === 0 ? (
                    <section className="mt-10 rounded-3xl bg-white p-10 text-center shadow-sm">
                        <h2 className="text-2xl font-semibold">
                            No promotions need review
                        </h2>

                        <p className="mt-3 text-[#17233B]/65">
                            New pending promotions will appear here.
                        </p>
                    </section>
                ) : (
                    <section className="mt-10 space-y-6">
                        {offers.map((offer) => (
                            <article
                                key={offer.id}
                                className="rounded-3xl bg-white p-6 shadow-sm sm:p-8"
                            >
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                    <div>
                                        <p className="text-sm font-medium text-[#FF593F]">
                                            {getBusinessName(offer)}
                                        </p>

                                        <h2 className="mt-1 text-2xl font-semibold">
                                            {offer.title}
                                        </h2>

                                        <p className="mt-2 text-sm text-[#17233B]/55">
                                            {offer.category} · {offer.discount}
                                        </p>
                                    </div>

                                    <span className="w-fit rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
                                        Pending
                                    </span>
                                </div>

                                <p className="mt-5 leading-7 text-[#17233B]/65">
                                    {offer.description}
                                </p>

                                <div className="mt-5 space-y-2 text-sm text-[#17233B]/60">
                                    <p>{offer.availability}</p>

                                    <p>
                                        Expires{" "}
                                        {new Intl.DateTimeFormat("en-GB", {
                                            day: "numeric",
                                            month: "long",
                                            year: "numeric",
                                        }).format(new Date(offer.expires_at))}
                                    </p>

                                    <p>{offer.terms}</p>
                                </div>

                                <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                                    <button
                                        type="button"
                                        disabled={activeOfferId === offer.id}
                                        onClick={() => reviewOffer(offer.id, "approved")}
                                        className="rounded-xl bg-emerald-600 px-5 py-3 font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                        Approve
                                    </button>

                                    <button
                                        type="button"
                                        disabled={activeOfferId === offer.id}
                                        onClick={() => reviewOffer(offer.id, "rejected")}
                                        className="rounded-xl bg-red-600 px-5 py-3 font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                        Reject
                                    </button>
                                </div>
                            </article>
                        ))}
                    </section>
                )}
            </div>
        </main>
    );
}