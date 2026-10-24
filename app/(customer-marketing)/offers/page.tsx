import type { Metadata } from "next";

import { OffersListing, offersMetadata } from "./offers-listing";

export async function generateMetadata(): Promise<Metadata> {
    return offersMetadata(null);
}

type PageProps = {
    searchParams: Promise<{ search?: string; category?: string; area?: string; sort?: string }>;
};

// Every live offer, in every live city. /offers/<city> shows one city.
export default function OffersPage({ searchParams }: PageProps) {
    return <OffersListing city={null} searchParams={searchParams} />;
}
