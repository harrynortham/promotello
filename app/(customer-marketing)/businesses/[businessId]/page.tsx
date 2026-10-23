import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import {
    FiArrowLeft,
    FiArrowUpRight,
    FiClock,
    FiGift,
    FiGlobe,
    FiMail,
    FiMapPin,
} from "react-icons/fi";

import { OfferCard } from "@/components/offer-card";
import {
    Alert,
    AlertDescription,
    AlertTitle,
} from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { addressParts, directionsUrl as directionsUrlFor } from "@/lib/address";
import { absoluteUrl, jsonLd, siteName, truncate } from "@/lib/site";
import { createPublicClient } from "@/utils/supabase/public";
import { createClient } from "@/utils/supabase/server";
import { FollowButton } from "@/components/follow-button";
import { MapEmbed } from "@/components/map-embed";
import { PageViewTracker } from "@/components/page-view-tracker";
import { EventCard, type EventSummary } from "@/components/event-card";
import { LoyaltyCallout } from "./loyalty-callout";

type BusinessPageProps = {
    params: Promise<{
        businessId: string;
    }>;
    searchParams?: Promise<{ loyalty?: string }>;
};

const dayNames = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
];

function formatTime(value: string | null) {
    if (!value) return "";

    const [hours, minutes] = value.split(":");

    if (!hours || !minutes) return "";

    return `${hours.padStart(2, "0")}:${minutes}`;
}

function LoadingState() {
    return (
        <main className="min-h-screen bg-[#FFF8F0] px-6 py-10 sm:px-10">
            <div
                role="status"
                aria-label="Loading business profile"
                className="mx-auto max-w-6xl space-y-6"
            >
                <Skeleton className="h-9 w-44" />
                <Skeleton className="h-64 rounded-2xl" />

                <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
                    <div className="space-y-6">
                        <Skeleton className="h-44 rounded-2xl" />

                        <div className="grid gap-6 sm:grid-cols-2">
                            <Skeleton className="h-80 rounded-2xl" />
                            <Skeleton className="h-80 rounded-2xl" />
                        </div>
                    </div>

                    <div className="space-y-6">
                        <Skeleton className="h-80 rounded-2xl" />
                        <Skeleton className="h-72 rounded-2xl" />
                    </div>
                </div>
            </div>
        </main>
    );
}

export async function generateMetadata({
    params,
}: BusinessPageProps): Promise<Metadata> {
    const { businessId } = await params;

    const { data: business } = await createPublicClient()
        .from("businesses")
        .select("id, name, category, description, logo_url, is_sample, business_locations ( city )")
        .eq("id", businessId)
        .maybeSingle();

    if (!business) {
        return { title: "Business not found", robots: { index: false } };
    }

    const location = Array.isArray(business.business_locations)
        ? business.business_locations[0]
        : business.business_locations;

    const place = location?.city ? ` in ${location.city}` : "";
    const description = truncate(
        business.description ||
            `${business.name} is a ${business.category.toLowerCase()} business${place}. See their latest offers and opening hours on ${siteName}.`,
    );
    const path = `/businesses/${business.id}`;

    return {
        title: `${business.name}${place}`,
        description,
        alternates: { canonical: path },
        // Sample (demo) listings must never appear in search results.
        robots: business.is_sample ? { index: false, follow: false } : undefined,
        openGraph: {
            type: "website",
            url: path,
            title: business.name,
            description,
            images: business.logo_url ? [{ url: business.logo_url }] : undefined,
        },
    };
}

function startOfToday() {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    return today.toISOString();
}

