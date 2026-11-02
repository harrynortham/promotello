import { businessShareImage } from "@/lib/business-share";

// Instagram story image for a business: /businesses/<slug>/story-image
export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
    return businessShareImage((await params).slug, "story");
}
