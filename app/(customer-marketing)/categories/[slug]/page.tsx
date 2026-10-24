import { Suspense } from "react";
import type { Metadata } from "next";

import { CategoryContent, CategoryLoading, categoryMetadata } from "./category-content";

type PageProps = {
    params: Promise<{ slug: string }>;
    searchParams: Promise<{ sub?: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    return categoryMetadata((await params).slug, null);
}

async function AllCitiesCategory({ params, searchParams }: PageProps) {
    return <CategoryContent slug={(await params).slug} city={null} searchParams={searchParams} />;
}

export default function CategoryPage(props: PageProps) {
    return (
        <main className="min-h-screen bg-[#FFF8F0] pb-24 pt-8 text-[#17233B]">
            <Suspense fallback={<CategoryLoading />}>
                <AllCitiesCategory {...props} />
            </Suspense>
        </main>
    );
}
