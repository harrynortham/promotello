import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Skeleton } from "@/components/ui/skeleton";
import { RememberCity } from "@/components/remember-city";
import { getLiveCity } from "@/lib/cities";
import { ExploreListing, exploreMetadata } from "../explore-listing";

type PageProps = {
    params: Promise<{ city: string }>;
    searchParams: Promise<{ area?: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const city = await getLiveCity((await params).city);
    return city ? exploreMetadata(city) : { title: "Location not found", robots: { index: false } };
}

async function CityExplore({ params, searchParams }: PageProps) {
    const city = await getLiveCity((await params).city);

    if (!city) {
        notFound();
    }

    return (
        <>
            <RememberCity slug={city.slug} />
            <ExploreListing city={city} searchParams={searchParams} />
        </>
    );
}

// One city's neighbourhoods, e.g. /explore/bristol.
//
// The city is looked up inside the boundary, not above it. Resolving it in
// the page itself would put the answer in the prerendered shell, and a city
// added later would then keep answering "not found" until that shell was
// rebuilt. The cost is that an unknown city returns 200 with the not-found
// page rather than a 404; those pages are noindex, so nothing indexes them.
export default function CityExplorePage(props: PageProps) {
    return (
        <Suspense fallback={<div className="mx-auto max-w-7xl px-6 py-16 sm:px-10"><Skeleton className="h-72 rounded-3xl" /></div>}>
            <CityExplore {...props} />
        </Suspense>
    );
}
