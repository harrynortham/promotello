import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { FiArrowRight } from "react-icons/fi";

import { BusinessCard } from "@/components/business-card";
import {
    EmptyState,
    FilterChip,
    SearchForm,
    hrefWith,
} from "@/components/listing-ui";
import { Skeleton } from "@/components/ui/skeleton";
import { cityPath, getLiveCity, requireCity, type City } from "@/lib/cities";
import {
    areasFrom,
    filterBusinesses,
    getCategories,
    getPublicBusinesses,
} from "@/lib/listings";

// The city comes from the URL and is checked first (see the layout).
export const instant = false;

export async function generateMetadata({ params }: { params: Promise<{ city: string }> }): Promise<Metadata> {
    const city = await getLiveCity((await params).city);
    const name = city?.name ?? "your city";

    return {
        title: `Independent businesses in ${name}`,
        description: `Discover independent cafés, shops, salons, studios and stays across ${name}, and the offers they're running right now.`,
        alternates: { canonical: `/${(await params).city}/businesses` },
    };
}

type SearchParams = {
    search?: string;
    category?: string;
    area?: string;
};

type PageProps = {
    params: Promise<{ city: string }>;
    searchParams: Promise<SearchParams>;
};

type SectionProps = {
    city: City;
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

async function Directory({ city, searchParams }: SectionProps) {
    await connection();

    const base = cityPath(city);
    const params = await searchParams;
    const [groups, businesses] = await Promise.all([getCategories(), getPublicBusinesses(city.id)]);

    const results = filterBusinesses(businesses, groups, params)
        // Businesses with live offers first, then newest.
        .sort((a, b) => Number(b.offerCount > 0) - Number(a.offerCount > 0) || b.createdAt.localeCompare(a.createdAt));

    const areas = areasFrom(businesses);
    const hasFilters = Boolean(params.search || params.category || params.area);

    return (
        <>
            <div className="space-y-4">
                <div className="-mx-6 flex gap-2 overflow-x-auto px-6 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
                    <FilterChip
                        href={hrefWith(`${base}/businesses`, params, { category: null })}
                        active={!params.category}
                    >
                        All businesses
                    </FilterChip>

                    {groups.map((group) => (
                        <FilterChip
                            key={group.id}
                            href={hrefWith(`${base}/businesses`, params, { category: group.slug })}
                            active={params.category === group.slug}
                        >
                            {group.name}
                        </FilterChip>
                    ))}
                </div>

                {areas.length > 1 && (
                    <div className="-mx-6 flex items-center gap-2 overflow-x-auto px-6 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
                        <span className="shrink-0 text-sm font-medium text-[#17233B]/55">Area:</span>

                        <FilterChip
                            href={hrefWith(`${base}/businesses`, params, { area: null })}
                            active={!params.area}
                        >
                            All {city.name}
                        </FilterChip>

                        {areas.map((area) => (
                            <FilterChip
                                key={area.name}
                                href={hrefWith(`${base}/businesses`, params, { area: area.name })}
                                active={params.area === area.name}
                            >
                                {area.name}
                            </FilterChip>
                        ))}
                    </div>
                )}
            </div>

            <p className="mt-8 border-t border-[#17233B]/10 pt-6 text-sm text-[#17233B]/65">
                <span className="font-semibold text-[#17233B]">{results.length}</span>{" "}
                {results.length === 1 ? "business" : "businesses"}
                {params.search && <> matching &ldquo;{params.search}&rdquo;</>}
            </p>

            <div className="mt-6">
                {results.length === 0 ? (
                    <EmptyState
                        title="No businesses match"
                        description={
                            hasFilters
                                ? "Try a different search, category or area."
                                : "Businesses will appear here as they join Promotello."
                        }
                        href={hasFilters ? `${base}/businesses` : undefined}
                    />
                ) : (
                    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                        {results.map((business) => (
                            <BusinessCard key={business.id} business={business} />
                        ))}
                    </div>
                )}
            </div>
        </>
    );
}

async function DirectorySearch({ city, searchParams }: SectionProps) {
    const params = await searchParams;

    return (
        <SearchForm
            action={`${cityPath(city)}/businesses`}
            defaultValue={params.search}
            placeholder="Search by name, type or area"
            hidden={{ category: params.category, area: params.area }}
            size="lg"
        />
    );
}

export default async function BusinessesPage({ params, searchParams }: PageProps) {
    const city = await requireCity(params);

    return (
        <main className="min-h-screen bg-[#FFF8F0] pb-24 text-[#17233B]">
            <section className="border-b border-[#17233B]/10 bg-white">
                <div className="mx-auto grid max-w-7xl gap-10 px-6 py-12 sm:px-10 sm:py-16 lg:grid-cols-[1fr_auto] lg:items-end">
                    <div>
                        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#FF593F]">
                            Business directory
                        </p>

                        <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">
                            {city.name}&apos;s independents
                        </h1>

                        <p className="mt-3 max-w-2xl text-lg text-[#17233B]/65">
                            Cafés, shops, studios and stays run by people who
                            live and work in the city.
                        </p>

                        <div className="mt-8 max-w-2xl">
                            <Suspense fallback={<Skeleton className="h-16 rounded-2xl" />}>
                                <DirectorySearch city={city} searchParams={searchParams} />
                            </Suspense>
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

            <section className="mx-auto max-w-7xl px-6 pt-10 sm:px-10">
                <Suspense fallback={<DirectoryLoading />}>
                    <Directory city={city} searchParams={searchParams} />
                </Suspense>
            </section>
        </main>
    );
}
