import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { notFound } from "next/navigation";

import { BusinessOnboardingChecklist } from "@/components/business-onboarding-checklist";
import { BusinessRecentRedemptions } from "@/components/business-recent-redemptions";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { createClient } from "@/utils/supabase/server";

type PageProps = {
    params: Promise<{
        businessId: string;
    }>;
};

type OfferSummary = {
    id: string;
    title: string;
    approval_status: string;
    max_redemptions: number | null;
    redemption_count: number;
};

type RecentRedemption = {
    id: string;
    redemption_code: string;
    redeemed_at: string | null;
    used_at: string | null;
    offers:
    | {
        title: string;
        discount: string;
    }
    | {
        title: string;
        discount: string;
    }[]
    | null;
};

function LoadingState() {
    return (
        <main className="space-y-8">
            <div>
                <Skeleton className="h-5 w-40" />
                <Skeleton className="mt-3 h-10 w-72" />
                <Skeleton className="mt-3 h-5 w-96 max-w-full" />
            </div>

            <Skeleton className="h-64 rounded-3xl" />

            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                {[1, 2, 3, 4].map((item) => (
                    <Skeleton key={item} className="h-32 rounded-2xl" />
                ))}
            </div>

            <Skeleton className="h-64 rounded-3xl" />
        </main>
    );
}

function statusClass(status: string) {
    if (status === "approved") {
        return "border-emerald-200 bg-emerald-100 text-emerald-800";
    }

    if (status === "rejected") {
        return "border-red-200 bg-red-100 text-red-800";
    }

    return "border-amber-200 bg-amber-100 text-amber-800";
}

