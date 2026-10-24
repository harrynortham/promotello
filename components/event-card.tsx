import { businessPath } from "@/lib/slugs";
import Link from "next/link";
import { FiCalendar, FiMapPin } from "react-icons/fi";

import { formatEventTime } from "@/lib/uk-time";

export type EventSummary = {
    id: string;
    title: string;
    description: string;
    starts_at: string;
    ends_at: string | null;
    location: string | null;
    price: string | null;
    business?: { id: string; slug: string; name: string } | null;
};

export function EventCard({ event }: { event: EventSummary }) {
    const day = new Intl.DateTimeFormat("en-GB", { day: "numeric", timeZone: "Europe/London" }).format(new Date(event.starts_at));
    const month = new Intl.DateTimeFormat("en-GB", { month: "short", timeZone: "Europe/London" }).format(new Date(event.starts_at));

    return (
        <article className="flex gap-4 rounded-2xl border border-[#17233B]/10 bg-white p-5">
            <div className="flex size-16 shrink-0 flex-col items-center justify-center rounded-xl bg-[#FF593F]/10 text-[#C2341F]">
                <span className="text-2xl font-semibold leading-none">{day}</span>
                <span className="text-xs font-semibold uppercase">{month}</span>
            </div>
            <div className="min-w-0">
                <h3 className="font-semibold leading-snug">
                    <Link href={`/events/${event.id}`} className="hover:text-[#FF593F]">
                        {event.title}
                    </Link>
                </h3>
                {event.business && (
                    <p className="mt-0.5 text-sm">
                        <Link href={businessPath(event.business)} className="text-[#17233B]/70 hover:text-[#FF593F]">
                            {event.business.name}
                        </Link>
                    </p>
                )}
                <p className="mt-2 flex items-center gap-1.5 text-sm text-[#17233B]/60">
                    <FiCalendar aria-hidden="true" className="shrink-0" />
                    {formatEventTime(event.starts_at, event.ends_at)}
                    {event.price ? ` · ${event.price}` : ""}
                </p>
                {event.location && (
                    <p className="mt-1 flex items-center gap-1.5 text-sm text-[#17233B]/60">
                        <FiMapPin aria-hidden="true" className="shrink-0" />
                        {event.location}
                    </p>
                )}
            </div>
        </article>
    );
}
