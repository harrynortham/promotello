import { Suspense } from "react";
import type { Metadata } from "next";
import { connection } from "next/server";
import { redirect } from "next/navigation";

import {
    EmptyState,
    FilterChip,
    SearchForm,
    ShowMore,
    hrefWith,
} from "@/components/listing-ui";
import { FilterDrawer } from "@/components/filter-drawer";
import { OfferCard } from "@/components/offer-card";
import { SearchLauncher } from "@/components/search-launcher";
import { Skeleton } from "@/components/ui/skeleton";
import { LocationSearch } from "@/components/location-search";
import { topLevelFor } from "@/lib/categories";
import { absoluteUrl, jsonLd } from "@/lib/site";
import { getLiveCities, placeIsOneCity, placeName, type City, type Place } from "@/lib/cities";
import {
    areasFrom,
    citiesWithArea,
    filterOffers,
    interleaveByCity,
    getCategories,
    getLiveOffers,
    kindsFrom,
    pageOf,
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
    // The kind of offer, as its slug: ?type=2-for-1.
    type?: string;
    sort?: string;
    // How many offers to render; see pageOf.
    show?: string;
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
    const [groups, offers, place, places, oneCity] = await Promise.all([
        getCategories(),
        getLiveOffers(city?.id),
        placeName(city),
        getLiveCities(),
        placeIsOneCity(city),
    ]);
    const sort = parseOfferSort(params.sort);

    // An area belongs to one city, so an area filter only means something
    // inside one. When this isn't the city that has it — a link shared from
    // another city, or a city remembered from an earlier visit — send them to
    // the city that does, rather than showing them an empty list.
    //
    // With one city live there is nothing to disambiguate, so the filter just
    // applies where it stands; redirecting would be a wasted trip.
    if (params.area && !(oneCity && offers.some((offer) => offer.business.area === params.area))) {
        const everywhere = city ? await getLiveOffers() : offers;
        const owners = citiesWithArea(everywhere.map((offer) => offer.business), params.area);
        const owner = owners.length === 1 ? places.find((item) => item.id === owners[0]) : null;

        if (owner && owner.id !== city?.id) {
            redirect(hrefWith(`/offers/${owner.slug}`, params, {}));
        }
    }

    const found = filterOffers(offers, groups, {
        category: params.category,
        area: params.area,
        kind: params.type,
        search: params.search,
        sort,
    });

    // Across cities, newest-first hands the whole first screen to whichever
    // city joined last. "Ending soon" and "Most popular" are answers the
    // visitor asked for, so those orders stand.
    const results = !city && sort === "newest"
        ? interleaveByCity(found, (offer) => offer.business.cityId)
        : found;

    // The selected top-level category, or the parent of a selected subcategory.
    const selectedGroup =
        groups.find((group) => group.slug === params.category) ??
        groups.find((group) =>
            group.subcategories.some((sub) => sub.slug === params.category),
        ) ??
        null;

    const inCategory = offers.filter(
        (offer) => !params.category || topLevelFor(offer.categoryId, groups)?.slug === selectedGroup?.slug,
    );

    const areas = areasFrom(inCategory.map((offer) => offer.business));

    // The types this city and category actually have something in, so
    // nobody is offered a filter that leads nowhere. With fewer than two
    // there is no choice to make, so the section is left out.
    const kinds = kindsFrom(inCategory);

    // Filters build on the current query, but never carry how far down the
    // list you had got: a different filter is a different list.
    const current = { ...params, show: undefined };
    const hasFilters = Boolean(params.search || params.category || params.area || params.type);
    const page = pageOf(results, params.show);

    return (
        <>
            <div className="mt-5 space-y-4 sm:mt-8">
                <div className="-mx-6 flex gap-2 overflow-x-auto scrollbar-none px-6 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
                    {/* Sort order and area live in a drawer behind Filter. */}
                    <FilterDrawer
                        sections={[
                            {
                                title: "Sort by",
                                options: sortOptions.map((option) => ({
                                    label: option.label,
                                    href: hrefWith(base, current, { sort: option.value === "newest" ? null : option.value }),
                                    active: sort === option.value,
                                })),
                            },
                            ...(kinds.length > 1
                                ? [
                                    {
                                        title: "Type of offer",
                                        options: [
                                            { label: "Any type", href: hrefWith(base, current, { type: null }), active: !params.type },
                                            ...kinds.map((kind) => ({
                                                label: kind.label,
                                                href: hrefWith(base, current, { type: kind.slug }),
                                                active: params.type === kind.slug,
                                                count: kind.count,
                                            })),
                                        ],
                                    },
                                ]
                                : []),
                            // An area belongs to a city, so areas are offered
                            // whenever the page is one city's worth — chosen,
                            // or the only one live. Looking at several, the
                            // choice to make first is which one.
                            ...(oneCity
                                ? areas.length > 1
                                    ? [
                                        {
                                            title: "Area",
                                            options: [
                                                { label: `All of ${place}`, href: hrefWith(base, current, { area: null }), active: !params.area },
                                                ...areas.map((area) => ({
                                                    label: area.name,
                                                    href: hrefWith(base, current, { area: area.name }),
                                                    active: params.area === area.name,
                                                })),
                                            ],
                                        },
                                    ]
                                    : []
                                : places.length > 1
                                    ? [
                                        {
                                            title: "Location",
                                            options: [
                                                { label: "Everywhere", href: hrefWith("/offers", current, { area: null }), active: true },
                                                ...places.map((item) => ({
                                                    label: item.name,
                                                    href: hrefWith(`/offers/${item.slug}`, current, { area: null }),
                                                    active: false,
                                                })),
                                            ],
                                        },
                                    ]
                                    : []),
                        ]}
                    />

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

                {/* Subcategories narrow the chosen category, so they stay as pills. */}
                {selectedGroup && selectedGroup.subcategories.length > 0 && (
                    <div className="-mx-6 flex gap-2 overflow-x-auto scrollbar-none px-6 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
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
            </div>

            <div className="mt-5 sm:mt-8">
                {results.length === 0 ? (
                    <EmptyState
                        title="No offers match"
                        description={
                            hasFilters
                                ? "Try a different search, category, type or area."
                                : "New offers are on their way. Check back soon."
                        }
                        href={hasFilters ? base : undefined}
                    />
                ) : (
                    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                        {page.shown.map((offer) => (
                            <OfferCard
                                key={offer.id}
                                slug={offer.slug}
                                discount={offer.discount}
                                title={offer.title}
                                description={offer.description}
                                availability={offer.availability}
                                business={offer.business.name}
                                businessLogoUrl={offer.business.logoUrl}
                                example={offer.business.isSample}
                                imageUrl={offer.imageUrl}
                                expiresAt={offer.expiresAt}
                                area={offer.business.area}
                                city={city ? null : offer.business.city}
                                category={offer.categoryName}
                            />
                        ))}
                    </div>
                )}

                <ShowMore
                    shown={page.shown.length}
                    total={page.total}
                    paged={page.paged}
                    nextHref={page.more ? hrefWith(base, current, { show: String(page.more) }) : null}
                    capped={page.capped}
                    noun="offers"
                />
            </div>
        </>
    );
}

// The phone search pill: what's being searched, and where, at a glance.
async function OffersLauncher({ city, searchParams, places }: ListingProps & { places: Place[] }) {
    const [params, groups, place, oneCity] = await Promise.all([
        searchParams,
        getCategories(),
        placeName(city),
        placeIsOneCity(city),
    ]);
    const category = groups
        .flatMap((group) => [group, ...group.subcategories])
        .find((item) => item.slug === params.category);

    return (
        <SearchLauncher
            title={params.search ? `“${params.search}”` : "Search offers"}
            summary={`${oneCity ? place : "Everywhere"} · ${category?.name ?? "Any category"}`}
            heading="Search offers"
        >
            <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#17233B]/55">What</p>
                <OffersSearch city={city} searchParams={searchParams} />
            </div>
            <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#17233B]/55">Where</p>
                <LocationSearch places={places} basePath="/offers" current={city} size="lg" />
            </div>
        </SearchLauncher>
    );
}

async function OffersSearch({ city, searchParams }: ListingProps) {
    const params = await searchParams;

    return (
        <SearchForm
            action={city ? `/offers/${city.slug}` : "/offers"}
            defaultValue={params.search}
            placeholder="Search offers, businesses or areas"
            hidden={{ category: params.category, area: params.area, type: params.type, sort: params.sort }}
            size="lg"
        />
    );
}

export async function OffersListing({ city, searchParams }: ListingProps) {
    const [place, places, oneCity] = await Promise.all([placeName(city), getLiveCities(), placeIsOneCity(city)]);

    // Offers › Bristol, so a city's listing shows its place in search
    // results rather than looking like a page of its own.
    const breadcrumbs = city
        ? {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
                { name: "Offers", item: absoluteUrl("/offers") },
                { name: city.name, item: absoluteUrl(`/offers/${city.slug}`) },
            ].map((crumb, index) => ({ "@type": "ListItem", position: index + 1, ...crumb })),
        }
        : null;

    return (
        <main className="min-h-screen bg-[#FFF8F0] pb-24 text-[#17233B]">
            {breadcrumbs && (
                <script
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{ __html: jsonLd(breadcrumbs) }}
                />
            )}

            {/* Phones get a compact heading and one search pill, so offers start near the top. */}
            <section className="border-b border-[#17233B]/10 bg-white">
                <div className="mx-auto max-w-7xl px-6 pb-5 pt-4 sm:px-10 sm:py-16">
                    <p className="hidden text-sm font-semibold uppercase tracking-[0.16em] text-[#FF593F] sm:block">
                        All offers
                    </p>

                    <h1 className="text-2xl font-semibold tracking-tight sm:mt-3 sm:text-5xl">
                        {oneCity ? `Offers across ${place}` : "Offers from independent businesses"}
                    </h1>

                    <p className="mt-3 hidden max-w-2xl text-lg text-[#17233B]/65 sm:block">
                        Every live offer from local businesses, in one place.
                        Filter by what you fancy or where you are.
                    </p>

                    <div className="mt-4 sm:hidden">
                        <Suspense fallback={<Skeleton className="h-[3.75rem] rounded-full" />}>
                            <OffersLauncher city={city} searchParams={searchParams} places={places} />
                        </Suspense>
                    </div>

                    <div className="mt-8 hidden max-w-3xl gap-3 sm:grid sm:grid-cols-[1fr_16rem]">
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
