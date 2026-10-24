import { Suspense } from "react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { connection } from "next/server";
import { FiArrowRight } from "react-icons/fi";

import { SearchForm } from "@/components/listing-ui";
import { Skeleton } from "@/components/ui/skeleton";
import { isInCategory } from "@/lib/categories";
import { placeName } from "@/lib/cities";
import {
    categoryImage,
    getCategories,
    getLiveOffers,
    offerCountsByCategory,
} from "@/lib/listings";

export const metadata: Metadata = {
    title: "Categories",
    description:
        "Browse local offers by category: food and drink, things to do, shopping, health and beauty, services, and places to stay.",
    alternates: { canonical: "/categories" },
};

function CategoriesLoading() {
    return (
        <div className="grid gap-6 md:grid-cols-2">
            {[1, 2, 3, 4].map((item) => (
                <Skeleton key={item} className="h-96 rounded-3xl" />
            ))}
        </div>
    );
}

async function CategoryGrid() {
    await connection();

    const [groups, offers] = await Promise.all([getCategories(), getLiveOffers()]);
    const counts = offerCountsByCategory(offers, groups);

    return (
        <div className="grid gap-6 md:grid-cols-2">
            {groups.map((group) => {
                const count = counts[group.slug] ?? 0;
                const withOffers = group.subcategories.filter((sub) =>
                    offers.some((offer) => isInCategory(offer.categoryId, sub.slug, groups)),
                );

                return (
                    <article
                        key={group.id}
                        className="group relative flex flex-col overflow-hidden rounded-3xl border border-[#17233B]/10 bg-white shadow-sm transition hover:shadow-lg"
                    >
                        <div className="relative aspect-[16/8] overflow-hidden bg-[#17233B]">
                            <Image
                                src={categoryImage(group)}
                                alt=""
                                fill
                                sizes="(min-width: 768px) 50vw, 100vw"
                                className="object-cover transition duration-500 group-hover:scale-105"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-[#17233B]/80 via-transparent to-transparent" />

                            <div className="absolute bottom-0 left-0 flex w-full items-end justify-between gap-4 p-6 text-white">
                                <h2 className="text-3xl font-semibold tracking-tight">
                                    <Link
                                        href={`/categories/${group.slug}`}
                                        className="after:absolute after:inset-0 focus-visible:outline-none"
                                    >
                                        {group.name}
                                    </Link>
                                </h2>

                                <span className="shrink-0 rounded-full bg-white/95 px-3 py-1 text-sm font-semibold text-[#17233B]">
                                    {count} {count === 1 ? "offer" : "offers"}
                                </span>
                            </div>
                        </div>

                        <div className="flex flex-1 flex-col p-6">
                            {group.description && (
                                <p className="leading-7 text-[#17233B]/70">{group.description}</p>
                            )}

                            <div className="relative z-10 mt-5 flex flex-wrap gap-2">
                                {group.subcategories.map((sub) => {
                                    const active = withOffers.includes(sub);

                                    return (
                                        <Link
                                            key={sub.id}
                                            href={`/categories/${group.slug}?sub=${sub.slug}`}
                                            className={`rounded-full border px-3 py-1.5 text-sm transition ${active
                                                ? "border-[#17233B]/15 bg-[#FFF8F0] text-[#17233B] hover:border-[#FF593F] hover:text-[#FF593F]"
                                                : "border-transparent bg-[#17233B]/[0.04] text-[#17233B]/45 hover:text-[#17233B]"
                                                }`}
                                        >
                                            {sub.name}
                                        </Link>
                                    );
                                })}
                            </div>

                            <p className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-[#17233B] group-hover:text-[#FF593F]">
                                Explore {group.name.toLowerCase()}
                                <FiArrowRight aria-hidden="true" />
                            </p>
                        </div>
                    </article>
                );
            })}
        </div>
    );
}

export default async function CategoriesPage() {
    const place = await placeName(null);

    return (
        <main className="min-h-screen bg-[#FFF8F0] pb-24 text-[#17233B]">
            <section className="mx-auto max-w-7xl px-6 py-14 text-center sm:px-10 sm:py-20">
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#FF593F]">
                    Browse by category
                </p>

                <h1 className="mx-auto mt-3 max-w-3xl text-4xl font-semibold tracking-tight sm:text-6xl">
                    Find something you&apos;ll love.
                </h1>

                <p className="mx-auto mt-5 max-w-2xl text-lg text-[#17233B]/65">
                    From a morning coffee to a night away, explore offers from
                    {place}&apos;s independent businesses by the things you enjoy.
                </p>

                <div className="mx-auto mt-8 max-w-xl text-left">
                    <SearchForm action="/offers" placeholder="Or search every offer" size="lg" />
                </div>
            </section>

            <section className="mx-auto max-w-7xl px-6 sm:px-10">
                <Suspense fallback={<CategoriesLoading />}>
                    <CategoryGrid />
                </Suspense>
            </section>
        </main>
    );
}
