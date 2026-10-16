import { Suspense } from "react";

import OffersContent from "./offers-content";

function OffersLoading() {
    return (
        <main className="min-h-screen bg-[#FFF8F0] px-6 py-12 sm:px-10">
            <div className="mx-auto max-w-7xl">
                <div className="h-56 animate-pulse rounded-3xl bg-[#17233B]/10" />

                <div className="mt-8 grid gap-6 md:grid-cols-2">
                    {[1, 2, 3, 4].map((item) => (
                        <div
                            key={item}
                            className="h-80 animate-pulse rounded-3xl bg-white"
                        />
                    ))}
                </div>
            </div>
        </main>
    );
}

export default function OffersPage() {
    return (
        <Suspense fallback={<OffersLoading />}>
            <OffersContent />
        </Suspense>
    );
}