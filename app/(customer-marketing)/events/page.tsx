import { Suspense } from "react";
import type { Metadata } from "next";
import { connection } from "next/server";
import { notFound } from "next/navigation";

import { EventCard, type EventSummary } from "@/components/event-card";
import { EmptyState } from "@/components/listing-ui";
import { Skeleton } from "@/components/ui/skeleton";
import { EVENTS_ENABLED } from "@/lib/features";
import { createPublicClient } from "@/utils/supabase/public";

export const metadata: Metadata = {
    title: "Local events",
    description: "Tastings, live music, workshops and more at independent local businesses.",
    alternates: { canonical: "/events" },
};

function nowIso() {
    return new Date().toISOString();
}

async function UpcomingEvents() {
    await connection();

    const { data } = await createPublicClient()
        .from("business_events")
        .select("id, title, description, starts_at, ends_at, location, price, business:businesses ( id, slug, name )")
        .or(`ends_at.gte.${nowIso()},and(ends_at.is.null,starts_at.gte.${nowIso()})`)
        .order("starts_at", { ascending: true })
        .limit(60);

    const events = (data ?? []) as unknown as EventSummary[];

    if (events.length === 0) {
        return (
            <EmptyState
                title="No events coming up yet"
                description="Local businesses add tastings, live music and workshops here. Check back soon."
                href="/offers"
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

export default function EventsPage() {
    if (!EVENTS_ENABLED) {
        notFound();
    }

    return (
        <main className="min-h-screen bg-[#FFF8F0] pb-24 text-[#17233B]">
            <section className="border-b border-[#17233B]/10 bg-white">
                <div className="mx-auto max-w-7xl px-6 py-12 sm:px-10 sm:py-16">
                    <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#FF593F]">What&apos;s on</p>
                    <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">Local events</h1>
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
                    <UpcomingEvents />
                </Suspense>
            </div>
        </main>
    );
}
