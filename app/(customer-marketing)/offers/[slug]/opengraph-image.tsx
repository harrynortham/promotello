import { offerShareImage } from "@/lib/offer-share";

// The link preview when an offer is shared on WhatsApp, Facebook, X and so on.
export const alt = "A promotion on Promotello";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OfferOpenGraphImage({ params }: { params: Promise<{ slug: string }> }) {
    return offerShareImage((await params).slug, "og");
}
