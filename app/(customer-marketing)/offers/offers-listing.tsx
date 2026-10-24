import { Suspense } from "react";
import type { Metadata } from "next";
import { connection } from "next/server";

import {
    EmptyState,
    FilterChip,
    SearchForm,
    hrefWith,
} from "@/components/listing-ui";
import { OfferCard } from "@/components/offer-card";
import { Skeleton } from "@/components/ui/skeleton";
import { LocationSearch } from "@/components/location-search";
import { topLevelFor } from "@/lib/categories";
import { getLiveCities, placeName, type City } from "@/lib/cities";
import {
    areasFrom,
    filterOffers,
    getCategories,
    getLiveOffers,
    parseOfferSort,
} from "@/lib/listings";

// The offers listing, for every live city (/offers) or one (/offers/bristol).

export async function offersMetadata(city: City | null): Promise<Metadata> {
    const place = await placeName(city);

    return {
        title: `Offers in ${place}`,
        description: `Browse every live offer from independent cafés, restaurants, shops, salons and stays across ${place}.`,
        alternates: { canonical: city ? `/offers/${city.slug}` : "/offers" },
    };
}

type SearchParams = {
    search?: string;
    category?: string;
    area?: string;
    sort?: string;
};

type ListingProps = {
    city: City | null;
    searchParams: Promise<SearchParams>;
};

const sortOptions = [
    { value: "newest", label: "Newest" },
    { value: "ending-soon", label: "Ending soon" },
    { value: "popular", label: "Most popular" },
] as const;

function ResultsLoading() {
    return (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((item) => (
                <Skeleton key={item} className="aspect-[3/4] rounded-2xl" />
            ))}
        </div>
    );
}

async function OffersCatalogue({ city, searchParams }: ListingProps) {
    await connection();

    const base = city ? `/offers/${city.slug}` : "/offers";
    const params = await searchParams;
    const [groups, offers, place] = await Promise.all([getCategories(), getLiveOffers(city?.id), placeName(city)]);
    const sort = parseOfferSort(params.sort);

    const results = filterOffers(offers, groups, {
        category: params.category,
        area: params.area,
        search: params.search,
        sort,
    });

    // The selected top-level category, or the parent of a selected subcategory.
    const selectedGroup =
        groups.find((group) => group.slug === params.category) ??
        groups.find((group) =>
            group.subcategories.some((sub) => sub.slug === params.category),
        ) ??
        null;

    const areas = areasFrom(
        offers
            .filter((offer) => !params.category || topLevelFor(offer.categoryId, groups)?.slug === selectedGroup?.slug)
            .map((offer) => ({ area: offer.business.area })),
    );

    const current = { ...params };
    const hasFilters = Boolean(params.search || params.category || params.area);

    return (
        <>
            <div className="mt-8 space-y-4">
                <div className="-mx-6 flex gap-2 overflow-x-auto px-6 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
                    <FilterChip
                        href={hrefWith(base, current, { category: null })}
                        active={!params.category}
                    >
                        All offers
                    </FilterChip>

                    {groups.map((group) => (
                        <FilterChip
                            key={group.id}
                            href={hrefWith(base, current, { category: group.slug, area: null })}
                            active={selectedGroup?.slug === group.slug}
                        >
                            {group.name}
                        </FilterChip>
                    ))}
                </div>

                {selectedGroup && selectedGroup.subcategories.length > 0 && (
                    <div className="-mx-6 flex gap-2 overflow-x-auto px-6 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
                        <FilterChip
                            href={hrefWith(base, current, { category: selectedGroup.slug })}
                            active={params.category === selectedGroup.slug}
                        >
                            All {selectedGroup.name.toLowerCase()}
                        </FilterChip>

                        {selectedGroup.subcategories.map((sub) => (
                            <FilterChip
                                key={sub.id}
                                href={hrefWith(base, current, { category: sub.slug })}
                                active={params.category === sub.slug}
                            >
                                {sub.name}
                            </FilterChip>
                        ))}
                    </div>
                )}

                {areas.length > 1 && (
                    <div className="-mx-6 flex items-center gap-2 overflow-x-auto px-6 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
                        <span className="shrink-0 text-sm font-medium text-[#17233B]/55">Area:</span>

                        <FilterChip
                            href={hrefWith(base, current, { area: null })}
                            active={!params.area}
                        >
                            All {place}
                        </FilterChip>

                        {areas.map((area) => (
                            <FilterChip
                                key={area.name}
                                href={hrefWith(base, current, { area: area.name })}
                                active={params.area === area.name}
                            >
                                {area.name}
                            </FilterChip>
                        ))}
                    </div>
                )}
            </div>

            <div className="mt-8 flex flex-col gap-3 border-t border-[#17233B]/10 pt-6 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-[#17233B]/65">
                    <span className="font-semibold text-[#17233B]">{results.length}</span>{" "}
                    {results.length === 1 ? "offer" : "offers"}
                    {params.search && <> matching &ldquo;{params.search}&rdquo;</>}
                </p>

                <div className="-mx-6 flex items-center gap-2 overflow-x-auto px-6 pb-1 sm:mx-0 sm:px-0 sm:pb-0">
                    <span className="shrink-0 text-sm text-[#17233B]/55">Sort:</span>
                    {sortOptions.map((option) => (
                        <FilterChip
                            key={option.value}
                            href={hrefWith(base, current, {
                                sort: option.value === "newest" ? null : option.value,
                            })}
                            active={sort === option.value}
                        >
                            {option.label}
                        </FilterChip>
                    ))}
                </div>
            </div>

            <div className="mt-6">
                {results.length === 0 ? (
                    <EmptyState
                        title="No offers match"
                        description={
                            hasFilters
                                ? "Try a different search, category or area."
                                : "New offers are on their way. Check back soon."
                        }
                        href={hasFilters ? base : undefined}
                    />
                ) : (
                    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                        {results.map((offer) => (
                            <OfferCard
                                key={offer.id}
                                slug={offer.slug}
                                discount={offer.discount}
                                title={offer.title}
                                description={offer.description}
                                availability={offer.availability}
                                business={offer.business.name}
                                businessLogoUrl={offer.business.logoUrl}
                                imageUrl={offer.imageUrl}
                                expiresAt={offer.expiresAt}
                                area={offer.business.area}
                                category={offer.categoryName}
                            />
                        ))}
                    </div>
                )}
            </div>
        </>
    );
}

