import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { FiArrowRight } from "react-icons/fi";

import { BusinessCard } from "@/components/business-card";
import {
    EmptyState,
    FilterChip,
    SearchForm,
    ShowMore,
    hrefWith,
} from "@/components/listing-ui";
import { FilterDrawer } from "@/components/filter-drawer";
import { LocationSearch } from "@/components/location-search";
import { SearchLauncher } from "@/components/search-launcher";
import { Skeleton } from "@/components/ui/skeleton";
import { getLiveCities, placeIsOneCity, placeName, type City, type Place } from "@/lib/cities";
import {
    areasFrom,
    citiesWithArea,
    filterBusinesses,
    interleaveByCity,
    getCategories,
    getPublicBusinesses,
    pageOf,
} from "@/lib/listings";

// The business directory, for every live city (/businesses) or one
// (/businesses/bristol).

export async function businessesMetadata(city: City | null): Promise<Metadata> {
    const place = await placeName(city);

    return {
        title: `Independent businesses in ${place}`,
        description: `Discover independent cafés, shops, salons, studios and stays across ${place}, and the offers they're running right now.`,
        alternates: { canonical: city ? `/businesses/${city.slug}` : "/businesses" },
    };
}

type SearchParams = {
    search?: string;
    category?: string;
    area?: string;
    // How many businesses to render; see pageOf.
    show?: string;
};

type ListingProps = {
    city: City | null;
    searchParams: Promise<SearchParams>;
};

function DirectoryLoading() {
    return (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((item) => (
                <Skeleton key={item} className="h-96 rounded-2xl" />
            ))}
        </div>
    );
}

async function Directory({ city, searchParams }: ListingProps) {
    await connection();

    const base = city ? `/businesses/${city.slug}` : "/businesses";
    const params = await searchParams;
    const [groups, businesses, place, places, oneCity] = await Promise.all([
        getCategories(),
        getPublicBusinesses(city?.id),
        placeName(city),
        getLiveCities(),
        placeIsOneCity(city),
    ]);

    // An area belongs to one city. When this isn't the city that has it — a
    // shared link, or a city remembered from an earlier visit — send them to
    // the city that does, rather than showing them an empty list.
    //
    // With one city live there is nothing to disambiguate, so the filter just
    // applies where it stands; redirecting would be a wasted trip.
    if (params.area && !(oneCity && businesses.some((business) => business.area === params.area))) {
        const everywhere = city ? await getPublicBusinesses() : businesses;
        const owners = citiesWithArea(everywhere, params.area);
        const owner = owners.length === 1 ? places.find((item) => item.id === owners[0]) : null;

        if (owner && owner.id !== city?.id) {
            redirect(hrefWith(`/businesses/${owner.slug}`, params, {}));
        }
    }

    const found = filterBusinesses(businesses, groups, params)
        // Businesses with live offers first, then newest.
        .sort((a, b) => Number(b.offerCount > 0) - Number(a.offerCount > 0) || b.createdAt.localeCompare(a.createdAt));

    // Across cities, one from each in turn, so the newest city doesn't take
    // the whole first screen.
    const results = city ? found : interleaveByCity(found, (business) => business.cityId);

    const areas = areasFrom(businesses);
    const hasFilters = Boolean(params.search || params.category || params.area);

    // Filters build on the current query, but never carry how far down the
    // list you had got: a different filter is a different list.
    const current = { ...params, show: undefined };
    const page = pageOf(results, params.show);

    return (
        <>
            <div className="-mx-6 flex gap-2 overflow-x-auto scrollbar-none px-6 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
                {/* Areas live in a drawer behind Filter, not a second row of pills. */}
                {/* An area belongs to a city, so areas are offered whenever
                    the page is one city's worth — either because a city was
                    chosen, or because only one is live and everything here is
                    already in it. The choice to offer first, when there are
                    several and none picked, is which city. */}
                {oneCity && areas.length > 1 && (
                    <FilterDrawer
                        sections={[
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
                        ]}
                    />
                )}

                {!oneCity && places.length > 1 && (
                    <FilterDrawer
                        sections={[
                            {
                                title: "Location",
                                options: [
                                    { label: "Everywhere", href: hrefWith("/businesses", current, { area: null }), active: true },
                                    ...places.map((item) => ({
                                        label: item.name,
                                        href: hrefWith(`/businesses/${item.slug}`, current, { area: null }),
                                        active: false,
                                    })),
                                ],
                            },
                        ]}
                    />
                )}

                <FilterChip
                    href={hrefWith(base, current, { category: null })}
                    active={!params.category}
                >
                    All businesses
                </FilterChip>

                {groups.map((group) => (
                    <FilterChip
                        key={group.id}
                        href={hrefWith(base, current, { category: group.slug })}
                        active={params.category === group.slug}
                    >
                        {group.name}
                    </FilterChip>
                ))}
            </div>


            <div className="mt-5 sm:mt-8">
                {results.length === 0 ? (
                    <EmptyState
                        title="No businesses match"
                        description={
                            hasFilters
                                ? "Try a different search, category or area."
                                : "Businesses will appear here as they join Promotello."
                        }
                        href={hasFilters ? base : undefined}
                    />
                ) : (
                    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                        {page.shown.map((business) => (
                            <BusinessCard key={business.id} business={business} showCity={!city} />
                        ))}
                    </div>
                )}

                <ShowMore
                    shown={page.shown.length}
                    total={page.total}
                    nextHref={page.more ? hrefWith(base, current, { show: String(page.more) }) : null}
                    capped={page.capped}
                    noun="businesses"
                />
            </div>
        </>
    );
}

