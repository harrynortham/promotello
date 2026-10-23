import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import { FiArrowLeft, FiCalendar, FiMapPin, FiTag } from "react-icons/fi";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatEventTime } from "@/lib/uk-time";
import { createPublicClient } from "@/utils/supabase/public";

type PageProps = { params: Promise<{ eventId: string }> };

type EventDetail = {
    id: string;
    title: string;
    description: string;
    starts_at: string;
    ends_at: string | null;
    location: string | null;
    price: string | null;
    business: { id: string; name: string } | null;
};

async function getEvent(eventId: string) {
    if (!/^[0-9a-f-]{36}$/i.test(eventId)) return null;

    const { data } = await createPublicClient()
        .from("business_events")
        .select("id, title, description, starts_at, ends_at, location, price, business:businesses ( id, name )")
        .eq("id", eventId)
        .maybeSingle();

    return data as unknown as EventDetail | null;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const event = await getEvent((await params).eventId);

    return event
        ? {
            title: `${event.title} at ${event.business?.name ?? "a local business"}`,
            description: `${formatEventTime(event.starts_at, event.ends_at)}. ${event.description}`.slice(0, 155),
        }
        : { title: "Event not found" };
}

async function EventContent({ params }: PageProps) {
    await connection();

    const event = await getEvent((await params).eventId);

    if (!event) {
        notFound();
    }

    return (
        <article className="rounded-3xl border border-[#17233B]/10 bg-white p-8 sm:p-10">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#FF593F]">Event</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">{event.title}</h1>
            {event.business && (
                <p className="mt-2 text-lg">
                    at{" "}
                    <Link href={`/businesses/${event.business.id}`} className="font-medium text-[#FF593F] hover:underline">
                        {event.business.name}
                    </Link>
                </p>
            )}

            <ul className="mt-6 space-y-2 text-[#17233B]/75">
                <li className="flex items-center gap-2">
                    <FiCalendar aria-hidden="true" className="text-[#FF593F]" />
                    {formatEventTime(event.starts_at, event.ends_at)}
                </li>
                {event.location && (
                    <li className="flex items-center gap-2">
                        <FiMapPin aria-hidden="true" className="text-[#FF593F]" />
                        {event.location}
                    </li>
                )}
                {event.price && (
                    <li className="flex items-center gap-2">
                        <FiTag aria-hidden="true" className="text-[#FF593F]" />
                        {event.price}
                    </li>
                )}
            </ul>

            {event.description && (
                <p className="mt-6 whitespace-pre-line leading-7 text-[#17233B]/75">{event.description}</p>
            )}

            {event.business && (
                <Button render={<Link href={`/businesses/${event.business.id}`} />} nativeButton={false} className="mt-8">
                    See {event.business.name}
                </Button>
            )}
        </article>
    );
}

export default function EventPage(props: PageProps) {
    return (
        <main className="min-h-screen bg-[#FFF8F0] px-6 py-10 text-[#17233B] sm:px-10">
            <div className="mx-auto max-w-3xl">
                <Button render={<Link href="/events" />} nativeButton={false} variant="ghost" size="sm">
                    <FiArrowLeft aria-hidden="true" />
                    All events
                </Button>
                <div className="mt-4">
                    <Suspense fallback={<Skeleton className="h-96 rounded-3xl" />}>
                        <EventContent {...props} />
                    </Suspense>
                </div>
            </div>
        </main>
    );
}