async function BusinessContent({ params, searchParams }: BusinessPageProps) {
    await connection();

    const { businessId } = await params;
    const loyaltyStatus = (await searchParams)?.loyalty;
    const supabase = await createClient();

    const { data: business, error: businessError } = await supabase
        .from("businesses")
        .select(
            `
                id,
                name,
                logo_url,
                category,
                description,
                website_url,
                contact_email,
                approval_status,
                business_locations (
                    name,
                    address_line_1,
                    city,
                    region,
                    postal_code,
                    country_code
                ),
                business_hours (
                    day_of_week,
                    is_closed,
                    opens_at,
                    closes_at
                )
            `,
        )
        .eq("id", businessId)
        .eq("approval_status", "approved")
        .maybeSingle();

    if (businessError) {
        throw new Error("We couldn’t load this business. Please try again.");
    }

    if (!business) {
        notFound();
    }

    const today = new Date().toISOString().slice(0, 10);

    // Active loyalty card, and the visitor's progress on it if they've joined.
    const [{ data: loyaltyProgram }, { data: { user: viewer } }] = await Promise.all([
        supabase
            .from("loyalty_programs")
            .select("id, stamps_required, reward, terms")
            .eq("business_id", businessId)
            .eq("is_active", true)
            .maybeSingle(),
        supabase.auth.getUser(),
    ]);

    const { data: eventRows } = await supabase
        .from("business_events")
        .select("id, title, description, starts_at, ends_at, location, price")
        .eq("business_id", businessId)
        .gte("starts_at", startOfToday())
        .order("starts_at", { ascending: true })
        .limit(6);
    const events = (eventRows ?? []) as EventSummary[];

    const { data: follow } = viewer
        ? await supabase
            .from("business_followers")
            .select("business_id")
            .eq("business_id", businessId)
            .eq("user_id", viewer.id)
            .maybeSingle()
        : { data: null };

    const { data: loyaltyCard } =
        loyaltyProgram && viewer
            ? await supabase
                .from("loyalty_cards")
                .select("stamps")
                .eq("program_id", loyaltyProgram.id)
                .eq("user_id", viewer.id)
                .maybeSingle()
            : { data: null };

    const { data: offers, error: offersError } = await supabase
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
                business_id
            `,
        )
        .eq("business_id", businessId)
        .eq("approval_status", "approved")
        .gte("expires_at", today)
        .is("plan_paused_at", null)
        .order("created_at", { ascending: false });

    const location = Array.isArray(business.business_locations)
        ? business.business_locations[0]
        : business.business_locations;

    const hours = Array.isArray(business.business_hours)
        ? [...business.business_hours].sort(
            // Display Monday first, Sunday last.
            (a, b) =>
                ((a.day_of_week + 6) % 7) -
                ((b.day_of_week + 6) % 7),
        )
        : [];

    const addressLines = addressParts(location);
    const fullAddress = addressLines.join(", ");
    const directionsUrl = directionsUrlFor(addressLines);

    const mapUrl = fullAddress
        ? `https://www.google.com/maps?q=${encodeURIComponent(
            fullAddress,
        )}&output=embed`
        : null;

    const promotionCount = offers?.length ?? 0;

    // Newest offer photo doubles as the profile's cover image.
    const coverImageUrl =
        offers?.find((offer) => offer.image_url)?.image_url ?? null;
    const placeName = [location?.region, location?.city]
        .filter((part, index, parts) => part && parts.indexOf(part) === index)
        .join(", ");

    const initials = business.name
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((word: string) => word.charAt(0))
        .join("")
        .toUpperCase();

    const pageUrl = absoluteUrl(`/businesses/${business.id}`);

    const structuredData = {
        "@context": "https://schema.org",
        "@type": "LocalBusiness",
        "@id": `${pageUrl}#business`,
        name: business.name,
        description: business.description ?? undefined,
        url: pageUrl,
        image: business.logo_url ?? undefined,
        logo: business.logo_url ?? undefined,
        email: business.contact_email ?? undefined,
        sameAs: business.website_url ? [business.website_url] : undefined,
        address: location
            ? {
                "@type": "PostalAddress",
                streetAddress: location.address_line_1,
                addressLocality: location.city,
                addressRegion: location.region ?? undefined,
                postalCode: location.postal_code ?? undefined,
                addressCountry: location.country_code,
            }
            : undefined,
        openingHoursSpecification: hours
            .filter((day) => !day.is_closed && day.opens_at && day.closes_at)
            .map((day) => ({
                "@type": "OpeningHoursSpecification",
                dayOfWeek: `https://schema.org/${dayNames[day.day_of_week]}`,
                opens: formatTime(day.opens_at),
                closes: formatTime(day.closes_at),
            })),
        makesOffer: (offers ?? []).map((offer) => ({
            "@type": "Offer",
            name: offer.title,
            description: offer.description,
            url: absoluteUrl(`/offers/${offer.slug}`),
            validThrough: offer.expires_at,
        })),
    };

    return (
        <main className="min-h-screen bg-[#FFF8F0] px-6 py-8 text-[#17233B] sm:px-10 sm:py-10">
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: jsonLd(structuredData) }}
            />
            <PageViewTracker businessId={business.id} />

            <div className="mx-auto max-w-6xl">
                <Button
                    render={<Link href="/businesses" />}
                    nativeButton={false}
                    variant="ghost"
                    size="sm"
                    className="mb-6"
                >
                    <FiArrowLeft aria-hidden="true" />
                    All businesses
                </Button>

                {/* Business identity */}
                <section
                    aria-labelledby="business-name"
                    className="overflow-hidden rounded-2xl border border-[#17233B]/10 bg-white shadow-sm"
                >
                    <div
                        aria-hidden="true"
                        className={`relative overflow-hidden bg-[#17233B] ${coverImageUrl ? "h-44 sm:h-64" : "h-24 sm:h-28"}`}
                    >
                        {coverImageUrl ? (
                            <>
                                <Image
                                    src={coverImageUrl}
                                    alt=""
                                    fill
                                    priority
                                    sizes="(min-width: 1280px) 1200px, 100vw"
                                    className="object-cover"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-[#17233B]/50 to-transparent" />
                            </>
                        ) : (
                            <>
                                <div className="absolute -right-8 -top-24 size-64 rounded-full border-[32px] border-white/5" />
                                <div className="absolute right-44 top-12 size-32 rounded-full bg-[#FF593F]/20" />
                            </>
                        )}
                    </div>

                    <div className="px-6 pb-7 sm:px-8">
                        <div className="relative -mt-10 flex items-end justify-between gap-4">
                            <div className="flex size-24 shrink-0 items-center justify-center overflow-hidden rounded-2xl border-4 border-white bg-white shadow-sm sm:size-28">
                                {business.logo_url ? (
                                    <Image
                                        src={business.logo_url}
                                        alt={`${business.name} logo`}
                                        width={112}
                                        height={112}
                                        className="h-full w-full object-contain p-2"
                                    />
                                ) : (
                                    <span className="flex h-full w-full items-center justify-center bg-[#FFF4E8] text-3xl font-semibold">
                                        {initials}
                                    </span>
                                )}
                            </div>

                            {business.category && (
                                <Badge
                                    variant="secondary"
                                    className="mb-1 max-w-[60%] whitespace-normal text-right"
                                >
                                    {business.category}
                                </Badge>
                            )}
                        </div>

                        <div className="mt-5 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
                            <div className="min-w-0">
                                <h1
                                    id="business-name"
                                    className="break-words text-3xl font-semibold tracking-tight sm:text-4xl"
                                >
                                    {business.name}
                                </h1>

                                <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
                                    {placeName && (
                                        <span className="inline-flex items-center gap-2">
                                            <FiMapPin
                                                aria-hidden="true"
                                                className="size-4"
                                            />
                                            {placeName}
                                        </span>
                                    )}

                                    {!offersError && (
                                        <span className="inline-flex items-center gap-2">
                                            <FiGift
                                                aria-hidden="true"
                                                className="size-4"
                                            />
                                            {promotionCount} current{" "}
                                            {promotionCount === 1
                                                ? "promotion"
                                                : "promotions"}
                                        </span>
                                    )}
                                </div>
                            </div>

                            <div className="flex shrink-0 flex-wrap gap-2">
                                <Button
                                    render={<Link href="#promotions" />}
                                    nativeButton={false}
                                >
                                    View promotions
                                </Button>

                                <FollowButton
                                    businessId={business.id}
                                    initialFollowing={Boolean(follow)}
                                    isSignedIn={Boolean(viewer)}
                                />

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
                                    >
                                        <FiMapPin aria-hidden="true" />
                                        Directions
                                    </Button>
                                )}
                            </div>
                        </div>
                    </div>
                </section>

                <div className="mt-6 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
                    {/* Main profile content */}
                    <div className="min-w-0 space-y-8">
                        <Card className="gap-4 rounded-2xl border-[#17233B]/10 shadow-none">
                            <CardHeader>
                                <CardTitle className="text-lg">
                                    About this business
                                </CardTitle>
                            </CardHeader>

                            <CardContent>
                                <p className="whitespace-pre-line text-sm leading-7 text-muted-foreground">
                                    {business.description ||
                                        "Discover this business and explore its latest promotions on Promotello."}
                                </p>
                            </CardContent>
                        </Card>

                        {loyaltyProgram && (
                            <LoyaltyCallout
                                businessId={business.id}
                                businessName={business.name}
                                program={loyaltyProgram}
                                card={loyaltyCard}
                                isSignedIn={Boolean(viewer)}
                                unavailable={loyaltyStatus === "unavailable"}
                            />
                        )}

                        {events.length > 0 && (
                            <section id="events" aria-labelledby="events-heading">
                                <h2 id="events-heading" className="text-2xl font-semibold tracking-tight">
                                    Coming up
                                </h2>
                                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                                    {events.map((event) => (
                                        <EventCard key={event.id} event={event} />
                                    ))}
                                </div>
                            </section>
                        )}

                        <section
                            id="promotions"
                            aria-labelledby="promotions-heading"
                            className="scroll-mt-28"
                        >
                            <div className="mb-5 flex items-center justify-between gap-4">
                                <div>
                                    <h2
                                        id="promotions-heading"
                                        className="text-2xl font-semibold tracking-tight"
                                    >
                                        Current promotions
                                    </h2>

                                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                                        Explore what’s on offer at{" "}
                                        {business.name}.
                                    </p>
                                </div>

                                {!offersError && (
                                    <Badge
                                        variant="outline"
                                        className="shrink-0"
                                    >
                                        {promotionCount}
                                    </Badge>
                                )}
                            </div>

                            {offersError ? (
                                <Alert variant="destructive">
                                    <AlertTitle>
                                        Promotions couldn’t be loaded
                                    </AlertTitle>
                                    <AlertDescription>
                                        Please refresh the page and try again.
                                    </AlertDescription>
                                </Alert>
                            ) : promotionCount > 0 ? (
                                <div className="grid gap-5 sm:grid-cols-2">
                                    {offers?.map((offer) => (
                                        <OfferCard
                                            key={offer.id}
                                            slug={offer.slug}
                                            discount={offer.discount}
                                            title={offer.title}
                                            description={offer.description}
                                            availability={offer.availability}
                                            business={business.name}
                                            businessId={business.id}
                                            businessLogoUrl={business.logo_url}
                                            imageUrl={offer.image_url}
                                            expiresAt={offer.expires_at}
                                        />
                                    ))}
                                </div>
                            ) : (
                                <Card className="rounded-2xl border-dashed shadow-none">
                                    <CardContent className="px-6 py-10 text-center">
                                        <span className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-muted">
                                            <FiGift
                                                aria-hidden="true"
                                                className="size-5 text-muted-foreground"
                                            />
                                        </span>

                                        <h3 className="mt-4 font-semibold">
                                            Nothing on offer just yet
                                        </h3>

                                        <p className="mx-auto mt-2 max-w-sm text-sm leading-7 text-muted-foreground">
                                            Check back for new promotions
                                            from this business.
                                        </p>

                                        <Button
                                            render={
                                                <Link href="/explore" />
                                            }
                                            nativeButton={false}
                                            variant="outline"
                                            size="sm"
                                            className="mt-5"
                                        >
                                            Explore other deals
                                        </Button>
                                    </CardContent>
                                </Card>
                            )}
                        </section>
                    </div>

                    {/* Visiting information */}
                    <aside
                        aria-label="Business visiting information"
                        className="space-y-5"
                    >
                        <Card className="gap-0 overflow-hidden rounded-2xl border-[#17233B]/10 pb-0 shadow-none">
                            <CardHeader className="pb-5">
                                <CardTitle className="flex items-center gap-2 text-base">
                                    <FiMapPin
                                        aria-hidden="true"
                                        className="size-4 text-muted-foreground"
                                    />
                                    Find us
                                </CardTitle>
                            </CardHeader>

                            <CardContent className="pb-6">
                                {fullAddress ? (
                                    <>
                                        {location?.name && (
                                            <p className="mb-2 text-sm font-medium">
                                                {location.name}
                                            </p>
                                        )}

                                        <address className="text-sm not-italic leading-7 text-muted-foreground">
                                            {addressLines.map(
                                                (line, index) => (
                                                    <span
                                                        key={`${index}-${line}`}
                                                        className="block"
                                                    >
                                                        {line}
                                                    </span>
                                                ),
                                            )}
                                        </address>

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
                                                className="mt-4 w-full"
                                            >
                                                Get directions
                                                <FiArrowUpRight aria-hidden="true" />
                                            </Button>
                                        )}
                                    </>
                                ) : (
                                    <p className="text-sm leading-7 text-muted-foreground">
                                        Location details haven’t been added
                                        yet.
                                    </p>
                                )}
                            </CardContent>

                            {mapUrl && (
                                <div className="overflow-hidden border-t">
                                    <MapEmbed
                                        title={`Map showing ${business.name}`}
                                        src={mapUrl}
                                    />
                                </div>
                            )}
                        </Card>

                        {hours.length > 0 && (
                            <Card className="gap-4 rounded-2xl border-[#17233B]/10 shadow-none">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2 text-base">
                                        <FiClock
                                            aria-hidden="true"
                                            className="size-4 text-muted-foreground"
                                        />
                                        Opening hours
                                    </CardTitle>
                                </CardHeader>

                                <CardContent>
                                    <dl className="divide-y divide-border">
                                        {hours.map((day) => (
                                            <div
                                                key={day.day_of_week}
                                                className="flex items-center justify-between gap-3 py-3 text-sm first:pt-0 last:pb-0"
                                            >
                                                <dt className="text-muted-foreground">
                                                    {dayNames[
                                                        day.day_of_week
                                                    ]}
                                                </dt>

                                                <dd className="text-right font-medium tabular-nums">
                                                    {day.is_closed
                                                        ? "Closed"
                                                        : day.opens_at &&
                                                            day.closes_at
                                                            ? `${formatTime(
                                                                day.opens_at,
                                                            )} – ${formatTime(
                                                                day.closes_at,
                                                            )}`
                                                            : "Not provided"}
                                                </dd>
                                            </div>
                                        ))}
                                    </dl>

                                    <p className="mt-5 border-t pt-4 text-xs leading-6 text-muted-foreground">
                                        Promotion availability may differ
                                        from opening hours. Check the offer
                                        details before visiting.
                                    </p>
                                </CardContent>
                            </Card>
                        )}

                        {(business.website_url ||
                            business.contact_email) && (
                                <Card className="gap-4 rounded-2xl border-[#17233B]/10 shadow-none">
                                    <CardHeader>
                                        <CardTitle className="text-base">
                                            Get in touch
                                        </CardTitle>
                                    </CardHeader>

                                    <CardContent className="space-y-3">
                                        <p className="text-sm leading-7 text-muted-foreground">
                                            Contact the business for bookings
                                            and questions about your visit.
                                        </p>

                                        {business.website_url && (
                                            <Button
                                                render={
                                                    <a
                                                        href={
                                                            business.website_url
                                                        }
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                    />
                                                }
                                                nativeButton={false}
                                                variant="outline"
                                                size="sm"
                                                className="w-full justify-between"
                                            >
                                                <span className="inline-flex items-center gap-2">
                                                    <FiGlobe aria-hidden="true" />
                                                    Visit website
                                                </span>
                                                <FiArrowUpRight aria-hidden="true" />
                                            </Button>
                                        )}

                                        {business.contact_email && (
                                            <Button
                                                render={
                                                    <a
                                                        href={`mailto:${business.contact_email}`}
                                                    />
                                                }
                                                nativeButton={false}
                                                variant="outline"
                                                size="sm"
                                                className="w-full justify-start"
                                            >
                                                <FiMail aria-hidden="true" />
                                                Email business
                                            </Button>
                                        )}
                                    </CardContent>
                                </Card>
                            )}
                    </aside>
                </div>
            </div>
        </main>
    );
}

export default function BusinessPage({ params, searchParams }: BusinessPageProps) {
    return (
        <Suspense fallback={<LoadingState />}>
            <BusinessContent params={params} searchParams={searchParams} />
        </Suspense>
    );
}