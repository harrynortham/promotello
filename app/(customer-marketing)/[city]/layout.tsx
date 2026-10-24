import { Suspense, type ReactNode } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { getLiveCities, requireCity } from "@/lib/cities";
import { RememberCity } from "./remember-city";

// Customer pages for one city: /bristol, /bristol/offers and so on.

export async function generateStaticParams() {
    return (await getLiveCities()).map((city) => ({ city: city.slug }));
}

// The city is checked before anything is sent, so unknown or not-yet-live
// cities get a real 404. The lookup is cached, so this is quick.
export const instant = false;

export default async function CityLayout({ children, params }: { children: ReactNode; params: Promise<{ city: string }> }) {
    const city = await requireCity(params);

    return (
        <>
            <RememberCity slug={city.slug} />
            <Suspense
                fallback={
                    <div className="mx-auto max-w-7xl px-6 py-16 sm:px-10">
                        <Skeleton className="h-64 rounded-3xl" />
                    </div>
                }
            >
                {children}
            </Suspense>
        </>
    );
}
