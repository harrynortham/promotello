import { Suspense } from "react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { connection } from "next/server";
import { notFound } from "next/navigation";

import {
    Alert,
    AlertDescription,
    AlertTitle,
} from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { truncate } from "@/lib/site";
import { createPublicClient } from "@/utils/supabase/public";
import { createClient } from "@/utils/supabase/server";

import RedeemButton from "./redeem-button";

type OfferPageProps = {
    params: Promise<{
        slug: string;
    }>;
};

function LoadingState() {
    return (
        <main className="min-h-screen bg-[#FFF8F0] px-6 py-10">
            <div className="mx-auto w-full max-w-2xl">
                <Skeleton className="h-9 w-40 rounded-md" />

                <div className="mt-6 overflow-hidden rounded-xl border border-[#17233B]/10 bg-white">
                    <Skeleton className="h-72 w-full rounded-none" />

                    <div className="space-y-6 p-6 md:p-10">
                        <Skeleton className="h-20 w-20 rounded-xl" />
                        <Skeleton className="h-12 w-3/4 rounded-md" />
                        <Skeleton className="h-24 w-full rounded-md" />

                        <div className="grid gap-4 sm:grid-cols-2">
                            <Skeleton className="h-24 rounded-xl" />
                            <Skeleton className="h-24 rounded-xl" />
                        </div>

                        <Skeleton className="h-32 rounded-md" />
                        <Skeleton className="h-12 rounded-md" />
                    </div>
                </div>
            </div>
        </main>
    );
}

function formatExpiry(value: string) {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return "Date unavailable";
    }

    return new Intl.DateTimeFormat("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
        timeZone: "UTC",
    }).format(date);
}

export async function generateMetadata({
    params,
}: OfferPageProps): Promise<Metadata> {
    const { slug } = await params;

    const { data: offer } = await createPublicClient()
        .from("offers")
        .select(
            "slug, title, discount, description, image_url, businesses!inner ( name, logo_url, is_sample )",
        )
        .eq("slug", slug)
        .maybeSingle();

    if (!offer) {
        return { title: "Offer not found", robots: { index: false } };
    }

    const business = Array.isArray(offer.businesses)
        ? offer.businesses[0]
        : offer.businesses;

    const title = business
        ? `${offer.discount} at ${business.name}: ${offer.title}`
        : `${offer.discount}: ${offer.title}`;
    const description = truncate(offer.description);
    const image = offer.image_url ?? business?.logo_url;
    const path = `/offers/${offer.slug}`;

    return {
        title,
        description,
        alternates: { canonical: path },
        // Sample (demo) listings must never appear in search results.
        robots: business?.is_sample ? { index: false, follow: false } : undefined,
        openGraph: {
            type: "website",
            url: path,
            title,
            description,
            images: image ? [{ url: image }] : undefined,
        },
    };
}

