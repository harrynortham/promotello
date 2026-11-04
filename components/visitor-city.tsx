import { cookies } from "next/headers";
import Link from "next/link";

import { CityInterestForm } from "@/components/city-interest-form";
import { DismissibleNotice } from "@/components/dismissible-notice";
import { Skeleton } from "@/components/ui/skeleton";
import { NOTICE_COOKIE } from "@/lib/city-cookie";
import { getLiveCities, listPlaces } from "@/lib/cities";
import type { VisitorContext } from "@/lib/visitor";

// Shown above the listings when we don't know which city the visitor wants:
// they're outside every live city, or we couldn't place them at all.
//
// With one city there is nothing to choose between, so the only thing worth
// saying is that we aren't where they are. With several, which one they want
// is the first thing to settle — a merged list of three cities is no use to
// anyone, and the city that joined most recently would fill most of it.
//
// Someone who deliberately chose "Everywhere" is left alone: they asked for
// this, and being nagged to pick a city would be rude.
export async function CityNotice({ visitor, basePath }: { visitor: VisitorContext; basePath: string }) {
    if (visitor.city || visitor.source === "chosen") return null;

    // Closed once, stays closed. Read on the server so it never flashes up
    // and then disappears.
    if ((await cookies()).get(NOTICE_COOKIE)) return null;

    const cities = await getLiveCities();

    if (cities.length === 0) return null;

    const town = visitor.outsideTown;
    const places = listPlaces(cities.map((city) => city.name));

    if (cities.length === 1) {
        // Nothing to pick from, and nothing to say to someone we can't place.
        if (!town) return null;

        return (
            <DismissibleNotice label="Promotello near you">
                <p className="text-sm">
                    <strong>Promotello isn&apos;t in {town} yet</strong>, so you&apos;re seeing {places}.
                    Somewhere else? Change the town and we&apos;ll tell you when we reach you.
                </p>
                <CityInterestForm town={town} />
            </DismissibleNotice>
        );
    }

    return (
        <DismissibleNotice label={town ? "Promotello near you" : "Choose a city"}>
            <div className="min-w-0">
                <p className="text-sm">
                    {town ? (
                        <>
                            <strong>Promotello isn&apos;t in {town} yet.</strong> We&apos;re in {places} —
                            pick one to look around, or change the town below.
                        </>
                    ) : (
                        <>
                            <strong>Where are you?</strong> Promotello is in {places}.
                            Pick one to see what&apos;s near you.
                        </>
                    )}
                </p>

                <div className="mt-3 flex flex-wrap gap-2">
                    {cities.map((city) => (
                        <Link
                            key={city.id}
                            href={`${basePath}/${city.slug}`}
                            className="inline-flex min-h-9 items-center rounded-full bg-white px-4 text-sm font-medium text-[#17233B] shadow-sm ring-1 ring-[#17233B]/10 transition hover:ring-[#FF593F] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF593F]"
                        >
                            {city.name}
                        </Link>
                    ))}
                </div>
            </div>

            {town && <CityInterestForm town={town} />}
        </DismissibleNotice>
    );
}

// While we work out the visitor's city.
export function VisitorLoading() {
    return (
        <main className="min-h-screen bg-[#FFF8F0] pb-24">
            <div className="mx-auto max-w-7xl px-6 py-12 sm:px-10 sm:py-16">
                <Skeleton className="h-64 rounded-3xl" />
                <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                    {[1, 2, 3, 4].map((item) => (
                        <Skeleton key={item} className="aspect-[3/4] rounded-2xl" />
                    ))}
                </div>
            </div>
        </main>
    );
}
