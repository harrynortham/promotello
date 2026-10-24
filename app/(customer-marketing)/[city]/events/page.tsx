import { Suspense } from "react";
import type { Metadata } from "next";
import { connection } from "next/server";
import { notFound } from "next/navigation";

import { EventCard, type EventSummary } from "@/components/event-card";
import { EmptyState } from "@/components/listing-ui";
import { Skeleton } from "@/components/ui/skeleton";
import { cityPath, getLiveCity, requireCity, type City } from "@/lib/cities";
import { EVENTS_ENABLED } from "@/lib/features";
import { createPublicClient } from "@/utils/supabase/public";

// The city comes from the URL and is checked first (see the layout).
export const instant = false;

export async function generateMetadata({ params }: { params: Promise<{ city: string }> }): Promise<Metadata> {
    const city = await getLiveCity((await params).city);
    const name = city?.name ?? "your city";

    return {
        title: `Events in ${name}`,
        description: `Tastings, live music, workshops and more at independent businesses across ${name}.`,
        alternates: { canonical: `/${(await params).city}/events` },
    };
}

function nowIso() {
    return new Date().toISOString();
}

async function UpcomingEvents({ city }: { city: City }) {
    await connection();

    const { data } = await createPublicClient()
        .from("business_events")
        .select("id, title, description, starts_at, ends_at, location, price, business:businesses ( id, name, business_locations ( city_id ) )")
        .or(`ends_at.gte.${nowIso()},and(ends_at.is.null,starts_at.gte.${nowIso()})`)
        .order("starts_at", { ascending: true })
        .limit(60);

    // Only events at businesses in this city.
    const events = ((data ?? []) as unknown as (EventSummary & {
        business: { business_locations: { city_id: string | null }[] } | null;
    })[]).filter((event) => event.business?.business_locations.some((location) => location.city_id === city.id));

    if (events.length === 0) {
        return (
            <EmptyState
                title="No events coming up yet"
                description="Local businesses add tastings, live music and workshops here. Check back soon."
                href={`${cityPath(city)}/offers`}
                linkLabel="Browse offers"
            />
        );
    }

    return (
        <div className="grid gap-4 md:grid-cols-2">
            {events.map((event) => (
                <EventCard key={event.id} event={event} />
            ))}
        </div>
    );
}

export default async function EventsPage({ params }: { params: Promise<{ city: string }> }) {
    if (!EVENTS_ENABLED) {
        notFound();
    }

    const city = await requireCity(params);

    return (
        <main className="min-h-screen bg-[#FFF8F0] pb-24 text-[#17233B]">
            <section className="border-b border-[#17233B]/10 bg-white">
                <div className="mx-auto max-w-7xl px-6 py-12 sm:px-10 sm:py-16">
                    <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#FF593F]">What&apos;s on</p>
                    <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">Events across {city.name}</h1>
                    <p className="mt-3 max-w-2xl text-lg text-[#17233B]/65">
                        Tastings, live music, workshops and late openings at independent businesses.
                    </p>
                </div>
            </section>

            <div className="mx-auto max-w-7xl px-6 pt-10 sm:px-10">
                <Suspense
                    fallback={
                        <div className="grid gap-4 md:grid-cols-2">
                            {[1, 2, 3, 4].map((item) => (
                                <Skeleton key={item} className="h-32 rounded-2xl" />
                            ))}
                        </div>
                    }
                >
                    <UpcomingEvents city={city} />
                </Suspense>
            </div>
        </main>
    );
}