async function OffersSearch({ city, searchParams }: ListingProps) {
    const params = await searchParams;

    return (
        <SearchForm
            action={city ? `/offers/${city.slug}` : "/offers"}
            defaultValue={params.search}
            placeholder="Search offers, businesses or areas"
            hidden={{ category: params.category, area: params.area, sort: params.sort }}
            size="lg"
        />
    );
}

export async function OffersListing({ city, searchParams }: ListingProps) {
    const [place, places] = await Promise.all([placeName(city), getLiveCities()]);

    return (
        <main className="min-h-screen bg-[#FFF8F0] pb-24 text-[#17233B]">
            <section className="border-b border-[#17233B]/10 bg-white">
                <div className="mx-auto max-w-7xl px-6 py-12 sm:px-10 sm:py-16">
                    <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#FF593F]">
                        All offers
                    </p>

                    <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">
                        Offers across {place}
                    </h1>

                    <p className="mt-3 max-w-2xl text-lg text-[#17233B]/65">
                        Every live offer from local businesses, in one place.
                        Filter by what you fancy or where you are.
                    </p>

                    <div className="mt-8 grid max-w-3xl gap-3 sm:grid-cols-[1fr_16rem]">
                        <Suspense fallback={<Skeleton className="h-16 rounded-2xl" />}>
                            <OffersSearch city={city} searchParams={searchParams} />
                        </Suspense>
                        <LocationSearch places={places} basePath="/offers" current={city} size="lg" />
                    </div>
                </div>
            </section>

            <section className="mx-auto max-w-7xl px-6 sm:px-10">
                <Suspense fallback={<div className="mt-10"><ResultsLoading /></div>}>
                    <OffersCatalogue city={city} searchParams={searchParams} />
                </Suspense>
            </section>
        </main>
    );
}
