import { notFound } from "next/navigation";

import { redirectToCity } from "@/lib/city-redirect";
import { EVENTS_ENABLED } from "@/lib/features";

// Only redirects, so it can wait for the request (a real 307, not a page).
export const instant = false;

// Listings now live under the city (e.g. /bristol/events): send visitors to theirs.
export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
    if (!EVENTS_ENABLED) {
        notFound();
    }

    return redirectToCity("/events", searchParams);
}
