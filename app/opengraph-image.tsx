import { shareImage } from "@/lib/story-image";
import { siteName } from "@/lib/site";

// The link preview for every page that doesn't make its own — the home
// page, the listings, the category and area pages. Businesses, offers and
// posts have their own, built from what's on them.
export const alt = `${siteName}: local offers from independent businesses`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpenGraphImage() {
    return shareImage(
        {
            eyebrow: "Local offers",
            headline: "Offers from the independents near you",
            detail: "Claim on your phone. Show the code when you pay.",
            business: siteName,
            url: "promotello.com",
        },
        "og",
    );
}
