import { Suspense } from "react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import { FiArrowLeft } from "react-icons/fi";

import { Skeleton } from "@/components/ui/skeleton";
import { areaPath, cityPhotos, getLiveCities, type Place } from "@/lib/cities";
import { topLevelFor } from "@/lib/categories";
import { getCategories, getLiveOffers, getPublicBusinesses } from "@/lib/listings";
import { absoluteUrl, jsonLd, truncate } from "@/lib/site";
import { businessPath } from "@/lib/slugs";
import { SelectedArea } from "../../explore-listing";

// One neighbourhood's page, e.g. /explore/bristol/gloucester-road: its
// businesses and live offers. Built for searches like "Gloucester Road
// offers" or "loyalty cards in Clifton".

type PageProps = { params: Promise<{ city: string; area: string }> };

// A link to another page, styled like the filter chips.
function PillLink({ href, children }: { href: string; children: React.ReactNode }) {
    return (
        <Link
            href={href}
            className="inline-flex items-center rounded-full border border-[#17233B]/10 bg-white px-4 py-2 text-sm font-medium text-[#17233B]/75 transition hover:border-[#FF593F]/40 hover:text-[#17233B]"
        >
            {children}
        </Link>
    );
}

async function findArea(citySlug: string, areaSlug: string) {
    const place = (await getLiveCities()).find((city) => city.slug === citySlug);
    const name = place ? Object.entries(place.areaSlugs ?? {}).find(([, slug]) => slug === areaSlug)?.[0] : undefined;
    return place && name ? { place, name } : null;
}

async function areaListings(place: Place, name: string) {
    const [offers, businesses, groups] = await Promise.all([
        getLiveOffers(place.id),
        getPublicBusinesses(place.id),
        getCategories(),
    ]);

    return {
        offers: offers.filter((offer) => offer.business.area === name),
        businesses: businesses.filter((business) => business.area === name),
        allBusinesses: businesses,
        groups,
    };
}

// "cafés & coffee, bakeries and barbers": what kinds of business are here.
function kindsOf(businesses: { categoryName: string }[]) {
    const counts = new Map<string, number>();
    for (const business of businesses) {
        counts.set(business.categoryName, (counts.get(business.categoryName) ?? 0) + 1);
    }
    const names = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([kind]) => kind.toLowerCase());
    return names.length > 1 ? `${names.slice(0, -1).join(", ")} and ${names.at(-1)}` : names[0] ?? "";
}

function describe(name: string, cityName: string, businessCount: number, offerCount: number, kinds: string) {
    if (businessCount === 0) {
        return `Independent businesses in ${name}, ${cityName}, are joining Promotello. Check back soon for local offers and loyalty cards.`;
    }

    return `${businessCount} independent ${businessCount === 1 ? "business" : "businesses"} in ${name}, ${cityName}${kinds ? `, including ${kinds},` : ""} with ${offerCount} live ${offerCount === 1 ? "offer" : "offers"} and digital loyalty cards on Promotello.`;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const { city, area } = await params;
    const found = await findArea(city, area);

    if (!found) {
        return { title: "Area not found", robots: { index: false } };
    }

    const { place, name } = found;
    const { offers, businesses } = await areaListings(place, name);
    const path = areaPath(place, name)!;
    const title = `${name}, ${place.name}: offers, loyalty cards and local businesses`;
    const description = truncate(describe(name, place.name, businesses.length, offers.length, kindsOf(businesses)));

    return {
        title,
        description,
        alternates: { canonical: path },
        // An area with nobody on Promotello yet is too thin to index.
        robots: businesses.length === 0 ? { index: false, follow: true } : undefined,
        openGraph: { title, description, url: path },
    };
}

