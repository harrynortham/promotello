import type { Metadata } from "next";

import { BusinessesListing, businessesMetadata } from "./businesses-listing";

export async function generateMetadata(): Promise<Metadata> {
    return businessesMetadata(null);
}

type PageProps = {
    searchParams: Promise<{ search?: string; category?: string; area?: string }>;
};

// Every approved business, in every live city. /businesses/<city> shows one.
export default function BusinessesPage({ searchParams }: PageProps) {
    return <BusinessesListing city={null} searchParams={searchParams} />;
}
