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

async function AnalyticsContent({
    params,
}: AnalyticsPageProps) {
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

    if (
        !membership ||
        !["owner", "admin"].includes(membership.role)
    ) {
        redirect(`/dashboard/${businessId}/offers`);
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
        .select("id, title")
        .eq("business_id", businessId);

    const offerIds = (offerRows ?? []).map((offer) => offer.id);

    let totalRedemptions = 0;
    let usedRedemptions = 0;

    if (offerIds.length > 0) {
        const { data: redemptions } = await supabase
            .from("offer_redemptions")
            .select("id, used_at")
            .in("offer_id", offerIds);

        totalRedemptions = redemptions?.length ?? 0;
        usedRedemptions =
            redemptions?.filter((redemption) => redemption.used_at).length ?? 0;
    }

    const unusedRedemptions = totalRedemptions - usedRedemptions;

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
                            Understand how your offers are performing.
                        </p>
                    </div>

                    <Button
                        render={
                            <Link href={`/dashboard`} />
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
                            Active offers
                        </p>

                        <p className="mt-3 text-4xl font-semibold">
                            {activeOffers ?? 0}
                        </p>

                        <p className="mt-2 text-sm text-[#17233B]/55">
                            Approved promotions
                        </p>
                    </article>

                    <article className="rounded-3xl bg-white p-7 shadow-sm">
                        <p className="text-sm text-[#17233B]/60">
                            Total redemptions
                        </p>

                        <p className="mt-3 text-4xl font-semibold">
                            {totalRedemptions}
                        </p>

                        <p className="mt-2 text-sm text-[#17233B]/55">
                            Customer claims
                        </p>
                    </article>

                    <article className="rounded-3xl bg-white p-7 shadow-sm">
                        <p className="text-sm text-[#17233B]/60">
                            Used redemptions
                        </p>

                        <p className="mt-3 text-4xl font-semibold">
                            {usedRedemptions}
                        </p>

                        <p className="mt-2 text-sm text-[#17233B]/55">
                            Offers accepted in store
                        </p>
                    </article>
                </section>

                <section className="mt-6 grid gap-6 md:grid-cols-2">
                    <article className="rounded-3xl bg-white p-7 shadow-sm">
                        <h2 className="text-xl font-semibold">
                            Redemption activity
                        </h2>

                        <div className="mt-6 space-y-4">
                            <div className="flex items-center justify-between rounded-2xl bg-[#FFF8F0] px-4 py-3">
                                <span className="text-sm text-[#17233B]/65">
                                    Awaiting use
                                </span>

                                <span className="font-semibold">
                                    {unusedRedemptions}
                                </span>
                            </div>

                            <div className="flex items-center justify-between rounded-2xl bg-[#FFF8F0] px-4 py-3">
                                <span className="text-sm text-[#17233B]/65">
                                    Marked as used
                                </span>

                                <span className="font-semibold">
                                    {usedRedemptions}
                                </span>
                            </div>
                        </div>
                    </article>

                    <article className="rounded-3xl bg-white p-7 shadow-sm">
                        <h2 className="text-xl font-semibold">
                            Quick actions
                        </h2>

                        <div className="mt-6 flex flex-wrap gap-3">
                            <Button
                                render={
                                    <Link
                                        href={`/dashboard/${businessId}/offers/new`}
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
                                        href={`/dashboard/${businessId}/redemptions`}
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
                                    <Link href={`/dashboard/${businessId}/offers`} />
                                }
                                nativeButton={false}
                                variant="outline"
                                size="sm"
                            >
                                Manage promotions
                            </Button>
                        </div>
                    </article>
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