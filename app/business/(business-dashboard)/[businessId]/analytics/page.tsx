import Link from "next/link";
import { connection } from "next/server";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";

import { Button } from "@/components/ui/button";
import { createClient } from "@/utils/supabase/server";

type AnalyticsPageProps = {
    params: Promise<{
        businessId: string;
    }>;
};

type OfferRow = {
    id: string;
    title: string;
    max_redemptions: number | null;
    redemption_count: number;
    approval_status: string;
};

type RedemptionRow = {
    offer_id: string;
    used_at: string | null;
};

function LoadingState() {
    return (
        <main className="min-h-screen bg-[#FFF8F0] px-6 py-10">
            <div className="mx-auto max-w-5xl">
                <div className="h-10 w-64 animate-pulse rounded bg-[#17233B]/10" />
                <div className="mt-8 grid gap-6 md:grid-cols-3">
                    {[1, 2, 3].map((item) => (
                        <div
                            key={item}
                            className="h-32 animate-pulse rounded-3xl bg-white"
                        />
                    ))}
                </div>
            </div>
        </main>
    );
}

async function AnalyticsContent({ params }: AnalyticsPageProps) {
    await connection();

    const { businessId } = await params;
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login");
    }

    const { data: membership } = await supabase
        .from("business_members")
        .select("role")
        .eq("business_id", businessId)
        .eq("user_id", user.id)
        .maybeSingle();

    if (!membership || !["owner", "admin"].includes(membership.role)) {
        redirect(`/business/${businessId}/offers`);
    }

    const { data: business } = await supabase
        .from("businesses")
        .select("id, name")
        .eq("id", businessId)
        .single();

    if (!business) {
        notFound();
    }

    const { count: activeOffers } = await supabase
        .from("offers")
        .select("id", { count: "exact", head: true })
        .eq("business_id", businessId)
        .eq("approval_status", "approved");

    const { data: offerRows } = await supabase
        .from("offers")
        .select(
            "id, title, max_redemptions, redemption_count, approval_status",
        )
        .eq("business_id", businessId)
        .order("redemption_count", { ascending: false });

    const offers = (offerRows ?? []) as OfferRow[];
    const offerIds = offers.map((offer) => offer.id);

    let redemptions: RedemptionRow[] = [];

    if (offerIds.length > 0) {
        const { data: redemptionRows } = await supabase
            .from("offer_redemptions")
            .select("offer_id, used_at")
            .in("offer_id", offerIds);

        redemptions = (redemptionRows ?? []) as RedemptionRow[];
    }

    const totalRedemptions = redemptions.length;

    const usedRedemptions = redemptions.filter(
        (redemption) => redemption.used_at,
    ).length;

    const unusedRedemptions = totalRedemptions - usedRedemptions;

    const offerStats = offers.map((offer) => {
        const offerRedemptions = redemptions.filter(
            (redemption) => redemption.offer_id === offer.id,
        );

        const usedCount = offerRedemptions.filter(
            (redemption) => redemption.used_at,
        ).length;

        const remaining =
            offer.max_redemptions === null
                ? null
                : Math.max(
                    offer.max_redemptions - offer.redemption_count,
                    0,
                );

        return {
            ...offer,
            totalRedemptions: offerRedemptions.length,
            usedCount,
            remaining,
        };
    });

    return (
        <main className="min-h-screen bg-[#FFF8F0] px-6 py-10 text-[#17233B] sm:py-16">
            <div className="mx-auto max-w-5xl">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#FF593F]">
                            Business analytics
                        </p>

                        <h1 className="mt-3 text-4xl font-semibold tracking-tight">
                            {business.name}
                        </h1>

                        <p className="mt-3 text-[#17233B]/65">
                            Understand how your promotions are performing.
                        </p>
                    </div>

                    <Button
                        render={
                            <Link href={`/business/dashboard`} />
                        }
                        nativeButton={false}
                        variant="outline"
                        size="sm"
                    >
                        ← Business dashboard
                    </Button>
                </div>

                <section className="mt-10 grid gap-6 md:grid-cols-3">
                    <article className="rounded-3xl bg-white p-7 shadow-sm">
                        <p className="text-sm text-[#17233B]/60">
                            Active promotions
                        </p>

                        <p className="mt-3 text-4xl font-semibold">
                            {activeOffers ?? 0}
                        </p>
                    </article>

                    <article className="rounded-3xl bg-white p-7 shadow-sm">
                        <p className="text-sm text-[#17233B]/60">
                            Total claims
                        </p>

                        <p className="mt-3 text-4xl font-semibold">
                            {totalRedemptions}
                        </p>
                    </article>

                    <article className="rounded-3xl bg-white p-7 shadow-sm">
                        <p className="text-sm text-[#17233B]/60">
                            Used claims
                        </p>

                        <p className="mt-3 text-4xl font-semibold">
                            {usedRedemptions}
                        </p>

                        <p className="mt-2 text-sm text-[#17233B]/55">
                            {unusedRedemptions} still awaiting use
                        </p>
                    </article>
                </section>

                <section className="mt-10 rounded-3xl bg-white p-7 shadow-sm sm:p-8">
                    <div>
                        <p className="text-sm font-medium text-[#FF593F]">
                            Promotion performance
                        </p>

                        <h2 className="mt-1 text-2xl font-semibold">
                            Your most popular promotions
                        </h2>
                    </div>

                    {offerStats.length === 0 ? (
                        <p className="mt-6 text-sm text-[#17233B]/60">
                            No promotion data is available yet.
                        </p>
                    ) : (
                        <div className="mt-6 space-y-4">
                            {offerStats.map((offer) => (
                                <div
                                    key={offer.id}
                                    className="rounded-2xl bg-[#FFF8F0] p-5"
                                >
                                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                        <div>
                                            <h3 className="font-semibold">
                                                {offer.title}
                                            </h3>

                                            <p className="mt-1 text-sm text-[#17233B]/60">
                                                {offer.approval_status}
                                            </p>
                                        </div>

                                        <p className="font-semibold text-[#FF593F]">
                                            {offer.totalRedemptions}{" "}
                                            {offer.totalRedemptions === 1
                                                ? "claim"
                                                : "claims"}
                                        </p>
                                    </div>

                                    <div className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
                                        <div>
                                            <p className="text-[#17233B]/55">
                                                Used
                                            </p>

                                            <p className="mt-1 font-semibold">
                                                {offer.usedCount}
                                            </p>
                                        </div>

                                        <div>
                                            <p className="text-[#17233B]/55">
                                                Awaiting use
                                            </p>

                                            <p className="mt-1 font-semibold">
                                                {offer.totalRedemptions - offer.usedCount}
                                            </p>
                                        </div>

                                        <div>
                                            <p className="text-[#17233B]/55">
                                                Remaining
                                            </p>

                                            <p className="mt-1 font-semibold">
                                                {offer.remaining === null
                                                    ? "Unlimited"
                                                    : offer.remaining}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </section>

                <section className="mt-6 rounded-3xl bg-white p-7 shadow-sm">
                    <h2 className="text-xl font-semibold">
                        Quick actions
                    </h2>

                    <div className="mt-6 flex flex-wrap gap-3">
                        <Button
                            render={
                                <Link
                                    href={`/business/${businessId}/offers/new`}
                                />
                            }
                            nativeButton={false}
                            variant="default"
                            size="sm"
                        >
                            Create promotion
                        </Button>

                        <Button
                            render={
                                <Link
                                    href={`/business/${businessId}/redemptions`}
                                />
                            }
                            nativeButton={false}
                            variant="outline"
                            size="sm"
                        >
                            View redemptions
                        </Button>

                        <Button
                            render={
                                <Link
                                    href={`/business/${businessId}/offers`}
                                />
                            }
                            nativeButton={false}
                            variant="outline"
                            size="sm"
                        >
                            Manage promotions
                        </Button>
                    </div>
                </section>
            </div>
        </main>
    );
}

export default function AnalyticsPage({
    params,
}: AnalyticsPageProps) {
    return (
        <Suspense fallback={<LoadingState />}>
            <AnalyticsContent params={params} />
        </Suspense>
    );
}