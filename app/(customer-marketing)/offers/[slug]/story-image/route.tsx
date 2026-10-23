import { storyImage } from "@/lib/story-image";
import { createPublicClient } from "@/utils/supabase/public";

// Instagram story image for an offer: /offers/<slug>/story-image
export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;

    const { data: offer } = await createPublicClient()
        .from("offers")
        .select("title, discount, availability, businesses ( name )")
        .eq("slug", slug)
        .eq("approval_status", "approved")
        .maybeSingle<{ title: string; discount: string; availability: string; businesses: { name: string } | null }>();

    if (!offer) {
        return new Response("Not found", { status: 404 });
    }

    return storyImage({
        eyebrow: "Offer",
        headline: offer.title,
        badge: offer.discount,
        detail: offer.availability,
        business: offer.businesses?.name ?? "",
        url: `promotello.com/offers/${slug}`,
    });
}