async function BusinessOverviewContent({ params }: PageProps) {
    await connection();

    const { businessId } = await params;
    const supabase = await createClient();

    const { data: business } = await supabase
        .from("businesses")
        .select(
            `
                id,
                name,
                category,
                description,
                logo_url,
                website_url,
                contact_email,
                approval_status
            `,
        )
        .eq("id", businessId)
        .single();

    if (!business) {
        notFound();
    }

    const [
        { data: offerRows },
        { count: redemptionCount },
        { data: locations },
        { data: hours },
        { data: notificationSettings },
        { count: memberCount },
        { data: recentRedemptionRows },
    ] = await Promise.all([
        supabase
            .from("offers")
            .select(
                "id, title, approval_status, max_redemptions, redemption_count",
            )
            .eq("business_id", businessId)
            .order("redemption_count", { ascending: false }),

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
            .eq("offers.business_id", businessId),

        supabase
            .from("business_locations")
            .select("id")
            .eq("business_id", businessId),

        supabase
            .from("business_hours")
            .select("day_of_week")
            .eq("business_id", businessId),

        supabase
            .from("business_notification_settings")
            .select("business_id")
            .eq("business_id", businessId)
            .maybeSingle(),

        supabase
            .from("business_members")
            .select("id", { count: "exact", head: true })
            .eq("business_id", businessId),

        supabase
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
            .eq("offers.business_id", businessId)
            .order("redeemed_at", { ascending: false })
            .limit(5),
    ]);

    const offers = (offerRows ?? []) as OfferSummary[];

    const recentRedemptions =
        (recentRedemptionRows ?? []) as RecentRedemption[];

    const approvedOffers = offers.filter(
        (offer) => offer.approval_status === "approved",
    );

    const lowInventoryOffers = approvedOffers.filter((offer) => {
        if (offer.max_redemptions === null) {
            return false;
        }

        const remaining =
            offer.max_redemptions - offer.redemption_count;

        return remaining <= 10 && remaining > 0;
    });

    const totalClaims = offers.reduce(
        (total, offer) => total + offer.redemption_count,
        0,
    );

    const checklist = [
        {
            label: "Business approved",
            description:
                "Your business can appear publicly once it has been approved.",
            complete: business.approval_status === "approved",
            href: `/business/${businessId}/edit`,
        },
        {
            label: "Add a business logo",
            description: "Help customers recognise your business.",
            complete: Boolean(business.logo_url),
            href: `/business/${businessId}/edit`,
        },
        {
            label: "Complete your business description",
            description: "Tell customers what makes your business special.",
            complete: Boolean(business.description?.trim()),
            href: `/business/${businessId}/edit`,
        },
        {
            label: "Add your location",
            description: "Show customers where they can visit you.",
            complete: Boolean(locations?.length),
            href: `/business/${businessId}/edit`,
        },
        {
            label: "Set opening hours",
            description: "Let customers know when you are available.",
            complete: Boolean(hours?.length),
            href: `/business/${businessId}/edit`,
        },
        {
            label: "Create your first promotion",
            description: "Publish your first offer for customers.",
            complete: offers.length > 0,
            href: `/business/${businessId}/offers/new`,
        },
        {
            label: "Get your first promotion approved",
            description:
                "Approved promotions become visible to customers.",
            complete: approvedOffers.length > 0,
            href: `/business/${businessId}/offers`,
        },
        {
            label: "Configure notifications",
            description: "Choose which business emails you receive.",
            complete: Boolean(notificationSettings),
            href: `/business/${businessId}/settings/notifications`,
        },
        {
            label: "Invite your team",
            description: "Give staff access to manage the business.",
            complete: Boolean(memberCount && memberCount > 1),
            href: `/business/${businessId}/team`,
        },
    ];

    return (
        <main className="space-y-8">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <Badge
                        variant="outline"
                        className="border-[#FF593F]/30 bg-[#FF593F]/10 text-[#FF593F]"
                    >
                        Business overview
                    </Badge>

                    <h1 className="mt-3 text-4xl font-semibold tracking-tight">
                        {business.name}
                    </h1>

                    <p className="mt-3 max-w-2xl text-[#17233B]/65">
                        Monitor your business activity and manage everything
                        from one place.
                    </p>
                </div>

                <Button
                    render={
                        <Link href={`/business/${businessId}/offers/new`} />
                    }
                    nativeButton={false}
                    size="sm"
                >
                    Create promotion
                </Button>
            </div>

            {business.approval_status !== "approved" && (
                <Alert className="border-amber-200 bg-amber-50 text-amber-800">
                    <AlertTitle>
                        Business approval: {business.approval_status}
                    </AlertTitle>

                    <AlertDescription>
                        Your business must be approved before promotions appear
                        publicly.
                    </AlertDescription>
                </Alert>
            )}

            <BusinessOnboardingChecklist
                items={checklist.map((item, index) => ({
                    id: `${businessId}-checklist-${index}`,
                    label: item.label,
                    description: item.description,
                    completed: item.complete,
                    href: item.href,
                }))}
            />

            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm font-medium text-[#17233B]/60">
                            Total promotions
                        </CardTitle>
                    </CardHeader>

                    <CardContent>
                        <p className="text-4xl font-semibold">
                            {offers.length}
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm font-medium text-[#17233B]/60">
                            Approved promotions
                        </CardTitle>
                    </CardHeader>

                    <CardContent>
                        <p className="text-4xl font-semibold">
                            {approvedOffers.length}
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm font-medium text-[#17233B]/60">
                            Total claims
                        </CardTitle>
                    </CardHeader>

                    <CardContent>
                        <p className="text-4xl font-semibold">
                            {totalClaims}
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm font-medium text-[#17233B]/60">
                            Redemptions
                        </CardTitle>
                    </CardHeader>

                    <CardContent>
                        <p className="text-4xl font-semibold">
                            {redemptionCount ?? 0}
                        </p>
                    </CardContent>
                </Card>
            </div>

            {lowInventoryOffers.length > 0 && (
                <Alert className="border-orange-200 bg-orange-50 text-orange-800">
                    <AlertTitle>
                        Promotions nearing their limits
                    </AlertTitle>

                    <AlertDescription>
                        {lowInventoryOffers.length} promotion
                        {lowInventoryOffers.length === 1 ? "" : "s"} has
                        limited redemptions remaining.
                    </AlertDescription>
                </Alert>
            )}

            <Card>
                <CardHeader>
                    <CardTitle>Promotion performance</CardTitle>
                </CardHeader>

                <CardContent>
                    {offers.length === 0 ? (
                        <Alert>
                            <AlertTitle>No promotions yet</AlertTitle>

                            <AlertDescription>
                                Create your first promotion to start reaching
                                customers.
                            </AlertDescription>

                            <Button
                                render={
                                    <Link
                                        href={`/business/${businessId}/offers/new`}
                                    />
                                }
                                nativeButton={false}
                                size="sm"
                                className="mt-5"
                            >
                                Create promotion
                            </Button>
                        </Alert>
                    ) : (
                        <div className="space-y-5">
                            {offers.slice(0, 5).map((offer) => {
                                const usage =
                                    offer.max_redemptions &&
                                        offer.max_redemptions > 0
                                        ? Math.min(
                                            Math.round(
                                                (offer.redemption_count /
                                                    offer.max_redemptions) *
                                                100,
                                            ),
                                            100,
                                        )
                                        : 0;

                                return (
                                    <div key={offer.id}>
                                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                            <div>
                                                <h3 className="font-semibold">
                                                    {offer.title}
                                                </h3>

                                                <Badge
                                                    variant="outline"
                                                    className={`mt-2 capitalize ${statusClass(
                                                        offer.approval_status,
                                                    )}`}
                                                >
                                                    {offer.approval_status}
                                                </Badge>
                                            </div>

                                            <p className="text-sm font-semibold text-[#FF593F]">
                                                {offer.redemption_count} claimed
                                            </p>
                                        </div>

                                        {offer.max_redemptions !== null && (
                                            <div className="mt-4">
                                                <div className="flex justify-between text-xs text-[#17233B]/55">
                                                    <span>Usage limit</span>

                                                    <span>
                                                        {offer.redemption_count}{" "}
                                                        of{" "}
                                                        {offer.max_redemptions}
                                                    </span>
                                                </div>

                                                <Progress
                                                    value={usage}
                                                    className="mt-2 h-2"
                                                />
                                            </div>
                                        )}

                                        <Separator className="mt-5" />
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </CardContent>
            </Card>

            <BusinessRecentRedemptions
                businessId={businessId}
                redemptions={recentRedemptions.map((redemption) => {
                    const offer = Array.isArray(redemption.offers)
                        ? redemption.offers[0]
                        : redemption.offers;

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
                    };
                })}
            />

            <Card>
                <CardHeader>
                    <CardTitle>Quick actions</CardTitle>
                </CardHeader>

                <CardContent className="flex flex-wrap gap-3">
                    <Button
                        render={
                            <Link href={`/business/${businessId}/offers`} />
                        }
                        nativeButton={false}
                        variant="outline"
                        size="sm"
                    >
                        Manage promotions
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
                                href={`/business/${businessId}/analytics`}
                            />
                        }
                        nativeButton={false}
                        variant="outline"
                        size="sm"
                    >
                        View analytics
                    </Button>
                </CardContent>
            </Card>
        </main>
    );
}

export default function BusinessOverviewPage({ params }: PageProps) {
    return (
        <Suspense fallback={<LoadingState />}>
            <BusinessOverviewContent params={params} />
        </Suspense>
    );
}