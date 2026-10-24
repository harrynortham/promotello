import { Suspense } from "react";
import type { Metadata } from "next";

import { NotHereYet, VisitorLoading } from "@/components/visitor-city";
import { getVisitorContext } from "@/lib/visitor";
import { ExploreListing, exploreMetadata } from "./explore-listing";

export async function generateMetadata(): Promise<Metadata> {
    return exploreMetadata(null);
}

type PageProps = { searchParams: Promise<{ area?: string }> };

async function VisitorExplore({ searchParams }: PageProps) {
    const visitor = await getVisitorContext();

    return (
        <>
            <NotHereYet visitor={visitor} />
            <ExploreListing city={visitor.city} searchParams={searchParams} />
        </>
    );
}

// Neighbourhoods in the visitor's city, or in every live city.
// /explore/<city> always shows that city.
export default function ExplorePage(props: PageProps) {
    return (
        <Suspense fallback={<VisitorLoading />}>
            <VisitorExplore {...props} />
        </Suspense>
    );
}
