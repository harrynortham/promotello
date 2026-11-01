import { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { FiPlus } from "react-icons/fi";
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
import {
    OfferListedArt,
    OfferWriteArt,
    RedeemMarkArt,
} from "@/components/step-art";
import { OffersHowItWorks } from "./how-it-works";
import { SharePanel } from "@/components/share-panel";
import { offerShareCaption, shareLink } from "@/lib/share";
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
    slug: string;
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
    logo_url: string | null;
};

type Membership = {
    role: "owner" | "admin" | "member";
    businesses: BusinessSummary | BusinessSummary[] | null;
};

// What happens once an offer exists, for the empty state. Deliberately
// not sample offer cards: those read as offers the business already has.
const offerJourney = [
    {
        art: <OfferWriteArt />,
        title: "You write it",
        body: "A title, the discount and when it ends. The preview beside the form shows how it will look as you type.",
    },
    {
        art: <OfferListedArt />,
        title: "Customers find it",
        body: "Once approved it appears on your business page and in the Promotello directory, where people nearby are browsing.",
    },
    {
        art: <RedeemMarkArt />,
        title: "You redeem it",
        body: "Claiming saves a voucher to their phone. Scan it at the till and it is marked used, so it can't be claimed twice.",
    },
];

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
        <div>
            <div>
                <Skeleton className="h-9 w-44 rounded-lg" />

                <div className="mt-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <Skeleton className="h-5 w-32 rounded-lg" />
                        <Skeleton className="mt-3 h-12 w-72 rounded-lg" />
                        <Skeleton className="mt-3 h-5 w-96 max-w-full rounded-lg" />
                    </div>

                    <Skeleton className="h-9 w-40 rounded-lg" />
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
                                        <Skeleton className="h-4 w-24 rounded-lg" />
                                        <Skeleton className="mt-3 h-8 w-64 rounded-lg" />
                                        <Skeleton className="mt-2 h-4 w-32 rounded-lg" />
                                    </div>

                                    <Skeleton className="h-6 w-28 rounded-full" />
                                </div>

                                <Skeleton className="h-16 w-full rounded-lg" />

                                <div className="rounded-xl bg-[#FFF8F0] p-4">
                                    <Skeleton className="h-5 w-56 rounded-lg" />
                                    <Skeleton className="mt-3 h-2 w-full rounded-full" />
                                </div>

                                <div className="flex gap-3">
                                    <Skeleton className="h-9 w-32 rounded-lg" />
                                    <Skeleton className="h-9 w-32 rounded-lg" />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
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
        .select("role, businesses (id, name, logo_url)")
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
        slug,
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

    // Views per offer for the share panel (last 30 days).
    const { data: viewRows } = await supabase.rpc("offer_view_counts", { requested_business_id: businessId });
    const viewsByOffer = new Map(
        ((viewRows ?? []) as { offer_id: string; views: number; shared_views: number }[]).map((row) => [
            row.offer_id,
            { views: Number(row.views), sharedViews: Number(row.shared_views) },
        ]),
    );
    const hasPro = await businessHasPro(supabase, businessId);
    const liveOfferCount = typedOffers.filter(isLiveOffer).length;
    // On Free the one offer slot may already be taken, in which case the
    // way forward is Pro rather than another Create offer button.
    const canCreateOffer =
        canManageOffers && (hasPro || liveOfferCount < FREE_LIVE_OFFER_LIMIT);
    const pausedOfferCount = typedOffers.filter(
        (offer) => offer.plan_paused_at !== null,
    ).length;

    return (
        <div className="text-[#17233B]">
            <div>
                <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#FF593F]">
                            Offers
                        </p>

                        <h1 className="mt-3 text-4xl font-semibold tracking-tight">
                            {business?.name ?? "Business offers"}
                        </h1>

                        <p className="mt-3 text-[#17233B]/65">
                            Manage offers submitted by this business.
                        </p>
                    </div>

                    <div className="shrink-0">
                        <OffersHowItWorks />
                    </div>
                </header>

                {!hasPro && canManageOffers && (
                    <Alert className="mt-8 border-[#FF593F]/30 bg-[#FF593F]/5">
                        <AlertTitle>
                            Free plan · {liveOfferCount} of{" "}
                            {FREE_LIVE_OFFER_LIMIT} live offer used
                        </AlertTitle>

                        <AlertDescription>
                            {pausedOfferCount > 0
                                ? `${pausedOfferCount} paused ${pausedOfferCount === 1 ? "offer is" : "offers are"} hidden from customers. Show them again, and run as many offers as you like.`
                                : "Run as many offers as you like at once."}{" "}
                            <Link
                                href={`/business/${businessId}/billing`}
                                className="font-medium text-[#FF593F]"
                            >
                                Upgrade to Pro
                            </Link>
                        </AlertDescription>
                    </Alert>
                )}

                {error ? (
                    <Alert variant="destructive" className="mt-10">
                        <AlertTitle>Unable to load offers</AlertTitle>

                        <AlertDescription>
                            We couldn’t load your offers. Please refresh and try again.
                        </AlertDescription>
                    </Alert>
                ) : typedOffers.length === 0 ? (
                    <>
                        <div className="mt-10 rounded-xl border border-dashed border-[#17233B]/20 bg-white px-6 py-14 text-center">
                            <h2 className="text-xl font-semibold">No offers yet</h2>

                            <p className="mx-auto mt-2 max-w-md text-[#17233B]/65">
                                {canManageOffers
                                    ? "Create your first offer and submit it for approval."
                                    : "This business has not created any offers yet."}
                            </p>

                            {canManageOffers && (
                                <Button
                                    render={
                                        <Link href={`/business/${businessId}/offers/new`} />
                                    }
                                    nativeButton={false}
                                    variant="default"
                                    size="lg"
                                    className="mt-7"
                                >
                                    Create offer
                                </Button>
                            )}
                        </div>

                        {canManageOffers && (
                            <section className="mt-10 rounded-xl border border-[#17233B]/10 bg-white p-6 sm:p-8">
                                <h3 className="text-lg font-semibold">
                                    What happens after you create one
                                </h3>

                                <ol className="mt-6 grid gap-8 sm:grid-cols-3">
                                    {offerJourney.map((step, index) => (
                                        <li key={step.title}>
                                            {step.art}

                                            <p className="mt-4 text-xs font-semibold uppercase tracking-[0.18em] text-[#FF593F]">
                                                Step {index + 1}
                                            </p>

                                            <p className="mt-1 font-semibold">{step.title}</p>

                                            <p className="mt-1 text-sm leading-6 text-[#17233B]/65">
                                                {step.body}
                                            </p>
                                        </li>
                                    ))}
                                </ol>
                            </section>
                        )}
                    </>
                ) : (
                    <section className="mt-10">
                        {canCreateOffer && (
                            <div className="mb-5 flex justify-end">
                                <Button
                                    render={
                                        <Link href={`/business/${businessId}/offers/new`} />
                                    }
                                    nativeButton={false}
                                    variant="default"
                                    size="lg"
                                >
                                    Create offer
                                </Button>
                            </div>
                        )}

                        <div className="grid gap-5 xl:grid-cols-2">
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

                                                <p className="mt-2 text-sm text-[#17233B]/70">
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

                                        <div className="mt-6 grid gap-3 border-t border-[#17233B]/10 pt-5 text-sm text-[#17233B]/70 sm:grid-cols-2">
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
                                                    <p className="text-sm text-[#17233B]/70">
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
                                                        href={`/offers/${offer.slug}`}
                                                    />
                                                }
                                                nativeButton={false}
                                                variant="outline"
                                                size="sm"
                                            >
                                                View offer
                                            </Button>

                                            {offer.approval_status === "approved" && (
                                                <SharePanel
                                                    title={offer.title}
                                                    url={shareLink(`/offers/${offer.slug}`)}
                                                    caption={offerShareCaption({
                                                        title: offer.title,
                                                        discount: offer.discount,
                                                        businessName: business?.name ?? "",
                                                    })}
                                                    images={[
                                                        { label: "Story", href: `/offers/${offer.slug}/story-image`, filename: `${offer.slug}-story.png`, aspect: "aspect-[9/16]" },
                                                        { label: "Square post", href: `/offers/${offer.slug}/post-image`, filename: `${offer.slug}-post.png`, aspect: "aspect-square" },
                                                    ]}
                                                    stats={viewsByOffer.get(offer.id) ?? { views: 0, sharedViews: 0 }}
                                                />
                                            )}

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
                                                    Edit offer
                                                </Button>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })}

                        {canManageOffers && (
                            <div className="flex h-full min-h-56 flex-col items-center justify-center rounded-xl border border-dashed border-[#17233B]/20 bg-white p-8 text-center">
                                <span className="flex size-12 items-center justify-center rounded-full bg-[#FF593F]/10 text-[#FF593F]">
                                    <FiPlus aria-hidden="true" className="size-5" />
                                </span>

                                {canCreateOffer ? (
                                    <>
                                        <h2 className="mt-4 text-lg font-semibold">
                                            Add another offer
                                        </h2>

                                        <p className="mt-2 max-w-sm text-sm leading-6 text-[#17233B]/65">
                                            Run as many as you like at once. A
                                            second offer gives people another
                                            reason to choose you.
                                        </p>

                                        <Button
                                            render={
                                                <Link href={`/business/${businessId}/offers/new`} />
                                            }
                                            nativeButton={false}
                                            size="lg"
                                            className="mt-5"
                                        >
                                            Create offer
                                        </Button>
                                    </>
                                ) : (
                                    <>
                                        <h2 className="mt-4 text-lg font-semibold">
                                            Add another offer
                                        </h2>

                                        <p className="mt-2 max-w-sm text-sm leading-6 text-[#17233B]/65">
                                            The Free plan covers {FREE_LIVE_OFFER_LIMIT}{" "}
                                            offer at a time. Pro lets you run
                                            several together, so you can test
                                            which one brings people in.
                                        </p>

                                        <Button
                                            render={
                                                <Link href={`/business/${businessId}/billing`} />
                                            }
                                            nativeButton={false}
                                            size="lg"
                                            className="mt-5 bg-[#FF593F] text-white hover:bg-[#FF593F]/90"
                                        >
                                            Upgrade to Pro
                                        </Button>
                                    </>
                                )}
                            </div>
                        )}
                        </div>
                    </section>
                )}
            </div>
        </div>
    );
}

export default function BusinessOffersPage({ params }: PageProps) {
    return (
        <Suspense fallback={<LoadingState />}>
            <OffersContent params={params} />
        </Suspense>
    );
}