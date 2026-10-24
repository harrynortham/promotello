import { offerShareImage } from "@/lib/offer-share";

// Instagram story image for an offer: /offers/<slug>/story-image
export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
    return offerShareImage((await params).slug, "story");
}
