import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getLiveCity } from "@/lib/cities";
import { CategoryContent, CategoryLoading, categoryMetadata } from "../category-content";

type PageProps = {
    params: Promise<{ slug: string; city: string }>;
    searchParams: Promise<{ sub?: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const { slug, city: citySlug } = await params;
    const city = await getLiveCity(citySlug);
    return city ? categoryMetadata(slug, city) : { title: "Location not found", robots: { index: false } };
}

async function CityCategory({ params, searchParams }: PageProps) {
    const { slug, city: citySlug } = await params;
    const city = await getLiveCity(citySlug);

    if (!city) {
        notFound();
    }

    return <CategoryContent slug={slug} city={city} searchParams={searchParams} />;
}

// A category in one city, e.g. /categories/food-drink/bristol.
export default function CityCategoryPage(props: PageProps) {
    return (
        <main className="min-h-screen bg-[#FFF8F0] pb-24 pt-8 text-[#17233B]">
            <Suspense fallback={<CategoryLoading />}>
                <CityCategory {...props} />
            </Suspense>
        </main>
    );
}
