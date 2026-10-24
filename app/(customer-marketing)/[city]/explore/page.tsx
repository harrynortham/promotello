import { Suspense } from "react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { connection } from "next/server";
import { FiArrowRight, FiMapPin } from "react-icons/fi";

import { BusinessCard } from "@/components/business-card";
import {
    EmptyState,
    FilterChip,
    SectionHeading,
    hrefWith,
} from "@/components/listing-ui";
import { OfferCard } from "@/components/offer-card";
import { Skeleton } from "@/components/ui/skeleton";
import {
    areasFrom,
    getLiveOffers,
    getPublicBusinesses,
    type ListingBusiness,
    type ListingOffer,
} from "@/lib/listings";
import { cityPath, cityPhotosFor, getLiveCity, requireCity, type City } from "@/lib/cities";

// The city comes from the URL and is checked first (see the layout).
export const instant = false;

export async function generateMetadata({ params }: { params: Promise<{ city: string }> }): Promise<Metadata> {
    const city = await getLiveCity((await params).city);
    const name = city?.name ?? "your city";

    return {
        title: `Explore ${name} neighbourhoods`,
        description: `Explore local offers and independent businesses in ${name}, neighbourhood by neighbourhood.`,
        alternates: { canonical: `/${(await params).city}/explore` },
    };
}

type PageProps = {
    params: Promise<{ city: string }>;
    searchParams: Promise<{ area?: string }>;
};

function ExploreLoading() {
    return (
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((item) => (
                <Skeleton key={item} className="h-72 rounded-2xl" />
            ))}
        </div>
    );
}

function AreaCard({
    base,
    name,
    businesses,
    offers,
}: {
    base: string;
    name: string;
    businesses: ListingBusiness[];
    offers: ListingOffer[];
}) {
    const cover = offers.find((offer) => offer.imageUrl)?.imageUrl ?? null;

    return (
        <Link
            href={`${base}/explore?area=${encodeURIComponent(name)}`}
            scroll={false}
            className="group flex flex-col overflow-hidden rounded-2xl border border-[#17233B]/10 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
        >
            <div className="relative aspect-[16/9] overflow-hidden bg-[#17233B]">
                {cover && (
                    <Image
                        src={cover}
                        alt=""
                        fill
                        sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
                        className="object-cover opacity-80 transition duration-500 group-hover:scale-105"
                    />
                )}

                <div className="absolute inset-0 bg-gradient-to-t from-[#17233B]/85 to-transparent" />

                <div className="absolute bottom-0 left-0 p-5 text-white">
                    <h3 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
                        <FiMapPin aria-hidden="true" className="size-5" />
                        {name}
                    </h3>
                    <p className="mt-1 text-sm text-white/80">
                        {businesses.length} {businesses.length === 1 ? "business" : "businesses"} ·{" "}
                        {offers.length} {offers.length === 1 ? "offer" : "offers"}
                    </p>
                </div>
            </div>

            <ul className="flex-1 space-y-2 p-5 text-sm">
                {offers.slice(0, 3).map((offer) => (
                    <li key={offer.id} className="flex gap-2">
                        <span className="shrink-0 font-semibold text-[#FF593F]">{offer.discount}</span>
                        <span className="truncate text-[#17233B]/70">
                            {offer.business.name}
                        </span>
                    </li>
                ))}
            </ul>

            <p className="flex items-center gap-1.5 border-t border-[#17233B]/10 px-5 py-4 text-sm font-semibold text-[#17233B] group-hover:text-[#FF593F]">
                Explore {name}
                <FiArrowRight aria-hidden="true" />
            </p>
        </Link>
    );
}

async function ExploreContent({ city, searchParams }: { city: City; searchParams: PageProps["searchParams"] }) {
    await connection();

    const base = cityPath(city);
    const { area } = await searchParams;
    const [offers, businesses] = await Promise.all([getLiveOffers(city.id), getPublicBusinesses(city.id)]);
    const areas = areasFrom(businesses);
    const selected = areas.find((item) => item.name === area)?.name ?? null;

    return (
        <>
            <div className="-mx-6 flex gap-2 overflow-x-auto px-6 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
                <FilterChip href={`${base}/explore`} active={!selected}>
                    All neighbourhoods
                </FilterChip>

                {areas.map((item) => (
                    <FilterChip
                        key={item.name}
                        href={hrefWith(`${base}/explore`, {}, { area: item.name })}
                        active={selected === item.name}
                    >
                        {item.name}
                    </FilterChip>
                ))}
            </div>

            {selected ? (
                <SelectedArea
                    base={base}
                    name={selected}
                    offers={offers.filter((offer) => offer.business.area === selected)}
                    businesses={businesses.filter((business) => business.area === selected)}
                />
            ) : areas.length === 0 ? (
                <div className="mt-10">
                    <EmptyState
                        title="No neighbourhoods yet"
                        description="Businesses will appear here as they join Promotello."
                    />
                </div>
            ) : (
                <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                    {areas.map((item) => (
                        <AreaCard
                            key={item.name}
                            base={base}
                            name={item.name}
                            businesses={businesses.filter((business) => business.area === item.name)}
                            offers={offers.filter((offer) => offer.business.area === item.name)}
                        />
                    ))}
                </div>
            )}
        </>
    );
}

function SelectedArea({
    base,
    name,
    offers,
    businesses,
}: {
    base: string;
    name: string;
    offers: ListingOffer[];
    businesses: ListingBusiness[];
}) {
    return (
        <div className="mt-10 space-y-16">
            <section>
                <SectionHeading
                    title={`Offers in ${name}`}
                    href={`${base}/offers?area=${encodeURIComponent(name)}`}
                    linkLabel="Filter all offers"
                />

                <div className="mt-6">
                    {offers.length === 0 ? (
                        <EmptyState
                            title={`No live offers in ${name} right now`}
                            description="Have a look at the businesses below, or try another neighbourhood."
                        />
                    ) : (
                        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                            {offers.map((offer) => (
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
                                    category={offer.categoryName}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </section>

            <section>
                <SectionHeading title={`Businesses in ${name}`} />

                <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                    {businesses.map((business) => (
                        <BusinessCard key={business.id} business={business} />
                    ))}
                </div>
            </section>
        </div>
    );
}

export default async function ExplorePage({ params, searchParams }: PageProps) {
    const city = await requireCity(params);
    const photos = cityPhotosFor(city);

    return (
        <main className="min-h-screen bg-[#FFF8F0] pb-24 text-[#17233B]">
            <section className="relative isolate overflow-hidden bg-[#17233B]">
                <Image
                    src={photos.feature}
                    alt=""
                    fill
                    priority
                    sizes="100vw"
                    className="-z-10 object-cover opacity-35"
                />

                <div className="mx-auto max-w-7xl px-6 py-16 sm:px-10 sm:py-20">
                    <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#FF8A73]">
                        Explore {city.name}
                    </p>

                    <h1 className="mt-3 max-w-3xl text-4xl font-semibold tracking-tight text-white sm:text-5xl">
                        Find your next favourite place, neighbourhood by neighbourhood.
                    </h1>

                    <p className="mt-4 max-w-2xl text-lg text-white/75">
                        Pick an area to see the independent businesses there and
                        what they&apos;re offering right now.
                    </p>
                </div>
            </section>

            <section className="mx-auto max-w-7xl px-6 pt-10 sm:px-10">
                <Suspense fallback={<ExploreLoading />}>
                    <ExploreContent city={city} searchParams={searchParams} />
                </Suspense>
            </section>
        </main>
    );
}
