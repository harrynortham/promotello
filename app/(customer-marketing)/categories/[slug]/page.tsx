import { Suspense } from "react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import { FiArrowLeft } from "react-icons/fi";

import { BusinessCard } from "@/components/business-card";
import {
    EmptyState,
    FilterChip,
    SectionHeading,
    hrefWith,
} from "@/components/listing-ui";
import { OfferCard } from "@/components/offer-card";
import { Skeleton } from "@/components/ui/skeleton";
import { truncate } from "@/lib/site";
import {
    categoryImage,
    filterBusinesses,
    filterOffers,
    getCategories,
    getLiveOffers,
    getPublicBusinesses,
} from "@/lib/listings";

type PageProps = {
    params: Promise<{ slug: string }>;
    searchParams: Promise<{ sub?: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const { slug } = await params;
    const group = (await getCategories()).find((item) => item.slug === slug);

    if (!group) {
        return { title: "Category not found", robots: { index: false } };
    }

    const description = truncate(
        `${group.name} offers in Bristol. ${group.description ?? ""}`,
    );

    return {
        title: `${group.name} offers in Bristol`,
        description,
        alternates: { canonical: `/categories/${group.slug}` },
        openGraph: {
            title: `${group.name} offers in Bristol`,
            description,
            url: `/categories/${group.slug}`,
            images: [{ url: categoryImage(group) }],
        },
    };
}

function CategoryLoading() {
    return (
        <div className="mx-auto max-w-7xl px-6 sm:px-10">
            <Skeleton className="h-72 rounded-3xl" />
            <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                {[1, 2, 3, 4].map((item) => (
                    <Skeleton key={item} className="aspect-[3/4] rounded-2xl" />
                ))}
            </div>
        </div>
    );
}

async function CategoryContent({ params, searchParams }: PageProps) {
    await connection();

    const [{ slug }, { sub }] = await Promise.all([params, searchParams]);
    const [groups, offers, businesses] = await Promise.all([
        getCategories(),
        getLiveOffers(),
        getPublicBusinesses(),
    ]);

    const group = groups.find((item) => item.slug === slug);

    if (!group) {
        notFound();
    }

    const subcategory = group.subcategories.find((item) => item.slug === sub) ?? null;
    const filterSlug = subcategory?.slug ?? group.slug;
    const categoryOffers = filterOffers(offers, groups, { category: filterSlug });
    const categoryBusinesses = filterBusinesses(businesses, groups, { category: filterSlug });
    const path = `/categories/${group.slug}`;

    return (
        <>
            <section className="mx-auto max-w-7xl px-6 sm:px-10">
                <div className="relative isolate overflow-hidden rounded-3xl bg-[#17233B]">
                    <Image
                        src={categoryImage(group)}
                        alt=""
                        fill
                        priority
                        sizes="(min-width: 1280px) 1200px, 100vw"
                        className="-z-10 object-cover"
                    />
                    <div className="absolute inset-0 -z-10 bg-gradient-to-r from-[#17233B]/90 via-[#17233B]/60 to-[#17233B]/10" />

                    <div className="max-w-2xl px-8 py-14 text-white sm:px-12 sm:py-20">
                        <Link
                            href="/categories"
                            className="inline-flex items-center gap-1.5 text-sm font-medium text-white/75 hover:text-white"
                        >
                            <FiArrowLeft aria-hidden="true" />
                            All categories
                        </Link>

                        <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">
                            {subcategory ? subcategory.name : group.name}
                        </h1>

                        <p className="mt-4 text-lg leading-8 text-white/80">
                            {subcategory
                                ? `${subcategory.name} offers from independent businesses across Bristol.`
                                : group.description}
                        </p>

                        <p className="mt-6 text-sm text-white/75">
                            <span className="font-semibold text-white">{categoryOffers.length}</span>{" "}
                            live {categoryOffers.length === 1 ? "offer" : "offers"} ·{" "}
                            <span className="font-semibold text-white">{categoryBusinesses.length}</span>{" "}
                            {categoryBusinesses.length === 1 ? "business" : "businesses"}
                        </p>
                    </div>
                </div>

                {group.subcategories.length > 0 && (
                    <div className="-mx-6 mt-8 flex gap-2 overflow-x-auto px-6 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
                        <FilterChip href={path} active={!subcategory}>
                            All {group.name.toLowerCase()}
                        </FilterChip>

                        {group.subcategories.map((item) => (
                            <FilterChip
                                key={item.id}
                                href={hrefWith(path, {}, { sub: item.slug })}
                                active={subcategory?.id === item.id}
                            >
                                {item.name}
                            </FilterChip>
                        ))}
                    </div>
                )}
            </section>

            <section className="mx-auto max-w-7xl px-6 pt-12 sm:px-10">
                <SectionHeading
                    title="Live offers"
                    href={`/offers?category=${filterSlug}`}
                    linkLabel="Filter and sort"
                />

                <div className="mt-6">
                    {categoryOffers.length === 0 ? (
                        <EmptyState
                            title="No live offers here yet"
                            description="New offers are added all the time. Try another category in the meantime."
                            href={subcategory ? path : "/categories"}
                            linkLabel={subcategory ? `All ${group.name.toLowerCase()}` : "All categories"}
                        />
                    ) : (
                        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                            {categoryOffers.map((offer) => (
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
                                    category={subcategory ? null : offer.categoryName}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </section>

            {categoryBusinesses.length > 0 && (
                <section className="mx-auto max-w-7xl px-6 pt-16 sm:px-10">
                    <SectionHeading
                        title={`${subcategory ? subcategory.name : group.name} businesses`}
                        href={`/businesses?category=${filterSlug}`}
                        linkLabel="Browse the directory"
                    />

                    <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                        {categoryBusinesses.map((business) => (
                            <BusinessCard key={business.id} business={business} />
                        ))}
                    </div>
                </section>
            )}
        </>
    );
}

export default function CategoryPage(props: PageProps) {
    return (
        <main className="min-h-screen bg-[#FFF8F0] pb-24 pt-8 text-[#17233B]">
            <Suspense fallback={<CategoryLoading />}>
                <CategoryContent {...props} />
            </Suspense>
        </main>
    );
}
