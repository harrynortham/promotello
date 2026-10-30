import Link from "next/link";
import { connection } from "next/server";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { businessHasPro } from "@/lib/billing";
import { createClient } from "@/utils/supabase/server";
import { Skeleton } from "@/components/ui/skeleton";

import { PeriodSummary, type BusinessAnalytics } from "@/components/business-period-summary";

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
        <div>
            <div>
                <div className="flex items-end justify-between">
                    <div>
                        <Skeleton className="h-5 w-40 rounded-md" />
                        <Skeleton className="mt-3 h-10 w-64 rounded-md" />
                        <Skeleton className="mt-3 h-5 w-96 max-w-full rounded-md" />
                    </div>

                    <Skeleton className="hidden h-9 w-40 rounded-md sm:block" />
                </div>

                <div className="mt-10 grid gap-5 md:grid-cols-3">
                    {[1, 2, 3].map((item) => (
                        <div
                            key={item}
                            className="rounded-xl border border-[#17233B]/10 bg-white p-6"
                        >
                            <Skeleton className="h-4 w-32 rounded-md" />
                            <Skeleton className="mt-4 h-12 w-20 rounded-md" />
                        </div>
                    ))}
                </div>

                <div className="mt-8 rounded-xl border border-[#17233B]/10 bg-white p-6">
                    <Skeleton className="h-6 w-48 rounded-md" />
                    <Skeleton className="mt-5 h-2 w-full rounded-full" />
                    <Skeleton className="mt-3 h-4 w-72 rounded-md" />
                </div>

                <div className="mt-8 rounded-xl border border-[#17233B]/10 bg-white p-6">
                    <Skeleton className="h-6 w-64 rounded-md" />

                    <div className="mt-6 space-y-5">
                        {[1, 2, 3].map((item) => (
                            <div key={item}>
                                <div className="flex items-center justify-between">
                                    <Skeleton className="h-5 w-48 rounded-md" />
                                    <Skeleton className="h-5 w-20 rounded-md" />
                                </div>

                                <Skeleton className="mt-4 h-2 w-full rounded-full" />
                                <Skeleton className="mt-3 h-4 w-80 max-w-full rounded-md" />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

function statusBadgeClass(status: string) {
    if (status === "approved") {
        return "border-emerald-200 bg-emerald-100 text-emerald-800";
    }

    if (status === "rejected") {
        return "border-red-200 bg-red-100 text-red-800";
    }

    if (status === "suspended") {
        return "border-slate-200 bg-slate-100 text-slate-700";
    }

    return "border-amber-200 bg-amber-100 text-amber-800";
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

    const { data: analytics, error: analyticsError } = await supabase.rpc("business_analytics", {
        requested_business_id: businessId,
        days: 30,
    });

    const [{ data: followerCount }, hasPro] = await Promise.all([
        supabase.rpc("business_follower_count", { requested_business_id: businessId }),
        businessHasPro(supabase, businessId).catch(() => false),
    ]);

    if (analyticsError) {
        console.error("Analytics: failed to load summary", analyticsError);
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
        (redemption) => redemption.used_at !== null,
    ).length;

    const unusedRedemptions = totalRedemptions - usedRedemptions;

    const usageRate =
        totalRedemptions > 0
            ? Math.round((usedRedemptions / totalRedemptions) * 100)
            : 0;

    const offerStats = offers.map((offer) => {
        const offerRedemptions = redemptions.filter(
            (redemption) => redemption.offer_id === offer.id,
        );

        const usedCount = offerRedemptions.filter(
            (redemption) => redemption.used_at !== null,
        ).length;

        const remaining =
            offer.max_redemptions === null
                ? null
                : Math.max(
                    offer.max_redemptions - offer.redemption_count,
                    0,
                );

        const offerUsageRate =
            offer.max_redemptions && offer.max_redemptions > 0
                ? Math.min(
                    Math.round(
                        (offer.redemption_count / offer.max_redemptions) * 100,
                    ),
                    100,
                )
                : 0;

        return {
            ...offer,
            totalRedemptions: offerRedemptions.length,
            usedCount,
            remaining,
            offerUsageRate,
        };
    });

    return (
        <div className="text-[#17233B]">
            <div>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#FF593F]">
                            Business analytics
                        </p>

                        <h1 className="mt-3 text-4xl font-semibold tracking-tight">
                            {business.name}
                        </h1>

                        <p className="mt-3 text-[#17233B]/65">
                            See the customers your offers bring in.
                        </p>
                    </div>

                </div>

                {analytics && <PeriodSummary analytics={analytics as BusinessAnalytics} />}

                <h2 className="mt-12 text-xl font-semibold">All time</h2>

                <section className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                    <Card className="border-[#17233B]/10">
                        <CardHeader>
                            <CardTitle className="text-sm font-medium text-[#17233B]/70">
                                Active offers
                            </CardTitle>
                        </CardHeader>

                        <CardContent>
                            <p className="text-4xl font-semibold">
                                {activeOffers ?? 0}
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="border-[#17233B]/10">
                        <CardHeader>
                            <CardTitle className="text-sm font-medium text-[#17233B]/70">
                                Total claims
                            </CardTitle>
                        </CardHeader>

                        <CardContent>
                            <p className="text-4xl font-semibold">
                                {totalRedemptions}
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="border-[#17233B]/10">
                        <CardHeader>
                            <CardTitle className="text-sm font-medium text-[#17233B]/70">
                                Used claims
                            </CardTitle>
                        </CardHeader>

                        <CardContent>
                            <p className="text-4xl font-semibold">
                                {usedRedemptions}
                            </p>

                            <p className="mt-2 text-sm text-[#17233B]/70">
                                {unusedRedemptions} awaiting use
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="border-[#17233B]/10">
                        <CardHeader>
                            <CardTitle className="text-sm font-medium text-[#17233B]/70">
                                Followers
                            </CardTitle>
                        </CardHeader>

                        <CardContent>
                            <p className="text-4xl font-semibold">
                                {followerCount ?? 0}
                            </p>

                            <p className="mt-2 text-sm text-[#17233B]/70">
                                {hasPro ? (
                                    "Emailed when a new offer goes live"
                                ) : (
                                    <Link href={`/business/${businessId}/billing`} className="font-medium text-[#FF593F] hover:underline">
                                        Email them new offers on Pro
                                    </Link>
                                )}
                            </p>
                        </CardContent>
                    </Card>
                </section>

                <Card className="mt-8 border-[#17233B]/10">
                    <CardHeader>
                        <CardTitle>Redemption completion</CardTitle>
                    </CardHeader>

                    <CardContent>
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-[#17233B]/70">
                                Used claims
                            </span>

                            <span className="font-semibold">
                                {usageRate}%
                            </span>
                        </div>

                        <Progress value={usageRate} className="mt-3 h-2" />

                        <p className="mt-3 text-sm text-[#17233B]/70">
                            {usedRedemptions} of {totalRedemptions} claims have been
                            marked as used.
                        </p>
                    </CardContent>
                </Card>

                <Card className="mt-8 border-[#17233B]/10">
                    <CardHeader>
                        <p className="text-sm font-medium text-[#FF593F]">
                            Offer performance
                        </p>

                        <CardTitle>Your offers</CardTitle>
                    </CardHeader>

                    <CardContent>
                        {offerStats.length === 0 ? (
                            <Alert>
                                <AlertTitle>No offer data yet</AlertTitle>

                                <AlertDescription>
                                    Create an offer to start tracking its performance.
                                </AlertDescription>
                            </Alert>
                        ) : (
                            <div className="space-y-5">
                                {offerStats.map((offer) => (
                                    <div key={offer.id}>
                                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                            <div>
                                                <h3 className="font-semibold">
                                                    {offer.title}
                                                </h3>

                                                <Badge
                                                    variant="outline"
                                                    className={`mt-2 capitalize ${statusBadgeClass(
                                                        offer.approval_status,
                                                    )}`}
                                                >
                                                    {offer.approval_status}
                                                </Badge>
                                            </div>

                                            <p className="font-semibold text-[#FF593F]">
                                                {offer.totalRedemptions}{" "}
                                                {offer.totalRedemptions === 1
                                                    ? "claim"
                                                    : "claims"}
                                            </p>
                                        </div>

                                        <div className="mt-4 grid gap-4 text-sm sm:grid-cols-3">
                                            <div>
                                                <p className="text-[#17233B]/70">Used</p>
                                                <p className="mt-1 font-semibold">
                                                    {offer.usedCount}
                                                </p>
                                            </div>

                                            <div>
                                                <p className="text-[#17233B]/70">
                                                    Awaiting use
                                                </p>
                                                <p className="mt-1 font-semibold">
                                                    {offer.totalRedemptions - offer.usedCount}
                                                </p>
                                            </div>

                                            <div>
                                                <p className="text-[#17233B]/70">
                                                    Remaining
                                                </p>
                                                <p className="mt-1 font-semibold">
                                                    {offer.remaining === null
                                                        ? "Unlimited"
                                                        : offer.remaining}
                                                </p>
                                            </div>
                                        </div>

                                        {offer.max_redemptions !== null && (
                                            <div className="mt-4">
                                                <div className="flex justify-between text-xs text-[#17233B]/70">
                                                    <span>Usage limit</span>
                                                    <span>
                                                        {offer.redemption_count} of{" "}
                                                        {offer.max_redemptions}
                                                    </span>
                                                </div>

                                                <Progress
                                                    value={offer.offerUsageRate}
                                                    className="mt-2 h-2"
                                                />
                                            </div>
                                        )}

                                        <Separator className="mt-5" />
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card className="mt-8 border-[#17233B]/10">
                    <CardHeader>
                        <CardTitle>Quick actions</CardTitle>
                    </CardHeader>

                    <CardContent className="flex flex-wrap gap-3">
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
                            Create offer
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
                                <Link href={`/business/${businessId}/offers`} />
                            }
                            nativeButton={false}
                            variant="outline"
                            size="sm"
                        >
                            Manage offers
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </div>
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