async function AreaContent({ params }: PageProps) {
    await connection();

    const { city, area } = await params;
    const found = await findArea(city, area);

    if (!found) {
        notFound();
    }

    const { place, name } = found;
    const { offers, businesses, allBusinesses, groups } = await areaListings(place, name);
    const photos = cityPhotos(place);
    const cityPath = `/explore/${place.slug}`;
    const pageUrl = absoluteUrl(areaPath(place, name)!);

    // Other areas in the city with businesses, busiest first.
    const nearby = [...new Set(allBusinesses.map((business) => business.area).filter((item): item is string => !!item && item !== name))]
        .map((item) => ({ name: item, count: allBusinesses.filter((business) => business.area === item).length, path: areaPath(place, item) }))
        .filter((item): item is { name: string; count: number; path: string } => item.path !== null)
        .sort((a, b) => b.count - a.count)
        .slice(0, 12);

    // Categories with businesses here, linking to the city's category pages.
    const categories = groups.filter((group) =>
        businesses.some((business) => topLevelFor(business.categoryId, groups)?.id === group.id),
    );

    const structuredData = [
        {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
                { name: "Explore", item: absoluteUrl("/explore") },
                { name: place.name, item: absoluteUrl(cityPath) },
                { name, item: pageUrl },
            ].map((crumb, index) => ({ "@type": "ListItem", position: index + 1, ...crumb })),
        },
        {
            "@context": "https://schema.org",
            "@type": "ItemList",
            name: `Independent businesses in ${name}, ${place.name}`,
            itemListElement: businesses.map((business, index) => ({
                "@type": "ListItem",
                position: index + 1,
                url: absoluteUrl(businessPath(business)),
                name: business.name,
            })),
        },
    ];

    return (
        <>
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(structuredData) }} />

            <section className="relative isolate overflow-hidden bg-[#17233B]">
                <Image src={photos.feature} alt="" fill priority sizes="100vw" className="-z-10 object-cover opacity-35" />

                <div className="mx-auto max-w-7xl px-6 py-14 sm:px-10 sm:py-20">
                    <Link href={cityPath} className="inline-flex items-center gap-1.5 text-sm font-medium text-white/75 hover:text-white">
                        <FiArrowLeft aria-hidden="true" />
                        Explore {place.name}
                    </Link>

                    <h1 className="mt-4 max-w-3xl text-4xl font-semibold tracking-tight text-white sm:text-5xl">
                        {name}, {place.name}
                    </h1>

                    <p className="mt-4 max-w-2xl text-lg text-white/75">
                        {describe(name, place.name, businesses.length, offers.length, kindsOf(businesses))}
                    </p>
                </div>
            </section>

            <section className="mx-auto max-w-7xl px-6 sm:px-10">
                <SelectedArea offersBase={`/offers/${place.slug}`} name={name} offers={offers} businesses={businesses} />

                {categories.length > 0 && (
                    <div className="mt-16">
                        <h2 className="text-xl font-semibold">Browse {place.name} by category</h2>
                        <div className="mt-4 flex flex-wrap gap-2">
                            {categories.map((group) => (
                                <PillLink key={group.id} href={`/categories/${group.slug}/${place.slug}`}>
                                    {group.name}
                                </PillLink>
                            ))}
                        </div>
                    </div>
                )}

                {nearby.length > 0 && (
                    <div className="mt-12">
                        <h2 className="text-xl font-semibold">More neighbourhoods in {place.name}</h2>
                        <div className="mt-4 flex flex-wrap gap-2">
                            {nearby.map((item) => (
                                <PillLink key={item.name} href={item.path}>
                                    {item.name}
                                </PillLink>
                            ))}
                        </div>
                    </div>
                )}
            </section>
        </>
    );
}

export default function AreaPage(props: PageProps) {
    return (
        <main className="min-h-screen bg-[#FFF8F0] pb-24 text-[#17233B]">
            <Suspense fallback={<div className="mx-auto max-w-7xl px-6 py-16 sm:px-10"><Skeleton className="h-72 rounded-3xl" /></div>}>
                <AreaContent {...props} />
            </Suspense>
        </main>
    );
}
