import Link from "next/link";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { BusinessNeedsAttention } from "@/components/business-needs-attention";
import { BusinessRecentActivity } from "@/components/business-recent-activity";
import { createClient } from "@/utils/supabase/server";

type Business = {
    id: string;
    name: string;
    approval_status: string;
};

type BusinessSummary = Business & {
    activeOffers: number;
    totalRedemptions: number;
    pendingOffers: number;
};

function LoadingState() {
    return (
        <main className="min-h-screen bg-[#FFF8F0] px-6 py-10">
            <div className="mx-auto max-w-7xl">
                <Skeleton className="h-12 w-72" />
                <Skeleton className="mt-4 h-6 w-96 max-w-full" />

                <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                    {[1, 2, 3, 4].map((item) => (
                        <Skeleton key={item} className="h-32 rounded-2xl" />
                    ))}
                </div>

                <Skeleton className="mt-10 h-32 rounded-3xl" />
                <Skeleton className="mt-10 h-8 w-56" />
            </div>
        </main>
    );
}

function statusVariant(status: string) {
    if (status === "approved") return "default" as const;
    if (status === "rejected" || status === "suspended") {
        return "destructive" as const;
    }

    return "secondary" as const;
}

async function BusinessDashboardContent() {
    await connection();

    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login");
    }

    const { data: memberships, error } = await supabase
        .from("business_members")
        .select(
            `
                role,
                businesses (
                    id,
                    name,
                    approval_status
                )
            `,
        )
        .eq("user_id", user.id);

    if (error) {
        return (
            <main className="min-h-screen bg-[#FFF8F0] px-6 py-10">
                <div className="mx-auto max-w-7xl">
                    <Alert variant="destructive">
                        <AlertTitle>
                            Unable to load your businesses
                        </AlertTitle>

                        <AlertDescription>
                            Please refresh the page and try again.
                        </AlertDescription>
                    </Alert>
                </div>
            </main>
        );
    }

    const businesses: Business[] =
        memberships
            ?.map((membership) => {
                const business = Array.isArray(membership.businesses)
                    ? membership.businesses[0]
                    : membership.businesses;

                return business;
            })
            .filter(
                (business): business is Business =>
                    Boolean(business?.id && business?.name),
            ) ?? [];

    const today = new Date().toISOString().slice(0, 10);

    const summaries: BusinessSummary[] = await Promise.all(
        businesses.map(async (business) => {
            const [
                { count: activeOffers },
                { count: totalRedemptions },
                { count: pendingOffers },
            ] = await Promise.all([
                supabase
                    .from("offers")
                    .select("id", { count: "exact", head: true })
                    .eq("business_id", business.id)
                    .eq("approval_status", "approved")
                    .gte("expires_at", today),

                supabase
                    .from("offer_redemptions")
                    .select(
                        `
                            id,
                            offers!inner (
                                business_id
                            )
                        `,
                        { count: "exact", head: true },
                    )
                    .eq("offers.business_id", business.id),

                supabase
                    .from("offers")
                    .select("id", { count: "exact", head: true })
                    .eq("business_id", business.id)
                    .eq("approval_status", "pending"),
            ]);

            return {
                ...business,
                activeOffers: activeOffers ?? 0,
                totalRedemptions: totalRedemptions ?? 0,
                pendingOffers: pendingOffers ?? 0,
            };
        }),
    );

    const businessIds = businesses.map((business) => business.id);

    const { data: recentRedemptions } = businessIds.length
        ? await supabase
            .from("offer_redemptions")
            .select(
                `
                      id,
                      redemption_code,
                      redeemed_at,
                      used_at,
                      offers!inner (
                          title,
                          discount,
                          business_id
                      )
                  `,
            )
            .in("offers.business_id", businessIds)
            .order("redeemed_at", { ascending: false })
            .limit(5)
        : { data: [] };

    const totalActiveOffers = summaries.reduce(
        (total, business) => total + business.activeOffers,
        0,
    );

    const totalRedemptions = summaries.reduce(
        (total, business) => total + business.totalRedemptions,
        0,
    );

    const totalPendingOffers = summaries.reduce(
        (total, business) => total + business.pendingOffers,
        0,
    );

    const pendingBusinesses = summaries.filter(
        (business) => business.approval_status === "pending",
    ).length;

    const attentionItems = summaries.flatMap((business) => {
        const items: {
            id: string;
            title: string;
            description: string;
            href: string;
        }[] = [];

        if (business.approval_status === "pending") {
            items.push({
                id: `${business.id}-approval`,
                title: `${business.name} is awaiting approval`,
                description:
                    "Your business must be approved before its promotions appear publicly.",
                href: `/business/${business.id}/edit`,
            });
        }

        if (business.approval_status === "rejected") {
            items.push({
                id: `${business.id}-rejected`,
                title: `${business.name} needs an update`,
                description:
                    "Review your business information and make the requested changes.",
                href: `/business/${business.id}/edit`,
            });
        }

        if (business.pendingOffers > 0) {
            items.push({
                id: `${business.id}-pending-offers`,
                title: `${business.pendingOffers} promotion${business.pendingOffers === 1 ? "" : "s"
                    } awaiting approval`,
                description:
                    "Review your pending promotions while they are being assessed.",
                href: `/business/${business.id}/offers`,
            });
        }

        return items;
    });

    const formattedRedemptions = (recentRedemptions ?? []).map(
        (redemption) => {
            const offer = Array.isArray(redemption.offers)
                ? redemption.offers[0]
                : redemption.offers;

            const business = businesses.find(
                (item) => item.id === offer?.business_id,
            );

            return {
                id: redemption.id,
                redemption_code: redemption.redemption_code,
                redeemed_at: redemption.redeemed_at,
                used_at: redemption.used_at,
                offer: offer
                    ? {
                        title: offer.title,
                        discount: offer.discount,
                    }
                    : null,
                business: business
                    ? {
                        id: business.id,
                        name: business.name,
                    }
                    : null,
            };
        },
    );

    const firstName =
        user.user_metadata?.full_name?.split(" ")[0] ??
        user.email?.split("@")[0] ??
        "there";

    return (
        <main className="min-h-screen bg-[#FFF8F0] px-6 py-10 text-[#17233B]">
            <div className="mx-auto max-w-7xl">
                <section className="rounded-3xl bg-[#17233B] px-6 py-10 text-white shadow-sm sm:px-10">
                    <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#FF8F7D]">
                        Business dashboard
                    </p>

                    <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
                        Good to see you, {firstName}.
                    </h1>

                    <p className="mt-4 max-w-2xl leading-7 text-white/70">
                        Manage your businesses, publish promotions, and keep
                        track of customer activity from one place.
                    </p>

                    <div className="mt-7 flex flex-wrap gap-3">
                        <Button
                            render={<Link href="/onboarding" />}
                            nativeButton={false}
                            className="bg-[#FF593F] text-[#17233B] hover:bg-[#ff735e]"
                        >
                            Add a business
                        </Button>

                        {summaries[0] && (
                            <Button
                                render={
                                    <Link
                                        href={`/business/${summaries[0].id}`}
                                    />
                                }
                                nativeButton={false}
                                variant="outline"
                                className="border-white/30 bg-transparent text-white hover:bg-white/10 hover:text-white"
                            >
                                Open business overview
                            </Button>
                        )}
                    </div>
                </section>

                <section className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                    <Card>
                        <CardHeader className="pb-3">
                            <CardDescription>Businesses</CardDescription>
                            <CardTitle className="text-3xl">
                                {summaries.length}
                            </CardTitle>
                        </CardHeader>

                        <CardContent>
                            <p className="text-sm text-[#17233B]/60">
                                Businesses you manage
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-3">
                            <CardDescription>
                                Active promotions
                            </CardDescription>
                            <CardTitle className="text-3xl">
                                {totalActiveOffers}
                            </CardTitle>
                        </CardHeader>

                        <CardContent>
                            <p className="text-sm text-[#17233B]/60">
                                Currently visible promotions
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-3">
                            <CardDescription>Redemptions</CardDescription>
                            <CardTitle className="text-3xl">
                                {totalRedemptions}
                            </CardTitle>
                        </CardHeader>

                        <CardContent>
                            <p className="text-sm text-[#17233B]/60">
                                Customer redemptions to date
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-3">
                            <CardDescription>Needs attention</CardDescription>
                            <CardTitle className="text-3xl">
                                {pendingBusinesses + totalPendingOffers}
                            </CardTitle>
                        </CardHeader>

                        <CardContent>
                            <p className="text-sm text-[#17233B]/60">
                                Pending businesses or promotions
                            </p>
                        </CardContent>
                    </Card>
                </section>

                <BusinessNeedsAttention items={attentionItems} />

                <div className="mt-12 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#FF593F]">
                            Your businesses
                        </p>

                        <h2 className="mt-2 text-2xl font-semibold tracking-tight">
                            Manage your businesses
                        </h2>
                    </div>

                    <Button
                        render={<Link href="/onboarding" />}
                        nativeButton={false}
                        variant="outline"
                    >
                        Add another business
                    </Button>
                </div>

                {summaries.length === 0 ? (
                    <Card className="mt-6 border-dashed">
                        <CardHeader>
                            <CardTitle>Create your first business</CardTitle>

                            <CardDescription>
                                Add your business profile to start publishing
                                promotions on Promotello.
                            </CardDescription>
                        </CardHeader>

                        <CardContent>
                            <Button
                                render={<Link href="/onboarding" />}
                                nativeButton={false}
                            >
                                Create business
                            </Button>
                        </CardContent>
                    </Card>
                ) : (
                    <section className="mt-6 grid gap-6 lg:grid-cols-2">
                        {summaries.map((business) => (
                            <Card
                                key={business.id}
                                className="overflow-hidden rounded-3xl"
                            >
                                <CardHeader>
                                    <div className="flex items-start justify-between gap-4">
                                        <div>
                                            <CardTitle className="text-2xl">
                                                {business.name}
                                            </CardTitle>

                                            <CardDescription className="mt-2">
                                                Business management overview
                                            </CardDescription>
                                        </div>

                                        <Badge
                                            variant={statusVariant(
                                                business.approval_status,
                                            )}
                                            className="capitalize"
                                        >
                                            {business.approval_status}
                                        </Badge>
                                    </div>
                                </CardHeader>

                                <CardContent>
                                    {business.approval_status === "pending" && (
                                        <Alert className="mb-6">
                                            <AlertTitle>
                                                Awaiting approval
                                            </AlertTitle>

                                            <AlertDescription>
                                                Your business must be approved
                                                before its promotions appear
                                                publicly.
                                            </AlertDescription>
                                        </Alert>
                                    )}

                                    <div className="grid grid-cols-3 gap-3">
                                        <div className="rounded-2xl bg-[#FFF8F0] p-4">
                                            <p className="text-2xl font-semibold">
                                                {business.activeOffers}
                                            </p>

                                            <p className="mt-1 text-xs text-[#17233B]/60">
                                                Active promotions
                                            </p>
                                        </div>

                                        <div className="rounded-2xl bg-[#FFF8F0] p-4">
                                            <p className="text-2xl font-semibold">
                                                {business.totalRedemptions}
                                            </p>

                                            <p className="mt-1 text-xs text-[#17233B]/60">
                                                Redemptions
                                            </p>
                                        </div>

                                        <div className="rounded-2xl bg-[#FFF8F0] p-4">
                                            <p className="text-2xl font-semibold">
                                                {business.pendingOffers}
                                            </p>

                                            <p className="mt-1 text-xs text-[#17233B]/60">
                                                Pending review
                                            </p>
                                        </div>
                                    </div>

                                    <Separator className="my-6" />

                                    <div className="flex flex-wrap gap-3">
                                        <Button
                                            render={
                                                <Link
                                                    href={`/business/${business.id}`}
                                                />
                                            }
                                            nativeButton={false}
                                        >
                                            Manage business
                                        </Button>

                                        <Button
                                            render={
                                                <Link
                                                    href={`/business/${business.id}/offers`}
                                                />
                                            }
                                            nativeButton={false}
                                            variant="outline"
                                        >
                                            View promotions
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </section>
                )}

                <BusinessRecentActivity
                    redemptions={formattedRedemptions}
                />
            </div>
        </main>
    );
}

export default function BusinessDashboardPage() {
    return (
        <Suspense fallback={<LoadingState />}>
            <BusinessDashboardContent />
        </Suspense>
    );
}