import Link from "next/link";
import { connection } from "next/server";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";

import { Button } from "@/components/ui/button";
import { createClient } from "@/utils/supabase/server";

type PageProps = {
    params: Promise<{
        businessId: string;
    }>;
};

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
    max_redemptions: number | null;
    redemption_count: number;
};

type BusinessSummary = {
    id: string;
    name: string;
};

type Membership = {
    role: "owner" | "admin" | "member";
    businesses: BusinessSummary | BusinessSummary[] | null;
};

const statusStyles: Record<Offer["approval_status"], string> = {
    pending: "bg-amber-100 text-amber-800",
    approved: "bg-emerald-100 text-emerald-800",
    rejected: "bg-red-100 text-red-800",
    suspended: "bg-slate-100 text-slate-700",
};

function LoadingState() {
    return (
        <main className="min-h-screen bg-[#FFF8F0] px-6 py-16">
            <div className="mx-auto max-w-4xl">
                <div className="h-10 w-72 animate-pulse rounded bg-[#17233B]/10" />
                <div className="mt-8 h-48 animate-pulse rounded-3xl bg-white" />
            </div>
        </main>
    );
}

async function OffersContent({ params }: PageProps) {
    await connection();

    const { businessId } = await params;
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login");
    }

    const { data: membershipData } = await supabase
        .from("business_members")
        .select("role, businesses (id, name)")
        .eq("business_id", businessId)
        .eq("user_id", user.id)
        .single();

    if (!membershipData) {
        notFound();
    }

    const membership = membershipData as unknown as Membership;
    const canManageOffers =
        membership.role === "owner" || membership.role === "admin";

    const business = Array.isArray(membership.businesses)
        ? membership.businesses[0]
        : membership.businesses;

    const { data: offers, error } = await supabase
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
        max_redemptions,
        redemption_count
      `,
        )
        .eq("business_id", businessId)
        .order("created_at", { ascending: false });

    const typedOffers = (offers ?? []) as Offer[];

    return (
        <main className="min-h-screen bg-[#FFF8F0] px-6 py-10 text-[#17233B] sm:py-16">
            <div className="mx-auto max-w-4xl">
                <Button
                    render={<Link href="/business/dashboard" />}
                    nativeButton={false}
                    variant="outline"
                    size="sm"
                >
                    ← Back to dashboard
                </Button>

                <header className="mt-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#FF593F]">
                            Promotions
                        </p>

                        <h1 className="mt-3 text-4xl font-semibold tracking-tight">
                            {business?.name ?? "Business promotions"}
                        </h1>

                        <p className="mt-3 text-[#17233B]/65">
                            Review promotions submitted by this business.
                        </p>
                    </div>

                    {canManageOffers && (
                        <Button
                            render={
                                <Link href={`/business/${businessId}/offers/new`} />
                            }
                            nativeButton={false}
                            variant="default"
                            size="sm"
                        >
                            Create promotion
                        </Button>
                    )}
                </header>

                {error ? (
                    <div className="mt-10 rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">
                        We couldn’t load your promotions. Please refresh and try again.
                    </div>
                ) : typedOffers.length === 0 ? (
                    <section className="mt-10 rounded-3xl bg-white p-8 text-center shadow-sm sm:p-12">
                        <h2 className="text-2xl font-semibold">
                            No promotions yet
                        </h2>

                        <p className="mx-auto mt-3 max-w-md leading-7 text-[#17233B]/65">
                            {canManageOffers
                                ? "Create your first promotion and submit it for approval."
                                : "This business has not created any promotions yet."}
                        </p>

                        {canManageOffers && (
                            <Button
                                render={
                                    <Link href={`/business/${businessId}/offers/new`} />
                                }
                                nativeButton={false}
                                variant="default"
                                className="mt-7"
                            >
                                Create promotion
                            </Button>
                        )}
                    </section>
                ) : (
                    <section className="mt-10 space-y-5">
                        {typedOffers.map((offer) => {
                            const remainingRedemptions =
                                offer.max_redemptions === null
                                    ? null
                                    : Math.max(
                                        offer.max_redemptions - offer.redemption_count,
                                        0,
                                    );

                            const isFullyClaimed = remainingRedemptions === 0;

                            return (
                                <article
                                    key={offer.id}
                                    className="rounded-3xl bg-white p-6 shadow-sm sm:p-8"
                                >
                                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                                        <div>
                                            <p className="text-sm font-medium text-[#FF593F]">
                                                {offer.discount}
                                            </p>

                                            <h2 className="mt-1 text-2xl font-semibold">
                                                {offer.title}
                                            </h2>

                                            <p className="mt-2 text-sm text-[#17233B]/55">
                                                {offer.category}
                                            </p>
                                        </div>

                                        <span
                                            className={`w-fit rounded-full px-3 py-1 text-xs font-semibold capitalize ${statusStyles[offer.approval_status]
                                                }`}
                                        >
                                            {offer.approval_status}
                                        </span>
                                    </div>

                                    <p className="mt-5 leading-7 text-[#17233B]/65">
                                        {offer.description}
                                    </p>

                                    <div className="mt-6 grid gap-3 border-t border-[#17233B]/10 pt-5 text-sm text-[#17233B]/60 sm:grid-cols-2">
                                        <p>{offer.availability}</p>

                                        <p>
                                            Expires{" "}
                                            {new Intl.DateTimeFormat("en-GB", {
                                                day: "numeric",
                                                month: "long",
                                                year: "numeric",
                                            }).format(new Date(offer.expires_at))}
                                        </p>
                                    </div>

                                    <div className="mt-5 rounded-2xl bg-[#FFF8F0] p-4">
                                        <p className="text-sm font-semibold text-[#17233B]">
                                            {offer.max_redemptions === null
                                                ? "Unlimited redemptions"
                                                : isFullyClaimed
                                                    ? "Fully claimed"
                                                    : `${remainingRedemptions} redemption${remainingRedemptions === 1 ? "" : "s"
                                                    } remaining`}
                                        </p>

                                        {offer.max_redemptions !== null && (
                                            <p className="mt-1 text-xs text-[#17233B]/60">
                                                {offer.redemption_count} of{" "}
                                                {offer.max_redemptions} claimed
                                            </p>
                                        )}
                                    </div>

                                    {canManageOffers && (
                                        <Button
                                            render={
                                                <Link
                                                    href={`/business/${businessId}/offers/${offer.id}/edit`}
                                                />
                                            }
                                            nativeButton={false}
                                            variant="outline"
                                            size="sm"
                                            className="mt-6"
                                        >
                                            Edit promotion
                                        </Button>
                                    )}
                                </article>
                            );
                        })}
                    </section>
                )}
            </div>
        </main>
    );
}

export default function BusinessOffersPage({ params }: PageProps) {
    return (
        <Suspense fallback={<LoadingState />}>
            <OffersContent params={params} />
        </Suspense>
    );
}