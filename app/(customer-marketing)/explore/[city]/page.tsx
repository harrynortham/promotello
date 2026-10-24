import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Skeleton } from "@/components/ui/skeleton";
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

    return <ExploreListing city={city} searchParams={searchParams} />;
}

// One city's neighbourhoods, e.g. /explore/bristol.
export default function CityExplorePage(props: PageProps) {
    return (
        <Suspense fallback={<div className="mx-auto max-w-7xl px-6 py-16 sm:px-10"><Skeleton className="h-72 rounded-3xl" /></div>}>
            <CityExplore {...props} />
        </Suspense>
    );
}
