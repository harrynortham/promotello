import { Suspense } from "react";
import type { Metadata } from "next";

import { NotHereYet, VisitorLoading } from "@/components/visitor-city";
import { getVisitorContext } from "@/lib/visitor";
import { BusinessesListing, businessesMetadata } from "./businesses-listing";

export async function generateMetadata(): Promise<Metadata> {
    return businessesMetadata(null);
}

type PageProps = {
    searchParams: Promise<{ search?: string; category?: string; area?: string }>;
};

async function VisitorBusinesses({ searchParams }: PageProps) {
    const visitor = await getVisitorContext();

    return (
        <>
            <NotHereYet visitor={visitor} />
            <BusinessesListing city={visitor.city} searchParams={searchParams} />
        </>
    );
}

// Businesses in the visitor's city, or in every live city.
// /businesses/<city> always shows that city.
export default function BusinessesPage(props: PageProps) {
    return (
        <Suspense fallback={<VisitorLoading />}>
            <VisitorBusinesses {...props} />
        </Suspense>
    );
}
