"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
    FiArrowRight,
    FiGift,
    FiMapPin,
    FiSearch,
} from "react-icons/fi";

import {
    Alert,
    AlertDescription,
    AlertTitle,
} from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { createClient } from "@/utils/supabase/client";

type PromotionPreview = {
    title: string;
    discount: string;
};

type Business = {
    id: string;
    name: string;
    category: string | null;
    description: string | null;
    logoUrl: string | null;
    coverUrl: string | null;
    city: string | null;
    activeOffers: number;
    promotion: PromotionPreview | null;
};

function getInitials(name: string) {
    return (
        name
            .trim()
            .split(/\s+/)
            .slice(0, 2)
            .map((part) => part.charAt(0))
            .join("")
            .toUpperCase() || "B"
    );
}

function getCategoryStyle(category: string | null) {
    switch (category?.toLowerCase()) {
        case "food & drink":
            return {
                background: "bg-[#F4E7D8]",
                circle: "bg-[#E9CBA8]",
                text: "text-[#795638]",
            };

        case "things to do":
            return {
                background: "bg-[#E4E5F5]",
                circle: "bg-[#CBCDED]",
                text: "text-[#575987]",
            };

        case "shopping":
            return {
                background: "bg-[#F3E3E8]",
                circle: "bg-[#E8C4D1]",
                text: "text-[#86556A]",
            };

        case "health & beauty":
            return {
                background: "bg-[#E4EDE4]",
                circle: "bg-[#C6DCC8]",
                text: "text-[#4B6E50]",
            };

        default:
            return {
                background: "bg-[#E5EAF0]",
                circle: "bg-[#CAD5E2]",
                text: "text-[#536A84]",
            };
    }
}

