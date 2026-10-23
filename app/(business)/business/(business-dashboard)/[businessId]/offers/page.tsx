import { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { connection } from "next/server";
import { notFound, redirect } from "next/navigation";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
    FREE_LIVE_OFFER_LIMIT,
    businessHasPro,
    isLiveOffer,
} from "@/lib/billing";
import { createClient } from "@/utils/supabase/server";
import { Skeleton } from "@/components/ui/skeleton";

type PageProps = {
    params: Promise<{
        businessId: string;
    }>;
};

type OfferStatus = "pending" | "approved" | "rejected" | "suspended";

type Offer = {
    id: string;
    title: string;
    category: string;
    discount: string;
    description: string;
    availability: string;
    expires_at: string;
    terms: string;
    image_url: string | null;
    approval_status: OfferStatus;
    max_redemptions: number | null;
    redemption_count: number;
    plan_paused_at: string | null;
};

type BusinessSummary = {
    id: string;
    name: string;
};

type Membership = {
    role: "owner" | "admin" | "member";
    businesses: BusinessSummary | BusinessSummary[] | null;
};

const statusLabels: Record<OfferStatus, string> = {
    pending: "Pending approval",
    approved: "Approved",
    rejected: "Rejected",
    suspended: "Suspended",
};

const statusClasses: Record<OfferStatus, string> = {
    pending: "border-amber-200 bg-amber-100 text-amber-800",
    approved: "border-emerald-200 bg-emerald-100 text-emerald-800",
    rejected: "border-red-200 bg-red-100 text-red-800",
    suspended: "border-slate-200 bg-slate-100 text-slate-700",
};

