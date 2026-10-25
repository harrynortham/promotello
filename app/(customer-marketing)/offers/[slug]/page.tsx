import { Suspense } from "react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { connection } from "next/server";
import { notFound, permanentRedirect } from "next/navigation";

import {
    FiCalendar,
    FiChevronRight,
    FiClock,
    FiMapPin,
    FiNavigation,
    FiUsers,
} from "react-icons/fi";

import { SectionHeading } from "@/components/listing-ui";
import { OfferCard } from "@/components/offer-card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { addressParts, directionsUrl } from "@/lib/address";
import { topLevelFor } from "@/lib/categories";
import { getCategories, getLiveOffers } from "@/lib/listings";
import { truncate } from "@/lib/site";
import { createPublicClient } from "@/utils/supabase/public";
import { createClient } from "@/utils/supabase/server";

import RedeemButton from "./redeem-button";
import { getLiveCity } from "@/lib/cities";
import { OffersListing, offersMetadata } from "../offers-listing";
import { FollowButton } from "@/components/follow-button";
import { ShareOfferButton } from "@/components/share-offer-button";
import { offerShareCaption, shareLink } from "@/lib/share";
import { PageViewTracker } from "@/components/page-view-tracker";
import { businessPath, canonicalPath } from "@/lib/slugs";

type OfferPageProps = {
    params: Promise<{
        slug: string;
    }>;
};

