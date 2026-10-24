import { shareImage, type ShareImageFormat } from "@/lib/story-image";
import { createPublicClient } from "@/utils/supabase/public";

type SharedOffer = {
    title: string;
    discount: string;
    availability: string;
    image_url: string | null;
    businesses: { name: string } | null;
};

// A share image for a live offer, or a 404 if there's no such offer.
export async function offerShareImage(slug: string, format: ShareImageFormat) {
    const { data: offer } = await createPublicClient()
        .from("offers")
        .select("title, discount, availability, image_url, businesses ( name )")
        .eq("slug", slug)
        .eq("approval_status", "approved")
        .maybeSingle<SharedOffer>();

    if (!offer) {
        return new Response("Not found", { status: 404 });
    }

    return shareImage(
        {
            eyebrow: "Offer",
            headline: offer.title,
            badge: offer.discount,
            detail: offer.availability,
            business: offer.businesses?.name ?? "",
            url: `promotello.com/offers/${slug}`,
            imageUrl: offer.image_url,
        },
        format,
    );
}