function LoadingState() {
    return (
        <main className="min-h-screen bg-[#FFF8F0] px-6 py-16">
            <div className="mx-auto max-w-5xl">
                <Skeleton className="h-9 w-44 rounded-md" />

                <div className="mt-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <Skeleton className="h-5 w-32 rounded-md" />
                        <Skeleton className="mt-3 h-12 w-72 rounded-md" />
                        <Skeleton className="mt-3 h-5 w-96 max-w-full rounded-md" />
                    </div>

                    <Skeleton className="h-9 w-40 rounded-md" />
                </div>

                <div className="mt-10 space-y-5">
                    {[1, 2, 3].map((item) => (
                        <div
                            key={item}
                            className="overflow-hidden rounded-xl border border-[#17233B]/10 bg-white"
                        >
                            <Skeleton className="h-48 w-full rounded-none" />

                            <div className="space-y-5 p-6 sm:p-8">
                                <div className="flex items-start justify-between gap-4">
                                    <div>
                                        <Skeleton className="h-4 w-24 rounded-md" />
                                        <Skeleton className="mt-3 h-8 w-64 rounded-md" />
                                        <Skeleton className="mt-2 h-4 w-32 rounded-md" />
                                    </div>

                                    <Skeleton className="h-6 w-28 rounded-full" />
                                </div>

                                <Skeleton className="h-16 w-full rounded-md" />

                                <div className="rounded-xl bg-[#FFF8F0] p-4">
                                    <Skeleton className="h-5 w-56 rounded-md" />
                                    <Skeleton className="mt-3 h-2 w-full rounded-full" />
                                </div>

                                <div className="flex gap-3">
                                    <Skeleton className="h-9 w-32 rounded-md" />
                                    <Skeleton className="h-9 w-32 rounded-md" />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </main>
    );
}

function formatExpiry(date: string) {
    return new Intl.DateTimeFormat("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
    }).format(new Date(date));
}

function getUsagePercentage(offer: Offer) {
    if (
        offer.max_redemptions === null ||
        offer.max_redemptions <= 0
    ) {
        return 0;
    }

    return Math.min(
        Math.round(
            (offer.redemption_count / offer.max_redemptions) * 100,
        ),
        100,
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
        .maybeSingle();

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
        image_url,
        approval_status,
        max_redemptions,
        redemption_count,
        plan_paused_at
      `,
        )
        .eq("business_id", businessId)
        .order("created_at", { ascending: false });

    const typedOffers = (offers ?? []) as Offer[];
    const hasPro = await businessHasPro(supabase, businessId);
    const liveOfferCount = typedOffers.filter(isLiveOffer).length;
    const pausedOfferCount = typedOffers.filter(
        (offer) => offer.plan_paused_at !== null,
    ).length;

    return (
        <main className="min-h-screen bg-[#FFF8F0] px-6 py-10 text-[#17233B] sm:py-16">
            <div className="mx-auto max-w-5xl">
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
                            Manage promotions submitted by this business.
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

                {!hasPro && canManageOffers && (
                    <Alert className="mt-8 border-[#FF593F]/30 bg-white">
                        <AlertTitle>
                            Free plan · {liveOfferCount} of {FREE_LIVE_OFFER_LIMIT} live
                            offer used
                        </AlertTitle>

                        <AlertDescription>
                            <p>
                                {pausedOfferCount > 0
                                    ? `${pausedOfferCount} paused ${pausedOfferCount === 1 ? "offer is" : "offers are"} hidden from customers. Upgrade to Pro to show them again and create unlimited offers.`
                                    : "Upgrade to Pro for unlimited offers."}
                            </p>

                            <Button
                                render={<Link href={`/business/${businessId}/billing`} />}
                                nativeButton={false}
                                size="sm"
                                className="mt-3 bg-[#FF593F] text-white hover:bg-[#FF593F]/90"
                            >
                                Upgrade to Pro
                            </Button>
                        </AlertDescription>
                    </Alert>
                )}

                {error ? (
                    <Alert variant="destructive" className="mt-10">
                        <AlertTitle>Unable to load promotions</AlertTitle>

                        <AlertDescription>
                            We couldn’t load your promotions. Please refresh and try again.
                        </AlertDescription>
                    </Alert>
                ) : typedOffers.length === 0 ? (
                    <Card className="mt-10 border-[#17233B]/10 text-center">
                        <CardContent className="p-10 sm:p-14">
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
                                    size="sm"
                                    className="mt-7"
                                >
                                    Create promotion
                                </Button>
                            )}
                        </CardContent>
                    </Card>
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
                            const usagePercentage = getUsagePercentage(offer);

                            return (
                                <Card
                                    key={offer.id}
                                    className="overflow-hidden border-[#17233B]/10"
                                >
                                    {offer.image_url && (
                                        <div className="relative aspect-[3/1] w-full overflow-hidden bg-[#FFF8F0]">
                                            <Image
                                                src={offer.image_url}
                                                alt={offer.title}
                                                fill
                                                className="object-cover"
                                            />
                                        </div>
                                    )}

                                    <CardHeader>
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

                                            <div className="flex flex-wrap gap-2">
                                                <Badge
                                                    variant="outline"
                                                    className={`w-fit ${statusClasses[offer.approval_status]}`}
                                                >
                                                    {statusLabels[offer.approval_status]}
                                                </Badge>

                                                {offer.plan_paused_at && (
                                                    <Badge
                                                        variant="outline"
                                                        className="w-fit border-slate-200 bg-slate-100 text-slate-700"
                                                    >
                                                        Paused · Free plan limit
                                                    </Badge>
                                                )}
                                            </div>
                                        </div>
                                    </CardHeader>

                                    <CardContent>
                                        <p className="leading-7 text-[#17233B]/65">
                                            {offer.description}
                                        </p>

                                        <div className="mt-6 grid gap-3 border-t border-[#17233B]/10 pt-5 text-sm text-[#17233B]/60 sm:grid-cols-2">
                                            <p>{offer.availability}</p>

                                            <p>
                                                Expires {formatExpiry(offer.expires_at)}
                                            </p>
                                        </div>

                                        <div className="mt-6 rounded-xl bg-[#FFF8F0] p-4">
                                            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                                <p className="font-semibold">
                                                    {offer.max_redemptions === null
                                                        ? "Unlimited redemptions"
                                                        : isFullyClaimed
                                                            ? "Fully claimed"
                                                            : `${remainingRedemptions} redemption${remainingRedemptions === 1 ? "" : "s"
                                                            } remaining`}
                                                </p>

                                                {offer.max_redemptions !== null && (
                                                    <p className="text-sm text-[#17233B]/60">
                                                        {offer.redemption_count} of{" "}
                                                        {offer.max_redemptions} claimed
                                                    </p>
                                                )}
                                            </div>

                                            {offer.max_redemptions !== null && (
                                                <Progress
                                                    value={usagePercentage}
                                                    className="mt-3 h-2"
                                                />
                                            )}
                                        </div>

                                        <div className="mt-6 flex flex-wrap gap-3">
                                            <Button
                                                render={
                                                    <Link
                                                        href={`/offers/${offer.id}`}
                                                    />
                                                }
                                                nativeButton={false}
                                                variant="outline"
                                                size="sm"
                                            >
                                                View promotion
                                            </Button>

                                            {canManageOffers && (
                                                <Button
                                                    render={
                                                        <Link
                                                            href={`/business/${businessId}/offers/${offer.id}/edit`}
                                                        />
                                                    }
                                                    nativeButton={false}
                                                    variant="default"
                                                    size="sm"
                                                >
                                                    Edit promotion
                                                </Button>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
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