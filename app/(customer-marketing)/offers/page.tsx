import { Suspense } from "react";
import type { Metadata } from "next";

import { NotHereYet, VisitorLoading } from "@/components/visitor-city";
import { getVisitorContext } from "@/lib/visitor";
import { OffersListing, offersMetadata } from "./offers-listing";

export async function generateMetadata(): Promise<Metadata> {
    return offersMetadata(null);
}

type PageProps = {
    searchParams: Promise<{ search?: string; category?: string; area?: string; sort?: string }>;
};

async function VisitorOffers({ searchParams }: PageProps) {
    const visitor = await getVisitorContext();

    return (
        <>
            <NotHereYet visitor={visitor} />
            <OffersListing city={visitor.city} searchParams={searchParams} />
        </>
    );
}

// Offers in the visitor's city (their choice, or where they are), or in
// every live city. /offers/<city> always shows that city.
export default function OffersPage(props: PageProps) {
    return (
        <Suspense fallback={<VisitorLoading />}>
            <VisitorOffers {...props} />
        </Suspense>
    );
}
