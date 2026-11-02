import { businessShareImage } from "@/lib/business-share";

// The link preview when a business page is shared on WhatsApp, Facebook, X
// and so on. Without it, the page a loyalty card is joined from shares as
// a bare link.
export const alt = "A business on Promotello";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function BusinessOpenGraphImage({ params }: { params: Promise<{ slug: string }> }) {
    return businessShareImage((await params).slug, "og");
}
