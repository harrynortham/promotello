import { offerShareImage } from "@/lib/offer-share";

// Square feed post image for an offer: /offers/<slug>/post-image
export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
    return offerShareImage((await params).slug, "post");
}
