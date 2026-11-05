import { offerShareImage } from "@/lib/offer-share";

// The link preview when an offer is shared on WhatsApp, Facebook, X and so on.
export const alt = "An offer on Promotello";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

import { cityListingShareImage } from "@/lib/listing-share";

export default async function OfferOpenGraphImage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;

    // The same address serves the city listing, which is not a
    // offer and used to share as a broken image.
    return (await cityListingShareImage(slug, "offers", "og")) ?? offerShareImage(slug, "og");
}