function BusinessDirectoryCard({
    business,
}: {
    business: Business;
}) {
    const [failedCover, setFailedCover] = useState<string | null>(null);
    const [failedLogo, setFailedLogo] = useState<string | null>(null);

    const href = `/businesses/${business.id}`;
    const theme = getCategoryStyle(business.category);

    const showCover =
        Boolean(business.coverUrl) &&
        failedCover !== business.coverUrl;

    const showLogo =
        Boolean(business.logoUrl) &&
        failedLogo !== business.logoUrl;

    return (
        <Card className="group flex h-full flex-col gap-0 overflow-hidden rounded-3xl border-[#17233B]/10 bg-white py-0 shadow-sm transition-shadow duration-300 hover:shadow-xl">
            {/* Cover uses a real promotion image when available. */}
            <Link
                href={href}
                aria-label={`Discover ${business.name}`}
                className={`relative block aspect-[16/10] overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring ${theme.background}`}
            >
                {showCover && business.coverUrl ? (
                    <>
                        <Image
                            src={business.coverUrl}
                            alt=""
                            fill
                            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                            className="object-cover transition-transform duration-500 motion-safe:group-hover:scale-105"
                            onError={() =>
                                setFailedCover(business.coverUrl)
                            }
                        />

                        <div
                            aria-hidden="true"
                            className="absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-black/10"
                        />
                    </>
                ) : (
                    <div
                        aria-hidden="true"
                        className="absolute inset-0 flex items-center justify-center"
                    >
                        <div
                            className={`absolute -right-10 -top-16 size-56 rounded-full ${theme.circle} opacity-60`}
                        />

                        <div className="absolute -bottom-24 -left-12 size-64 rounded-full border-[32px] border-white/35" />

                        <span
                            className={`relative text-7xl font-semibold tracking-tighter ${theme.text} opacity-50`}
                        >
                            {getInitials(business.name)}
                        </span>
                    </div>
                )}

                {business.activeOffers > 0 && (
                    <span className="absolute right-4 top-4 inline-flex items-center gap-2 rounded-full bg-white px-3 py-2 text-xs font-semibold text-[#17233B] shadow-sm">
                        <FiGift
                            aria-hidden="true"
                            className="size-3.5 text-[#FF593F]"
                        />
                        {business.activeOffers}{" "}
                        {business.activeOffers === 1
                            ? "deal to discover"
                            : "deals to discover"}
                    </span>
                )}
            </Link>

            <CardContent className="relative flex flex-1 flex-col px-5 pb-5 sm:px-6 sm:pb-6">
                {/* Separate logo keeps the business recognisable. */}
                <div className="relative -mt-9 mb-5 flex items-end justify-between gap-3">
                    <Link
                        href={href}
                        aria-label={`${business.name} profile`}
                        className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border-4 border-white bg-white shadow-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
                    >
                        {showLogo && business.logoUrl ? (
                            <Image
                                src={business.logoUrl}
                                alt={`${business.name} logo`}
                                width={80}
                                height={80}
                                className="h-full w-full object-contain p-1.5"
                                onError={() =>
                                    setFailedLogo(business.logoUrl)
                                }
                            />
                        ) : (
                            <span className="flex h-full w-full items-center justify-center bg-[#17233B] text-xl font-semibold text-white">
                                {getInitials(business.name)}
                            </span>
                        )}
                    </Link>

                    {business.category && (
                        <Badge
                            variant="secondary"
                            className="mb-1 max-w-[65%] whitespace-normal text-right"
                        >
                            {business.category}
                        </Badge>
                    )}
                </div>

                <div>
                    <h2 className="text-2xl font-semibold leading-tight tracking-tight text-[#17233B]">
                        <Link
                            href={href}
                            className="rounded-sm underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
                        >
                            {business.name}
                        </Link>
                    </h2>

                    {business.city && (
                        <p className="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground">
                            <FiMapPin
                                aria-hidden="true"
                                className="size-3.5 shrink-0"
                            />
                            <span>{business.city}</span>
                        </p>
                    )}

                    <p className="mt-4 line-clamp-2 min-h-12 text-sm leading-6 text-muted-foreground">
                        {business.description ||
                            "Get to know this local business and see what’s waiting to be discovered."}
                    </p>
                </div>

                {/* A real offer gives customers a specific reason to click. */}
                <div className="mt-5 flex-1">
                    {business.promotion ? (
                        <div className="rounded-2xl border border-[#FF593F]/15 bg-[#FFF8F0] p-4">
                            <p className="flex items-center gap-2 text-xs font-medium text-[#17233B]/65">
                                <FiGift
                                    aria-hidden="true"
                                    className="size-4 text-[#FF593F]"
                                />
                                A reason to visit
                            </p>

                            <p className="mt-2 line-clamp-1 text-base font-semibold text-[#17233B]">
                                {business.promotion.discount}
                            </p>

                            <p className="mt-1 line-clamp-2 text-sm leading-6 text-[#17233B]/65">
                                {business.promotion.title}
                            </p>
                        </div>
                    ) : (
                        <div className="rounded-2xl border border-dashed bg-muted/20 p-4">
                            <p className="text-sm font-medium">
                                Get to know this business
                            </p>

                            <p className="mt-1 text-sm leading-6 text-muted-foreground">
                                Explore its story, location, and visiting
                                information.
                            </p>
                        </div>
                    )}
                </div>

                <div className="mt-5 border-t pt-5">
                    <Button
                        render={<Link href={href} />}
                        nativeButton={false}
                        variant={
                            business.activeOffers > 0
                                ? "default"
                                : "outline"
                        }
                        className="w-full justify-between"
                    >
                        {business.activeOffers > 0
                            ? "Discover the deals"
                            : "Explore business"}
                        <FiArrowRight aria-hidden="true" />
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}

function LoadingState() {
    return (
        <div
            role="status"
            aria-label="Loading businesses"
            className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
        >
            {[1, 2, 3, 4, 5, 6].map((item) => (
                <Card
                    key={item}
                    className="gap-0 overflow-hidden rounded-3xl py-0"
                >
                    <Skeleton className="aspect-[16/10] w-full rounded-none" />

                    <CardContent className="relative space-y-4 p-6">
                        <Skeleton className="-mt-14 size-20 rounded-2xl border-4 border-white" />
                        <Skeleton className="h-7 w-3/4" />
                        <Skeleton className="h-4 w-1/3" />
                        <Skeleton className="h-12 w-full" />
                        <Skeleton className="h-28 w-full rounded-2xl" />
                        <Skeleton className="h-10 w-full" />
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}

export default function BusinessesPage() {
    const [businesses, setBusinesses] = useState<Business[]>([]);
    const [search, setSearch] = useState("");
    const [isLoading, setIsLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState("");

    useEffect(() => {
        let isMounted = true;

        async function loadBusinesses() {
            try {
                const supabase = createClient();

                const {
                    data: businessRows,
                    error: businessError,
                } = await supabase
                    .from("businesses")
                    .select(
                        `
                            id,
                            name,
                            category,
                            description,
                            logo_url
                        `,
                    )
                    .eq("approval_status", "approved")
                    .order("name", { ascending: true });

                if (businessError) throw businessError;

                const businessIds = (businessRows ?? []).map(
                    (business) => business.id,
                );

                if (businessIds.length === 0) {
                    if (isMounted) setBusinesses([]);
                    return;
                }

                const [locationResult, offerResult] = await Promise.all([
                    supabase
                        .from("business_locations")
                        .select("business_id, city")
                        .in("business_id", businessIds)
                        .order("id", { ascending: true }),

                    supabase
                        .from("offers")
                        .select(
                            `
                                business_id,
                                title,
                                discount,
                                image_url,
                                max_redemptions,
                                redemption_count
                            `,
                        )
                        .in("business_id", businessIds)
                        .eq("approval_status", "approved")
                        .gte(
                            "expires_at",
                            new Date().toISOString().slice(0, 10),
                        )
                        .order("created_at", { ascending: false }),
                ]);

                if (locationResult.error) throw locationResult.error;
                if (offerResult.error) throw offerResult.error;

                const cities = new Map<string, string>();
                const offerCounts = new Map<string, number>();
                const coverImages = new Map<string, string>();
                const promotionPreviews = new Map<
                    string,
                    PromotionPreview
                >();

                for (const location of locationResult.data ?? []) {
                    if (
                        location.city &&
                        !cities.has(location.business_id)
                    ) {
                        cities.set(location.business_id, location.city);
                    }
                }

                for (const offer of offerResult.data ?? []) {
                    // Approved promotion photos can illustrate the business,
                    // even when that particular promotion is fully claimed.
                    if (
                        offer.image_url &&
                        !coverImages.has(offer.business_id)
                    ) {
                        coverImages.set(
                            offer.business_id,
                            offer.image_url,
                        );
                    }

                    const hasAvailability =
                        offer.max_redemptions === null ||
                        (offer.redemption_count ?? 0) <
                        offer.max_redemptions;

                    if (!hasAvailability) continue;

                    offerCounts.set(
                        offer.business_id,
                        (offerCounts.get(offer.business_id) ?? 0) + 1,
                    );

                    if (!promotionPreviews.has(offer.business_id)) {
                        promotionPreviews.set(offer.business_id, {
                            title: offer.title,
                            discount: offer.discount,
                        });
                    }
                }

                const formattedBusinesses: Business[] = (
                    businessRows ?? []
                ).map((business) => ({
                    id: business.id,
                    name: business.name,
                    category: business.category,
                    description: business.description,
                    logoUrl: business.logo_url,
                    coverUrl: coverImages.get(business.id) ?? null,
                    city: cities.get(business.id) ?? null,
                    activeOffers: offerCounts.get(business.id) ?? 0,
                    promotion:
                        promotionPreviews.get(business.id) ?? null,
                }));

                if (isMounted) {
                    setBusinesses(formattedBusinesses);
                }
            } catch (error) {
                console.error("Unable to load businesses", error);

                if (isMounted) {
                    setErrorMessage(
                        "We couldn’t load businesses right now. Please refresh the page and try again.",
                    );
                }
            } finally {
                if (isMounted) {
                    setIsLoading(false);
                }
            }
        }

        void loadBusinesses();

        return () => {
            isMounted = false;
        };
    }, []);

    const filteredBusinesses = useMemo(() => {
        const query = search.trim().toLowerCase();

        if (!query) return businesses;

        return businesses.filter((business) =>
            [
                business.name,
                business.category,
                business.city,
                business.description,
            ].some((value) => value?.toLowerCase().includes(query)),
        );
    }, [businesses, search]);

    return (
        <main className="min-h-screen bg-[#FFF8F0] px-6 py-12 text-[#17233B] sm:px-10">
            <div className="mx-auto max-w-7xl">
                <section className="mx-auto max-w-3xl text-center">
                    <Badge variant="secondary">
                        Meet your next local favourite
                    </Badge>

                    <h1 className="mt-5 text-4xl font-semibold tracking-tight sm:text-5xl">
                        Somewhere new.
                        <br />
                        Something to look forward to.
                    </h1>

                    <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-muted-foreground">
                        Discover the businesses around you, get a taste of
                        what they offer, and find your next reason to visit.
                    </p>

                    <div className="relative mx-auto mt-8 max-w-xl">
                        <Label
                            htmlFor="business-search"
                            className="sr-only"
                        >
                            Search businesses, categories, or locations
                        </Label>

                        <FiSearch
                            aria-hidden="true"
                            className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground"
                        />

                        <Input
                            id="business-search"
                            type="search"
                            value={search}
                            onChange={(event) =>
                                setSearch(event.target.value)
                            }
                            placeholder="Try a business, category, or town…"
                            className="h-12 bg-white pl-12"
                        />
                    </div>
                </section>

                {errorMessage ? (
                    <Alert variant="destructive" className="mt-10">
                        <AlertTitle>
                            Unable to load businesses
                        </AlertTitle>

                        <AlertDescription>
                            {errorMessage}
                        </AlertDescription>
                    </Alert>
                ) : isLoading ? (
                    <div className="mt-12">
                        <LoadingState />
                    </div>
                ) : (
                    <section className="mt-12">
                        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                            <h2 className="text-xl font-semibold tracking-tight">
                                {search.trim()
                                    ? "Your discoveries"
                                    : "Find a place worth knowing"}
                            </h2>

                            <p
                                role="status"
                                className="text-sm text-muted-foreground"
                            >
                                {filteredBusinesses.length}{" "}
                                {filteredBusinesses.length === 1
                                    ? "business"
                                    : "businesses"}
                                {search.trim() ? " found" : " to explore"}
                            </p>
                        </div>

                        {filteredBusinesses.length === 0 ? (
                            <Card className="rounded-3xl border-dashed shadow-none">
                                <CardContent className="px-6 py-12 text-center">
                                    <h3 className="text-xl font-semibold">
                                        {search.trim()
                                            ? "No matches just yet."
                                            : "New discoveries are on the way."}
                                    </h3>

                                    <p className="mx-auto mt-3 max-w-md text-sm leading-7 text-muted-foreground">
                                        {search.trim()
                                            ? "Try a different business name, category, or town."
                                            : "Check back soon as more businesses join Promotello."}
                                    </p>

                                    {search.trim() && (
                                        <Button
                                            type="button"
                                            variant="outline"
                                            className="mt-6"
                                            onClick={() => setSearch("")}
                                        >
                                            Clear search
                                        </Button>
                                    )}
                                </CardContent>
                            </Card>
                        ) : (
                            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                                {filteredBusinesses.map((business) => (
                                    <BusinessDirectoryCard
                                        key={business.id}
                                        business={business}
                                    />
                                ))}
                            </div>
                        )}
                    </section>
                )}
            </div>
        </main>
    );
}