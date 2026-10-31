import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { connection } from "next/server";
import { notFound, permanentRedirect } from "next/navigation";
import { FiArrowLeft } from "react-icons/fi";

import { BusinessCard } from "@/components/business-card";
import {
    EmptyState,
    FilterChip,
    SectionHeading,
} from "@/components/listing-ui";
import { OfferCard } from "@/components/offer-card";
import { Skeleton } from "@/components/ui/skeleton";
import type { CategoryGroup } from "@/lib/categories";
import { truncate } from "@/lib/site";
import {
    categoryImage,
    filterBusinesses,
    filterOffers,
    getCategories,
    getLiveOffers,
    getPublicBusinesses,
} from "@/lib/listings";
import { placeName, type City } from "@/lib/cities";

type PageProps = {
    params: Promise<{ slug: string }>;
    searchParams: Promise<{ sub?: string }>;
};

// A category or subcategory page, for every live city or one:
// /categories/food-drink, /categories/cafes-coffee/bristol.
export function categoryPath(slug: string, city: Pick<City, "slug"> | null) {
    return city ? `/categories/${slug}/${city.slug}` : `/categories/${slug}`;
}

// The slug may be a top-level category or one of its subcategories.
function resolveCategory(groups: CategoryGroup[], slug: string) {
    for (const group of groups) {
        if (group.slug === slug) return { group, subcategory: null };
        const subcategory = group.subcategories.find((item) => item.slug === slug);
        if (subcategory) return { group, subcategory };
    }
    return null;
}

// Shared with /categories/<category>/<city>.
export async function categoryMetadata(slug: string, city: City | null, sub?: string): Promise<Metadata> {
    const groups = await getCategories();
    // Old ?sub= links are the subcategory's own page.
    const found = resolveCategory(groups, sub && resolveCategory(groups, sub) ? sub : slug);
    const place = await placeName(city);

    if (!found) {
        return { title: "Category not found", robots: { index: false } };
    }

    const { group, subcategory } = found;
    const category = subcategory ?? group;
    const path = categoryPath(category.slug, city);

    const [offers, businesses] = await Promise.all([getLiveOffers(city?.id), getPublicBusinesses(city?.id)]);
    const offerCount = filterOffers(offers, groups, { category: category.slug }).length;
    const businessCount = filterBusinesses(businesses, groups, { category: category.slug }).length;

    // "Bakeries in Bristol: offers and loyalty cards"; "Food & drink offers in Bristol".
    const title = subcategory
        ? `${category.name} in ${place}: offers and loyalty cards`
        : `${category.name} offers in ${place}`;
    const description = truncate(
        subcategory
            ? `${offerCount > 0 ? `${offerCount} live` : "Live"} ${category.name.toLowerCase()} offers and loyalty cards from independent businesses in ${place}.`
            : `${group.name} offers in ${place}. ${group.description ?? ""}`,
    );

    return {
        title,
        description,
        alternates: { canonical: path },
        // Nothing here yet: too thin to index.
        robots: offerCount === 0 && businessCount === 0 ? { index: false, follow: true } : undefined,
        openGraph: {
            title,
            description,
            url: path,
            images: [{ url: categoryImage(group) }],
        },
    };
}

export function CategoryLoading() {
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

// The category page body, for every live city or one.
export async function CategoryContent({
    slug,
    city,
    searchParams,
}: {
    slug: string;
    city: City | null;
    searchParams: PageProps["searchParams"];
}) {
    await connection();

    const offersBase = city ? `/offers/${city.slug}` : "/offers";
    const businessesBase = city ? `/businesses/${city.slug}` : "/businesses";
    const { sub } = await searchParams;
    const [groups, offers, businesses, place] = await Promise.all([
        getCategories(),
        getLiveOffers(city?.id),
        getPublicBusinesses(city?.id),
        placeName(city),
    ]);

    // Old ?sub= links go to the subcategory's own page.
    if (sub && resolveCategory(groups, sub)?.subcategory) {
        permanentRedirect(categoryPath(sub, city));
    }

    const found = resolveCategory(groups, slug);

    if (!found) {
        notFound();
    }

    const { group, subcategory } = found;
    const filterSlug = subcategory?.slug ?? group.slug;
    const categoryOffers = filterOffers(offers, groups, { category: filterSlug });
    const categoryBusinesses = filterBusinesses(businesses, groups, { category: filterSlug });
    const path = categoryPath(group.slug, city);

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
                            href={subcategory ? path : "/categories"}
                            className="inline-flex items-center gap-1.5 text-sm font-medium text-white/75 hover:text-white"
                        >
                            <FiArrowLeft aria-hidden="true" />
                            {subcategory ? `All ${group.name.toLowerCase()}` : "All categories"}
                        </Link>

                        <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">
                            {subcategory ? `${subcategory.name} in ${place}` : group.name}
                        </h1>

                        <p className="mt-4 text-lg leading-8 text-white/80">
                            {subcategory
                                ? `${subcategory.name} offers from independent businesses across ${place}.`
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
                    <div className="-mx-6 mt-8 flex gap-2 overflow-x-auto scrollbar-none px-6 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
                        <FilterChip href={path} active={!subcategory}>
                            All {group.name.toLowerCase()}
                        </FilterChip>

                        {group.subcategories.map((item) => (
                            <FilterChip
                                key={item.id}
                                href={categoryPath(item.slug, city)}
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
                    href={`${offersBase}?category=${filterSlug}`}
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
                                    example={offer.business.isSample}
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
                        href={`${businessesBase}?category=${filterSlug}`}
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

