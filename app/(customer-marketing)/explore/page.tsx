import type { Metadata } from "next";

import { ExploreListing, exploreMetadata } from "./explore-listing";

export async function generateMetadata(): Promise<Metadata> {
    return exploreMetadata(null);
}

// Neighbourhoods in every live city. /explore/<city> shows one city.
export default function ExplorePage({ searchParams }: { searchParams: Promise<{ area?: string }> }) {
    return <ExploreListing city={null} searchParams={searchParams} />;
}