function LoadingState() {
    return (
        <main className="min-h-screen bg-[#FFF8F0] px-6 pt-8 sm:px-10">
            <div className="mx-auto max-w-6xl">
                <Skeleton className="h-5 w-56 rounded-md" />
                <div className="mt-4 grid gap-5 lg:grid-cols-[minmax(0,1fr)_400px] lg:gap-8">
                    <Skeleton className="aspect-[16/9] rounded-3xl lg:aspect-[4/3]" />
                    <Skeleton className="h-96 rounded-3xl" />
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

    // /offers/<city> is the offers listing for that city.
    const city = await getLiveCity(slug);

    if (city) {
        return offersMetadata(city);
    }

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
            // The image comes from opengraph-image.tsx (photo, deal and business).
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
                category_id,
                max_redemptions,
                redemption_count,
                businesses!inner (
                    id,
                    slug,
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
        // An old address (the proxy usually redirects these first).
        const moved = await canonicalPath("offer", slug);
        if (moved) permanentRedirect(moved);
        notFound();
    }

    const business = Array.isArray(offer.businesses)
        ? offer.businesses[0]
        : offer.businesses;

    if (!business) {
        notFound();
    }

    const locations = business.business_locations;
    const location = Array.isArray(locations) ? locations[0] : locations;
    const address = addressParts(location);
    const directions = directionsUrl(address);
    const area = location?.region || location?.city || null;

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

    const { data: follow } = user
        ? await supabase
            .from("business_followers")
            .select("business_id")
            .eq("business_id", business.id)
            .eq("user_id", user.id)
            .maybeSingle()
        : { data: null };

    if (existingResult.error) {
        throw new Error(
            "We couldn’t check your voucher. Please refresh and try again.",
        );
    }

    const today = new Date().toISOString().slice(0, 10);

    const isExpired =
        Boolean(offer.expires_at) &&
        offer.expires_at.slice(0, 10) < today;

    const daysLeft = Math.round(
        (new Date(offer.expires_at).getTime() - new Date(today).getTime()) /
        86_400_000,
    );

    const remainingClaims =
        offer.max_redemptions === null
            ? null
            : Math.max(
                offer.max_redemptions -
                (offer.redemption_count ?? 0),
                0,
            );

    const isFullyClaimed = remainingClaims === 0;

    // Related offers come from the public listings (what any visitor sees).
    const [groups, liveOffers] = await Promise.all([
        getCategories(),
        getLiveOffers(),
    ]);

    const group = topLevelFor(offer.category_id, groups);

    const moreFromBusiness = liveOffers
        .filter((item) => item.business.id === business.id && item.id !== offer.id)
        .slice(0, 4);

    // Same category, nearest (same area) first.
    const similarOffers = group
        ? liveOffers
            .filter(
                (item) =>
                    item.business.id !== business.id &&
                    topLevelFor(item.categoryId, groups)?.id === group.id,
            )
            .sort(
                (a, b) =>
                    Number(b.business.area === area) -
                    Number(a.business.area === area),
            )
            .slice(0, 4)
        : [];

    const facts = [
        {
            icon: FiClock,
            label: isExpired
                ? "Expired"
                : daysLeft <= 0
                    ? "Ends today"
                    : daysLeft <= 14
                        ? `Ends in ${daysLeft} ${daysLeft === 1 ? "day" : "days"}`
                        : `Ends ${formatExpiry(offer.expires_at)}`,
            highlight: !isExpired && daysLeft <= 14,
        },
        { icon: FiCalendar, label: offer.availability, highlight: false },
        ...(remainingClaims !== null && !isExpired && remainingClaims > 0
            ? [
                {
                    icon: FiUsers,
                    label: `${remainingClaims} ${remainingClaims === 1 ? "claim" : "claims"} left`,
                    highlight: remainingClaims <= 20,
                },
            ]
            : []),
    ];

    return (
        <main className="min-h-screen bg-[#FFF8F0] pb-20 text-[#17233B]">
            <PageViewTracker businessId={business.id} offerId={offer.id} />
            <div className="mx-auto max-w-6xl px-6 pt-5 sm:px-10 sm:pt-8">
                <nav
                    aria-label="Breadcrumb"
                    className="flex items-center gap-1.5 text-sm text-[#17233B]/70"
                >
                    <Link href="/offers" className="hover:text-[#C8371D]">
                        Offers
                    </Link>
                    {group && (
                        <>
                            <FiChevronRight aria-hidden="true" className="size-3.5" />
                            <Link
                                href={`/categories/${group.slug}`}
                                className="hover:text-[#C8371D]"
                            >
                                {group.name}
                            </Link>
                        </>
                    )}
                    <FiChevronRight aria-hidden="true" className="size-3.5" />
                    <span className="truncate text-[#17233B]/80">{business.name}</span>
                </nav>

                <div className="mt-4 grid gap-5 lg:grid-cols-[minmax(0,1fr)_400px] lg:items-start lg:gap-8">
                    <div className="relative aspect-[16/9] overflow-hidden rounded-3xl bg-[#FFF4E8] sm:aspect-[16/10] lg:aspect-[4/3]">
                        {offer.image_url ? (
                            <Image
                                src={offer.image_url}
                                alt={offer.title}
                                fill
                                priority
                                sizes="(min-width: 1024px) 640px, 100vw"
                                className="object-cover"
                            />
                        ) : (
                            <div className="flex h-full items-center justify-center bg-gradient-to-br from-[#FF593F]/20 via-[#FFF4E8] to-[#FFF8F0] text-5xl font-semibold text-[#C8371D]">
                                {offer.discount}
                            </div>
                        )}

                        <span className="absolute left-4 top-4 rounded-full bg-[#C8371D] px-4 py-1.5 text-base font-semibold text-white shadow-sm">
                            {offer.discount}
                        </span>
                    </div>

                    <aside className="rounded-3xl border border-[#17233B]/10 bg-white p-6 shadow-sm sm:p-7 lg:sticky lg:top-24">
                        <Link
                            href={businessPath(business)}
                            className="group flex items-center gap-3"
                        >
                            {business.logo_url ? (
                                <Image
                                    src={business.logo_url}
                                    alt=""
                                    width={44}
                                    height={44}
                                    className="size-11 rounded-xl object-cover"
                                />
                            ) : (
                                <span className="flex size-11 items-center justify-center rounded-xl bg-[#FFF4E8] font-semibold text-[#C8371D]">
                                    {business.name.charAt(0).toUpperCase()}
                                </span>
                            )}

                            <span className="min-w-0">
                                <span className="block truncate font-semibold group-hover:text-[#C8371D]">
                                    {business.name}
                                </span>
                                {area && (
                                    <span className="mt-0.5 flex items-center gap-1 text-sm text-[#17233B]/70">
                                        <FiMapPin aria-hidden="true" className="size-3.5" />
                                        {area}
                                    </span>
                                )}
                            </span>
                        </Link>

                        <h1 className="mt-5 text-2xl font-semibold leading-tight tracking-tight sm:text-3xl">
                            {offer.title}
                        </h1>

                        <ul className="mt-5 space-y-2.5">
                            {facts.map((fact) => {
                                const Icon = fact.icon;

                                return (
                                    <li
                                        key={fact.label}
                                        className={`flex items-center gap-2.5 text-sm ${fact.highlight ? "font-semibold text-[#C8371D]" : "text-[#17233B]/75"}`}
                                    >
                                        <Icon aria-hidden="true" className="size-4 shrink-0" />
                                        {fact.label}
                                    </li>
                                );
                            })}
                        </ul>

                        <RedeemButton
                            key={offer.id}
                            offerId={offer.id}
                            isSignedIn={Boolean(user)}
                            isFullyClaimed={isFullyClaimed}
                            isExpired={isExpired}
                            initialRedemption={existingResult.data}
                            returnPath={`/offers/${offer.slug}`}
                        />

                        {!existingResult.data && !isExpired && !isFullyClaimed && (
                            <p className="mt-4 text-center text-xs leading-5 text-[#17233B]/70">
                                Free to claim. Show your code when you pay.
                            </p>
                        )}

                        {!isExpired && (
                            <ShareOfferButton
                                url={shareLink(`/offers/${offer.slug}`)}
                                text={offerShareCaption({ title: offer.title, discount: offer.discount, businessName: business.name })}
                            />
                        )}
                    </aside>
                </div>

                <div className="mt-8 grid gap-5 lg:grid-cols-[minmax(0,1fr)_400px] lg:gap-8">
                    <div className="space-y-5">
                        <section className="rounded-3xl border border-[#17233B]/10 bg-white p-6 sm:p-8">
                            <h2 className="text-lg font-semibold">About this offer</h2>
                            <p className="mt-3 whitespace-pre-line leading-7 text-[#17233B]/70">
                                {offer.description}
                            </p>

                            <h2 className="mt-8 text-lg font-semibold">Terms</h2>
                            <p className="mt-3 whitespace-pre-line text-sm leading-6 text-[#17233B]/65">
                                {offer.terms}
                            </p>
                        </section>
                    </div>

                    <section className="h-fit rounded-3xl border border-[#17233B]/10 bg-white p-6 sm:p-8">
                        <h2 className="text-lg font-semibold">Where to use it</h2>

                        <p className="mt-3 font-medium">{business.name}</p>

                        {address.length > 0 && (
                            <address className="mt-1 not-italic text-sm leading-6 text-[#17233B]/65">
                                {address.join(", ")}
                            </address>
                        )}

                        <div className="mt-5 flex flex-wrap gap-2">
                            {directions && (
                                <Button
                                    render={
                                        <a
                                            href={directions}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                        />
                                    }
                                    nativeButton={false}
                                    variant="outline"
                                    size="sm"
                                >
                                    <FiNavigation aria-hidden="true" />
                                    Directions
                                </Button>
                            )}

                            <Button
                                render={<Link href={businessPath(business)} />}
                                nativeButton={false}
                                variant="outline"
                                size="sm"
                            >
                                Opening hours and more
                            </Button>

                            <FollowButton
                                businessId={business.id}
                                initialFollowing={Boolean(follow)}
                                isSignedIn={Boolean(user)}
                                size="sm"
                            />
                        </div>
                    </section>
                </div>

                {moreFromBusiness.length > 0 && (
                    <section className="mt-16">
                        <SectionHeading
                            title={`More from ${business.name}`}
                            href={businessPath(business)}
                            linkLabel="View business"
                        />

                        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                            {moreFromBusiness.map((item) => (
                                <OfferCard
                                    key={item.id}
                                    slug={item.slug}
                                    discount={item.discount}
                                    title={item.title}
                                    description={item.description}
                                    availability={item.availability}
                                    imageUrl={item.imageUrl}
                                    expiresAt={item.expiresAt}
                                />
                            ))}
                        </div>
                    </section>
                )}

                {similarOffers.length > 0 && group && (
                    <section className="mt-16">
                        <SectionHeading
                            title={area ? `More ${group.name.toLowerCase()} near ${area}` : `More ${group.name.toLowerCase()}`}
                            href={`/categories/${group.slug}`}
                            linkLabel={`All ${group.name.toLowerCase()}`}
                        />

                        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                            {similarOffers.map((item) => (
                                <OfferCard
                                    key={item.id}
                                    slug={item.slug}
                                    discount={item.discount}
                                    title={item.title}
                                    description={item.description}
                                    availability={item.availability}
                                    business={item.business.name}
                                    businessLogoUrl={item.business.logoUrl}
                                    imageUrl={item.imageUrl}
                                    expiresAt={item.expiresAt}
                                    area={item.business.area}
                                />
                            ))}
                        </div>
                    </section>
                )}
            </div>
        </main>
    );
}

// Either one offer, or (when the slug is a live city, e.g. /offers/bristol)
// the offers listing for that city. Offer slugs end in a random code, so
// they never match a city.
async function OfferOrCityListing({ params, searchParams }: OfferPageProps & { searchParams: Promise<Record<string, string>> }) {
    const city = await getLiveCity((await params).slug);

    if (city) {
        return <OffersListing city={city} searchParams={searchParams} />;
    }

    return <OfferContent params={params} />;
}

export default function OfferPage({
    params,
    searchParams,
}: OfferPageProps & { searchParams: Promise<Record<string, string>> }) {
    return (
        <Suspense fallback={<LoadingState />}>
            <OfferOrCityListing params={params} searchParams={searchParams} />
        </Suspense>
    );
}