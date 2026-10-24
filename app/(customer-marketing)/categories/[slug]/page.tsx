import { Suspense } from "react";
import type { Metadata } from "next";

import { NotHereYet } from "@/components/visitor-city";
import { getVisitorContext } from "@/lib/visitor";
import { CategoryContent, CategoryLoading, categoryMetadata } from "./category-content";

type PageProps = {
    params: Promise<{ slug: string }>;
    searchParams: Promise<{ sub?: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    return categoryMetadata((await params).slug, null);
}

// The category in the visitor's city, or in every live city.
// /categories/<category>/<city> always shows that city.
async function VisitorCategory({ params, searchParams }: PageProps) {
    const [{ slug }, visitor] = await Promise.all([params, getVisitorContext()]);

    return (
        <>
            <NotHereYet visitor={visitor} />
            <div className="pt-8">
                <CategoryContent slug={slug} city={visitor.city} searchParams={searchParams} />
            </div>
        </>
    );
}

export default function CategoryPage(props: PageProps) {
    return (
        <main className="min-h-screen bg-[#FFF8F0] pb-24 text-[#17233B]">
            <Suspense fallback={<div className="pt-8"><CategoryLoading /></div>}>
                <VisitorCategory {...props} />
            </Suspense>
        </main>
    );
}