async function OfferContent({ params }: OfferPageProps) {
    await connection();

    const { slug } = await params;
    const supabase = await createClient();

    const { data: offer, error: offerError } = await supabase
        .from("offers")
        .select(
            `
                id,
                slug,
                category,
                discount,
                title,
                description,
                availability,
                expires_at,
                terms,
                image_url,
                max_redemptions,
                redemption_count,
                businesses!inner (
                    id,
                    name,
                    logo_url,
                    approval_status,
                    business_locations (
                        name,
                        address_line_1,
                        city,
                        region,
                        postal_code
                    )
                )
            `,
        )
        .eq("slug", slug)
        .eq("approval_status", "approved")
        .is("plan_paused_at", null)
        .eq("businesses.approval_status", "approved")
        .maybeSingle();

    if (offerError) {
        throw new Error("We couldn’t load this offer. Please try again.");
    }

    if (!offer) {
        notFound();
    }

    const business = Array.isArray(offer.businesses)
        ? offer.businesses[0]
        : offer.businesses;

    if (!business) {
        notFound();
    }

    const locations = business.business_locations;

    const location = Array.isArray(locations)
        ? locations[0]
        : locations;

    const fullAddress = location
        ? [
            location.address_line_1,
            location.city,
            location.region,
            location.postal_code,
        ]
            .filter(Boolean)
            .join(", ")
        : "";

    const directionsUrl = fullAddress
        ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
            fullAddress,
        )}`
        : null;

    const {
        data: { user },
    } = await supabase.auth.getUser();

    const existingResult = user
        ? await supabase
            .from("offer_redemptions")
            .select("id, redemption_code, used_at")
            .eq("offer_id", offer.id)
            .eq("user_id", user.id)
            .maybeSingle()
        : { data: null, error: null };

    if (existingResult.error) {
        throw new Error(
            "We couldn’t check your voucher. Please refresh and try again.",
        );
    }

    const today = new Date().toISOString().slice(0, 10);

    const isExpired =
        Boolean(offer.expires_at) &&
        offer.expires_at.slice(0, 10) < today;

    const remainingClaims =
        offer.max_redemptions === null
            ? null
            : Math.max(
                offer.max_redemptions -
                (offer.redemption_count ?? 0),
                0,
            );

    const isFullyClaimed = remainingClaims === 0;

    return (
        <main className="min-h-screen bg-[#FFF8F0] px-6 py-10">
            <div className="mx-auto w-full max-w-2xl">
                <Button
                    render={<Link href="/offers" />}
                    nativeButton={false}
                    variant="outline"
                    size="sm"
                    className="mb-6"
                >
                    ← Back to all deals
                </Button>

                <Card className="overflow-hidden border-[#17233B]/10 shadow-sm">
                    {offer.image_url && (
                        <div className="relative aspect-[16/8] w-full overflow-hidden bg-[#FFF8F0]">
                            <Image
                                src={offer.image_url}
                                alt={offer.title}
                                fill
                                className="object-cover"
                            />
                        </div>
                    )}

                    <CardContent className="p-6 md:p-10">
                        {business.logo_url && (
                            <Image
                                src={business.logo_url}
                                alt={`${business.name} logo`}
                                width={80}
                                height={80}
                                className="mb-6 rounded-xl object-cover"
                            />
                        )}

                        <div className="flex flex-wrap items-start justify-between gap-4">
                            <div>
                                <Badge
                                    variant="outline"
                                    className="border-[#FF593F]/30 bg-[#FF593F]/10 text-[#FF593F]"
                                >
                                    {offer.category}
                                </Badge>

                                <p className="mt-4 text-sm text-[#17233B]/60">
                                    Offered by
                                </p>

                                <Button
                                    render={
                                        <Link
                                            href={`/businesses/${business.id}`}
                                        />
                                    }
                                    nativeButton={false}
                                    variant="link"
                                    size="sm"
                                    className="h-auto p-0 text-base"
                                >
                                    {business.name}
                                </Button>
                            </div>

                            <Badge
                                variant="secondary"
                                className="bg-[#FFF4E8] px-4 py-2 text-sm text-[#FF593F]"
                            >
                                {offer.discount}
                            </Badge>
                        </div>

                        <h1 className="mt-6 text-3xl font-semibold tracking-tight text-[#17233B] md:text-4xl">
                            {offer.title}
                        </h1>

                        <p className="mt-5 whitespace-pre-line leading-7 text-[#17233B]/70">
                            {offer.description}
                        </p>

                        <div className="mt-8 grid gap-4 sm:grid-cols-2">
                            <Card className="border-[#17233B]/10 bg-[#FFF8F0] shadow-none">
                                <CardContent className="p-5">
                                    <p className="text-xs font-semibold uppercase tracking-wide text-[#17233B]/50">
                                        Availability
                                    </p>

                                    <p className="mt-2 text-sm text-[#17233B]">
                                        {offer.availability}
                                    </p>
                                </CardContent>
                            </Card>

                            <Card className="border-[#17233B]/10 bg-[#FFF8F0] shadow-none">
                                <CardContent className="p-5">
                                    <p className="text-xs font-semibold uppercase tracking-wide text-[#17233B]/50">
                                        Expiry date
                                    </p>

                                    <p className="mt-2 text-sm text-[#17233B]">
                                        {formatExpiry(offer.expires_at)}
                                    </p>
                                </CardContent>
                            </Card>
                        </div>

                        {!isExpired &&
                            remainingClaims !== null &&
                            remainingClaims > 0 && (
                                <Alert className="mt-6 border-[#FF593F]/20 bg-[#FFF4E8] text-[#17233B]">
                                    <AlertTitle>
                                        {remainingClaims} claim
                                        {remainingClaims === 1 ? "" : "s"}{" "}
                                        remaining
                                    </AlertTitle>

                                    <AlertDescription>
                                        Availability is checked again when
                                        you claim.
                                    </AlertDescription>
                                </Alert>
                            )}

                        <Separator className="my-8" />

                        <section>
                            <h2 className="text-lg font-semibold text-[#17233B]">
                                Terms and conditions
                            </h2>

                            <p className="mt-2 whitespace-pre-line text-sm leading-6 text-[#17233B]/65">
                                {offer.terms}
                            </p>
                        </section>

                        {fullAddress && (
                            <>
                                <Separator className="my-8" />

                                <section>
                                    <h2 className="text-lg font-semibold text-[#17233B]">
                                        Plan your visit
                                    </h2>

                                    <p className="mt-2 text-sm leading-6 text-[#17233B]/65">
                                        {fullAddress}
                                    </p>

                                    <div className="mt-4 flex flex-wrap gap-3">
                                        {directionsUrl && (
                                            <Button
                                                render={
                                                    <a
                                                        href={directionsUrl}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                    />
                                                }
                                                nativeButton={false}
                                                variant="outline"
                                                size="sm"
                                            >
                                                Get directions
                                            </Button>
                                        )}

                                        <Button
                                            render={
                                                <Link
                                                    href={`/businesses/${business.id}`}
                                                />
                                            }
                                            nativeButton={false}
                                            variant="outline"
                                            size="sm"
                                        >
                                            View business
                                        </Button>
                                    </div>
                                </section>
                            </>
                        )}

                        <Separator className="my-8" />

                        <section>
                            <h2 className="text-lg font-semibold text-[#17233B]">
                                {existingResult.data
                                    ? "Your voucher"
                                    : "Claim this deal"}
                            </h2>

                            <p className="mt-2 text-sm leading-6 text-[#17233B]/65">
                                {existingResult.data
                                    ? "You’ve already claimed this promotion. Your code and voucher status are shown below."
                                    : "Read the terms before claiming. If a booking is required, arrange it with the business separately."}
                            </p>

                            <RedeemButton
                                key={offer.id}
                                offerId={offer.id}
                                isSignedIn={Boolean(user)}
                                isFullyClaimed={isFullyClaimed}
                                isExpired={isExpired}
                                initialRedemption={existingResult.data}
                            />
                        </section>
                    </CardContent>
                </Card>
            </div>
        </main>
    );
}

export default function OfferPage({ params }: OfferPageProps) {
    return (
        <Suspense fallback={<LoadingState />}>
            <OfferContent params={params} />
        </Suspense>
    );
}