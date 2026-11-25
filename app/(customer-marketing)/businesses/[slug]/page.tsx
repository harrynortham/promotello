import type { Metadata } from "next";
import { businessHasPro } from "@/lib/billing";
import { BusinessGallery } from "@/components/business-gallery";
import { photoUrl } from "@/lib/business-photos";
import { SocialLinks } from "@/components/social-links";
import { socialsOf } from "@/lib/social-links";
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { notFound, permanentRedirect } from "next/navigation";
import {
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
import { CoverBackLink, CoverExampleBadge } from "@/components/cover-badges";
import { ReadMore } from "@/components/read-more";
import { PreviewNotice } from "@/components/preview-notice";
import { FollowButton } from "@/components/follow-button";
import { MapEmbed } from "@/components/map-embed";
import { PageViewTracker } from "@/components/page-view-tracker";
import { EventCard, type EventSummary } from "@/components/event-card";
import { EVENTS_ENABLED } from "@/lib/features";
import { LoyaltyCallout } from "./loyalty-callout";
import { BusinessClosedNotice } from "./closed-notice";
import { OwnerBar, OwnerEdit } from "./owner-edit";
import { ScannedNote } from "./scanned-note";
import { ClaimPanel } from "./claim-panel";
import { BringAFriend } from "@/components/bring-a-friend";
import { worthIndexing } from "@/lib/indexing";
import { getLiveCities, getLiveCity } from "@/lib/cities";
import { RememberCity } from "@/components/remember-city";
import { businessPath, canonicalPath, offerPath } from "@/lib/slugs";
import { storedImage } from "@/lib/images";
import { BusinessesListing, businessesMetadata } from "../businesses-listing";

type BusinessPageProps = {
    params: Promise<{
        // A business's slug, or a live city's (/businesses/bristol).
        slug: string;
    }>;
    searchParams?: Promise<{ loyalty?: string; ended?: string }>;
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
    // /businesses/<city> is the directory for that city.
    const { slug } = await params;
    const city = await getLiveCity(slug);

    if (city) {
        return businessesMetadata(city);
    }

    const { data: business } = await createPublicClient()
        .from("businesses")
        .select(
            "id, slug, name, category, description, logo_url, is_sample, approval_status, business_locations ( city, region )",
        )
        .eq("slug", slug)
        .maybeSingle();

    if (!business) {
        // Its own team can preview a business before it's approved.
        const { data: own } = await (await createClient())
            .from("businesses")
            .select("name")
            .eq("slug", slug)
            .maybeSingle();
        return { title: own?.name ?? "Business not found", robots: { index: false } };
    }

    const location = Array.isArray(business.business_locations)
        ? business.business_locations[0]
        : business.business_locations;

    // "Harbour Grind, Clifton, Bristol": the area and city people search for.
    const where = [location?.region, location?.city]
        .filter((part, index, parts) => part && parts.indexOf(part) === index)
        .join(", ");
    const place = location?.city ? ` in ${location.city}` : "";

    // A page published before it was claimed has no offers and no card,
    // and cannot have: the title and the fallback description must not
    // promise either (20270307090000). Anything RLS hands an anonymous
    // visitor that is not approved is one of those pages.
    const unclaimed = business.approval_status !== "approved";

    const description = truncate(
        business.description ||
            (unclaimed
                ? `${business.name} is a ${business.category.toLowerCase()} business${place}, on ${siteName}. Is it yours? Claim the page free.`
                : `${business.name} is a ${business.category.toLowerCase()} business${place}. See their latest offers and opening hours on ${siteName}.`),
    );
    const path = businessPath(business);

    return {
        title: where
            ? unclaimed
                ? `${business.name}, ${where}`
                : `${business.name}, ${where}: offers and loyalty card`
            : business.name,
        description,
        alternates: { canonical: path },
        // Sample (demo) listings must never appear in search results.
        // Nor does a page we built that nobody has claimed: it works for
        // anyone we send the link to and it is not ours to advertise
        // (lib/indexing.ts). follow stays on, because the links off it
        // go to real pages.
        robots: business.is_sample
            ? { index: false, follow: false }
            : worthIndexing({ unclaimed })
                ? undefined
                : { index: false, follow: true },
        openGraph: {
            type: "website",
            url: path,
            title: business.name,
            description,
            // No images here: naming one overrides opengraph-image.tsx, and a
            // bare logo previews badly at 1200x630. The generated card shows
            // the name and the loyalty card instead.
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

    const { slug } = await params;
    const scanParams = await searchParams;
    const loyaltyStatus = scanParams?.loyalty;
    // Set by /q/<code> when the code's target has gone.
    const endedReason = scanParams?.ended;
    const supabase = await createClient();

    const { data: business, error: businessError } = await supabase
        .from("businesses")
        .select(
            `
                id,
                slug,
                name,
                closed_at,
                listed_at,
                review_requested_at,
                logo_url,
                cover_image_url,
                category,
                description,
                website_url,
                instagram_url,
                facebook_url,
                tiktok_url,
                x_url,
                youtube_url,
                linkedin_url,
                contact_email,
                approval_status,
                is_sample,
                business_locations (
                    name,
                    address_line_1,
                    address_line_2,
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
        // No approval filter: RLS only returns an unapproved business to its
        // own team (and platform admins), who see it as a preview.
        .eq("slug", slug)
        .maybeSingle();

    if (businessError) {
        throw new Error("We couldn’t load this business. Please try again.");
    }

    if (!business) {
        // An old address (the proxy usually redirects these first).
        const moved = await canonicalPath("business", slug);
        if (moved) permanentRedirect(moved);

        notFound();
    }

    // Closed: the row is still readable, so customers' cards and vouchers
    // keep naming the shop. Its own page says it has gone, because the
    // posters are still in the window.
    if (business.closed_at) {
        return <BusinessClosedNotice name={business.name} />;
    }

    const businessId = business.id;
    const { data: canEdit } = await supabase.rpc("is_business_member", {
        requested_business_id: businessId,
        minimum_role: "admin",
    });
    const dashboard = `/business/${businessId}`;

    // The photos the plan is showing. business_photos_public_select
    // already hides the paused ones, so this is the same list a
    // visitor would get.
    const { data: photoRows } = await supabase
        .from("business_photos")
        .select("id, storage_path, caption, sort_order")
        .eq("business_id", businessId)
        .is("plan_paused_at", null)
        .order("sort_order")
        .order("created_at");

    // The url is built here rather than in the browser, so the bucket
    // is named in one place.
    const photos = (photoRows ?? []).map((photo) => ({
        ...photo,
        url: photoUrl(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "", photo.storage_path),
    }));

    // A page we built and published before the business claimed it
    // (20270307090000). RLS hands an unapproved business to its own team
    // and to admins, who get the preview they have always had, and to
    // anyone at all once listed_at is set — and that visitor is not
    // previewing anything. They are looking at a real page for a real
    // shop that nobody has taken over yet.
    const isUnclaimed =
        business.listed_at !== null && business.approval_status === "pending" && !canEdit;

    const isPreview = business.approval_status !== "approved" && !isUnclaimed;
    const today = new Date().toISOString().slice(0, 10);

    // The card on offer. Cards closed to new joiners are still being
    // stamped for the people holding them, but they aren't offered to
    // anyone else, so they don't belong on this page.
    const [{ data: loyaltyPrograms }, { data: { user: viewer } }] = await Promise.all([
        supabase
            .from("loyalty_programs")
            .select("id, name, stamps_required, reward, terms, card_colour, card_header, card_accent, stamp_icon")
            .eq("business_id", businessId)
            .eq("is_active", true)
            .is("closed_at", null)
            .order("created_at", { ascending: true }),
        supabase.auth.getUser(),
    ]);

    const loyaltyCards = loyaltyPrograms ?? [];

    // A card on a Free business takes nobody new
    // (20270120090000_a_card_on_free_takes_no_new_members.sql). The card
    // is still shown and said to be closed rather than hidden: a poster
    // in a window points straight at it, and the QR page promises the
    // business that "nobody hits a dead end: a scan lands on your
    // business page instead". Hiding it made that a lie.
    const cardClosedToNewMembers =
        loyaltyCards.length > 0 && !(await businessHasPro(supabase, businessId).catch(() => true));

    const { data: eventRows } = !EVENTS_ENABLED
        ? { data: [] }
        : await supabase
        .from("business_events")
        .select("id, title, description, starts_at, ends_at, location, price")
        .eq("business_id", businessId)
        .gte("starts_at", startOfToday())
        .order("starts_at", { ascending: true })
        .limit(6);
    const events = (eventRows ?? []) as EventSummary[];

    // Bring a friend, when the business is running it. Not for its own
    // team: a poster behind the counter referring itself is the one
    // thing this must never pay for.
    // Through a function rather than the table: business_automations is
    // the business's own settings and is readable by its team alone, so
    // a customer reading it directly gets nothing (20270314090000).
    const { data: friendReward } = isUnclaimed || canEdit
        ? { data: null }
        : await supabase.rpc("friend_reward", { requested_business_id: businessId });

    const { data: follow } = viewer
        ? await supabase
            .from("business_followers")
            .select("business_id")
            .eq("business_id", businessId)
            .eq("user_id", viewer.id)
            .maybeSingle()
        : { data: null };

    const { data: joined } =
        loyaltyCards.length > 0 && viewer
            ? await supabase
                .from("loyalty_cards")
                .select("program_id, stamps")
                .in("program_id", loyaltyCards.map((card) => card.id))
                .eq("user_id", viewer.id)
            : { data: null };

    const progress = new Map((joined ?? []).map((card) => [card.program_id as string, card]));

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
        // A preview also shows offers still waiting for approval.
        .in("approval_status", isPreview ? ["approved", "pending"] : ["approved"])
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

    // Seven identical rows say less than one line does. Only collapsed when
    // every day of the week is there, open, and shares the same hours.
    const sameEveryDay = (() => {
        if (hours.length !== 7 || hours.some((day) => day.is_closed || !day.opens_at || !day.closes_at)) {
            return null;
        }

        const first = `${formatTime(hours[0].opens_at!)} – ${formatTime(hours[0].closes_at!)}`;
        const allMatch = hours.every(
            (day) => `${formatTime(day.opens_at!)} – ${formatTime(day.closes_at!)}` === first,
        );

        return allMatch ? first : null;
    })();

    const addressLines = addressParts(location);
    const fullAddress = addressLines.join(", ");
    const directionsUrl = directionsUrlFor(addressLines);

    const mapUrl = fullAddress
        ? `https://www.google.com/maps?q=${encodeURIComponent(
            fullAddress,
        )}&output=embed`
        : null;

    const promotionCount = offers?.length ?? 0;

    // The business's own cover photo, or else its newest offer photo.
    const coverImageUrl = storedImage(
        business.cover_image_url ?? offers?.find((offer) => offer.image_url)?.image_url,
    );
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

    const pageUrl = absoluteUrl(businessPath(business));
    const cityPage = (await getLiveCities()).find((city) => city.name === location?.city) ?? null;
    const directoryPath = cityPage ? `/businesses/${cityPage.slug}` : "/businesses";

    // Businesses › Bristol › Harbour Grind, shown in search results.
    const breadcrumbs = {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [
            { name: "Businesses", item: absoluteUrl("/businesses") },
            ...(cityPage ? [{ name: cityPage.name, item: absoluteUrl(directoryPath) }] : []),
            { name: business.name, item: pageUrl },
        ].map((crumb, index) => ({ "@type": "ListItem", position: index + 1, ...crumb })),
    };

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
        // sameAs is the schema.org field for "the same thing, over
        // there", which is what these are. Google uses it to tie a
        // listing to the profiles it already knows about.
        sameAs: [
            ...(business.website_url ? [business.website_url] : []),
            ...socialsOf(business).map((entry) => entry.url),
        ].length
            ? [
                  ...(business.website_url ? [business.website_url] : []),
                  ...socialsOf(business).map((entry) => entry.url),
              ]
            : undefined,
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
            url: absoluteUrl(offerPath(offer)),
            validThrough: offer.expires_at,
        })),
    };

    return (
        <main className="min-h-screen bg-[#FFF8F0] px-6 py-8 text-[#17233B] sm:px-10 sm:py-10">
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: jsonLd(structuredData) }}
            />
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: jsonLd(breadcrumbs) }}
            />
            <PageViewTracker businessId={business.id} />

            <div className="mx-auto max-w-6xl">
                {canEdit && (
                    <OwnerBar
                        businessId={businessId}
                        privacy={
                            isPreview
                                ? business.review_requested_at
                                    ? "waiting"
                                    : "unsent"
                                : undefined
                        }
                    />
                )}

                {/* The bar says it for an owner; this is for anyone else on
                    the team who can see the page but can't change it. */}
                {isPreview && !canEdit && <PreviewNotice what="business" />}

                {endedReason && <ScannedNote reason={endedReason} businessName={business.name} />}

                {/* Business identity */}
                <section
                    aria-labelledby="business-name"
                    className="overflow-hidden rounded-2xl border border-[#17233B]/10 bg-white shadow-sm"
                >
                    <div
                        className={`relative overflow-hidden bg-[#17233B] ${coverImageUrl ? "h-44 sm:h-64" : "h-24 sm:h-28"}`}
                    >
                        {!canEdit && (
                            <CoverBackLink
                                href={directoryPath}
                                label={cityPage ? cityPage.name : "All businesses"}
                                city={cityPage ? cityPage.name : "your area"}
                            />
                        )}

                        {business.is_sample && <CoverExampleBadge />}

                        {canEdit && (
                            <OwnerEdit
                                href={`${dashboard}/cover`}
                                label="Edit your cover photo"
                                className="absolute right-4 top-4 z-10"
                            />
                        )}

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
                                <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-[#17233B]/50 to-transparent" />
                            </>
                        ) : (
                            <div aria-hidden="true">
                                <div className="absolute -right-8 -top-24 size-64 rounded-full border-[32px] border-white/5" />
                                <div className="absolute right-44 top-12 size-32 rounded-full bg-[#FF593F]/20" />
                            </div>
                        )}

                    </div>

                    <div className="px-6 pb-7 sm:px-8">
                        <div className="relative -mt-10 flex items-end justify-between gap-4">
                            <div className="flex items-end gap-3">
                            <div className="flex size-24 shrink-0 items-center justify-center overflow-hidden rounded-2xl border-4 border-white bg-white shadow-sm sm:size-28">
                                {storedImage(business.logo_url) ? (
                                    <Image
                                        src={storedImage(business.logo_url)!}
                                        alt={`${business.name} logo`}
                                        width={112}
                                        height={112}
                                        className="h-full w-full rounded-xl object-cover"
                                    />
                                ) : (
                                    <span className="flex h-full w-full items-center justify-center bg-[#FFF4E8] text-3xl font-semibold">
                                        {initials}
                                    </span>
                                )}
                            </div>

                                {canEdit && (
                                    <OwnerEdit
                                        href={`${dashboard}/logo`}
                                        label="Edit your logo"
                                        className="mb-1"
                                    />
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
                                                ? "offer"
                                                : "offers"}
                                        </span>
                                    )}
                                </div>

                                {business.description && (
                                    <ReadMore
                                        text={business.description}
                                        className="mt-3 max-w-prose text-[15px] leading-relaxed text-[#17233B]/75"
                                    />
                                )}
                            </div>

                            <div className="flex shrink-0 flex-wrap gap-2">
                                {isUnclaimed ? (
                                    <Button render={<Link href="#claim" />} nativeButton={false}>
                                        Claim your free page
                                    </Button>
                                ) : (
                                    <Button render={<Link href="#offers" />} nativeButton={false}>
                                        View offers
                                    </Button>
                                )}

                                {!isPreview && !isUnclaimed && (
                                    <FollowButton
                                        businessId={business.id}
                                        initialFollowing={Boolean(follow)}
                                        isSignedIn={Boolean(viewer)}
                                    />
                                )}

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

                                {canEdit && (
                                    <OwnerEdit
                                        href={`${dashboard}/edit`}
                                        label="Edit your name, description and category"
                                    />
                                )}
                            </div>
                        </div>
                    </div>
                </section>

                <div className="mt-6 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
                    {/* Main profile content */}
                    <div className="min-w-0 space-y-8">
                        {canEdit && loyaltyCards.length > 0 && (
                            <div className="flex justify-end">
                                <OwnerEdit href={`${dashboard}/loyalty`} label="Edit your loyalty card" />
                            </div>
                        )}

                        {loyaltyCards.map((program) => (
                            <LoyaltyCallout
                                key={program.id}
                                businessId={business.id}
                                businessName={business.name}
                                returnPath={businessPath(business)}
                                program={program}
                                card={progress.get(program.id) ?? null}
                                isSignedIn={Boolean(viewer)}
                                problem={loyaltyStatus}
                                preview={isPreview}
                                closedToNewMembers={cardClosedToNewMembers}
                            />
                        ))}

                        {friendReward && (
                            <BringAFriend
                                businessId={business.id}
                                businessName={business.name}
                                reward={friendReward}
                                isSignedIn={Boolean(viewer)}
                            />
                        )}

                        {events.length > 0 && (
                            <section id="events" aria-labelledby="events-heading">
                                <div className="flex items-start justify-between gap-4">
                                    <h2 id="events-heading" className="text-2xl font-semibold tracking-tight">
                                        Coming up
                                    </h2>

                                    {canEdit && <OwnerEdit href={`${dashboard}/events`} label="Edit your events" />}
                                </div>
                                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                                    {events.map((event) => (
                                        <EventCard key={event.id} event={event} />
                                    ))}
                                </div>
                            </section>
                        )}

                        {isUnclaimed && (
                            <ClaimPanel businessId={business.id} businessName={business.name} />
                        )}

                        {!isUnclaimed && (
                        <section
                            id="offers"
                            aria-labelledby="offers-heading"
                            className="scroll-mt-28"
                        >
                            {/* No count beside the heading: the offers are
                                directly below and countable. */}
                            <div className="mb-5 flex items-start justify-between gap-4">
                                <div>
                                <h2
                                    id="offers-heading"
                                    className="text-2xl font-semibold tracking-tight"
                                >
                                    Current offers
                                </h2>

                                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                                    Explore what’s on offer at {business.name}.
                                </p>
                                </div>

                                {canEdit && <OwnerEdit href={`${dashboard}/offers`} label="Edit your offers" />}
                            </div>

                            {offersError ? (
                                <Alert variant="destructive">
                                    <AlertTitle>
                                        Offers couldn’t be loaded
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
                                            example={business.is_sample}
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
                                            Check back for new offers
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
                        )}

                        {/* The room, the counter, what they make.
                            Below the offers, because the offers are
                            why somebody opened the page and these are
                            what make them go. Nothing at all when
                            there are none — a heading over an empty
                            space reads as something broken. */}
                        {photos.length > 0 && (
                            <section aria-labelledby="photos-heading" className="mt-10">
                                <div className="mb-5 flex items-start justify-between gap-4">
                                    <h2
                                        id="photos-heading"
                                        className="text-2xl font-semibold tracking-tight"
                                    >
                                        Inside {business.name}
                                    </h2>

                                    {canEdit && (
                                        <OwnerEdit href={`${dashboard}/photos`} label="Edit your photos" />
                                    )}
                                </div>

                                <BusinessGallery photos={photos} businessName={business.name} />
                            </section>
                        )}
                    </div>

                    {/* Visiting information */}
                    <aside
                        aria-label="Business visiting information"
                        className="space-y-5"
                    >
                        <Card className="gap-0 overflow-hidden rounded-2xl border-[#17233B]/10 pb-0 shadow-none">
                            <CardHeader className="pb-5">
                                <CardTitle className="flex items-center justify-between gap-3 text-base">
                                    <span className="flex items-center gap-2">
                                        <FiMapPin
                                            aria-hidden="true"
                                            className="size-4 text-muted-foreground"
                                        />
                                        Find us
                                    </span>

                                    {canEdit && <OwnerEdit href={`${dashboard}/address`} label="Edit your address" />}
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
                            {hours.length > 0 && (
                                <section
                                    aria-labelledby="opening-hours"
                                    className="border-t border-[#17233B]/10 px-(--card-spacing) py-(--card-spacing)"
                                >
                                    <h3
                                        id="opening-hours"
                                        className="flex items-center justify-between gap-3 text-base font-semibold"
                                    >
                                        <span className="flex items-center gap-2">
                                            <FiClock
                                                aria-hidden="true"
                                                className="size-4 text-muted-foreground"
                                            />
                                            Opening hours
                                        </span>

                                        {canEdit && (
                                            <OwnerEdit
                                                href={`${dashboard}/hours`}
                                                label="Edit your opening hours"
                                            />
                                        )}
                                    </h3>

                                    <div className="mt-4">
                                    {sameEveryDay ? (
                                        <p className="text-sm font-medium tabular-nums">
                                            Open daily · {sameEveryDay}
                                        </p>
                                    ) : (
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
                                    )}

                                    <p className="mt-5 border-t pt-4 text-xs leading-6 text-muted-foreground">
                                        Offer availability may differ
                                        from opening hours. Check the offer
                                        details before visiting.
                                    </p>
                                    </div>
                                </section>
                            )}
                        </Card>

                        {/* Where else to find them. Its own card
                            rather than a row inside "Get in touch":
                            that card is for reaching the business, and
                            this is for seeing what they are like before
                            you do. */}
                        {socialsOf(business).length > 0 && (
                            <Card className="gap-4 rounded-2xl border-[#17233B]/10 shadow-none">
                                <CardHeader>
                                    <CardTitle className="text-base">Follow {business.name}</CardTitle>
                                </CardHeader>

                                <CardContent>
                                    <SocialLinks business={business} businessName={business.name} />
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

// Either one business, or (when the id is a live city, e.g.
// /businesses/bristol) the directory for that city.
async function BusinessOrCityListing({ params, searchParams }: BusinessPageProps) {
    const city = await getLiveCity((await params).slug);

    if (city) {
        return (
            <>
                <RememberCity slug={city.slug} />
                <BusinessesListing
                    city={city}
                    searchParams={(searchParams ?? Promise.resolve({})) as Promise<Record<string, string>>}
                />
            </>
        );
    }

    return <BusinessContent params={params} searchParams={searchParams} />;
}

export default function BusinessPage({ params, searchParams }: BusinessPageProps) {
    return (
        <Suspense fallback={<LoadingState />}>
            <BusinessOrCityListing params={params} searchParams={searchParams} />
        </Suspense>
    );
}