// The phone search pill: what's being searched, and where, at a glance.
async function DirectoryLauncher({ city, searchParams, places }: ListingProps & { places: Place[] }) {
    const [params, groups, place, oneCity] = await Promise.all([
        searchParams,
        getCategories(),
        placeName(city),
        placeIsOneCity(city),
    ]);
    const category = groups.find((group) => group.slug === params.category);

    return (
        <SearchLauncher
            title={params.search ? `\u201c${params.search}\u201d` : "Search businesses"}
            summary={`${oneCity ? place : "Everywhere"} · ${category?.name ?? "Any category"}`}
            heading="Search businesses"
        >
            <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#17233B]/55">What</p>
                <DirectorySearch city={city} searchParams={searchParams} />
            </div>
            <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#17233B]/55">Where</p>
                <LocationSearch places={places} basePath="/businesses" current={city} size="lg" />
            </div>
        </SearchLauncher>
    );
}

async function DirectorySearch({ city, searchParams }: ListingProps) {
    const params = await searchParams;

    return (
        <SearchForm
            action={city ? `/businesses/${city.slug}` : "/businesses"}
            defaultValue={params.search}
            placeholder="Search by name, type or area"
            hidden={{ category: params.category, area: params.area }}
            size="lg"
        />
    );
}

export async function BusinessesListing({ city, searchParams }: ListingProps) {
    const [place, places, oneCity] = await Promise.all([placeName(city), getLiveCities(), placeIsOneCity(city)]);

    return (
        <main className="min-h-screen bg-[#FFF8F0] pb-24 text-[#17233B]">
            {/* Phones get a compact heading and one search pill, so businesses start near the top. */}
            <section className="border-b border-[#17233B]/10 bg-white">
                <div className="mx-auto grid max-w-7xl gap-10 px-6 pb-5 pt-4 sm:px-10 sm:py-16 lg:grid-cols-[1fr_auto] lg:items-end">
                    <div>
                        <p className="hidden text-sm font-semibold uppercase tracking-[0.16em] text-[#FF593F] sm:block">
                            Business directory
                        </p>

                        <h1 className="text-2xl font-semibold tracking-tight sm:mt-3 sm:text-5xl">
                            {oneCity ? `${place}'s independents` : "Independent businesses"}
                        </h1>

                        <p className="mt-3 hidden max-w-2xl text-lg text-[#17233B]/65 sm:block">
                            Cafés, shops, studios and stays run by people who
                            live and work {oneCity ? "in the city" : "nearby"}.
                        </p>

                        <div className="mt-4 sm:hidden">
                            <Suspense fallback={<Skeleton className="h-[3.75rem] rounded-full" />}>
                                <DirectoryLauncher city={city} searchParams={searchParams} places={places} />
                            </Suspense>
                        </div>

                        <div className="mt-8 hidden max-w-3xl gap-3 sm:grid sm:grid-cols-[1fr_16rem]">
                            <Suspense fallback={<Skeleton className="h-16 rounded-2xl" />}>
                                <DirectorySearch city={city} searchParams={searchParams} />
                            </Suspense>
                            <LocationSearch places={places} basePath="/businesses" current={city} size="lg" />
                        </div>
                    </div>

                    <Link
                        href="/business"
                        className="group hidden max-w-xs rounded-2xl bg-[#FFF4E8] p-6 lg:block"
                    >
                        <p className="font-semibold">Own a business?</p>
                        <p className="mt-1 text-sm text-[#17233B]/65">
                            Get listed for free and publish your first offer today.
                        </p>
                        <p className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-[#FF593F]">
                            List your business
                            <FiArrowRight aria-hidden="true" className="transition group-hover:translate-x-0.5" />
                        </p>
                    </Link>
                </div>
            </section>

            <section className="mx-auto max-w-7xl px-6 pt-5 sm:px-10 sm:pt-10">
                <Suspense fallback={<DirectoryLoading />}>
                    <Directory city={city} searchParams={searchParams} />
                </Suspense>
            </section>
        </main>
    );
}
