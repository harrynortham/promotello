import { EVENTS_ENABLED } from "@/lib/features";
import { storyImage } from "@/lib/story-image";
import { formatEventTime } from "@/lib/uk-time";
import { createPublicClient } from "@/utils/supabase/public";

// Instagram story image for an event: /events/<id>/story-image
export async function GET(_request: Request, { params }: { params: Promise<{ eventId: string }> }) {
    const { eventId } = await params;

    if (!EVENTS_ENABLED || !/^[0-9a-f-]{36}$/i.test(eventId)) {
        return new Response("Not found", { status: 404 });
    }

    const { data: event } = await createPublicClient()
        .from("business_events")
        .select("title, starts_at, ends_at, price, businesses ( name )")
        .eq("id", eventId)
        .maybeSingle<{ title: string; starts_at: string; ends_at: string | null; price: string | null; businesses: { name: string } | null }>();

    if (!event) {
        return new Response("Not found", { status: 404 });
    }

    return storyImage({
        eyebrow: "Event",
        headline: event.title,
        badge: event.price ?? undefined,
        detail: formatEventTime(event.starts_at, event.ends_at),
        business: event.businesses?.name ?? "",
        url: `promotello.com/events/${eventId}`,
    });
}
