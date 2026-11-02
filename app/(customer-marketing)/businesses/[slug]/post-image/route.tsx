import { businessShareImage } from "@/lib/business-share";

// Square post image for a business: /businesses/<slug>/post-image
export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
    return businessShareImage((await params).slug, "post");
}
