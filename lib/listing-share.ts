import { getLiveCity } from "@/lib/cities";
import { shareImage, type ShareImageFormat } from "@/lib/story-image";
import { siteName } from "@/lib/site";

// /offers/<slug> and /businesses/<slug> are an offer or a business — or a
// city's listing, when the slug is a live city. The share image route sits
// on the same address, so it has to answer for both: without this, every
// city listing offered a link preview that 404'd.
export async function cityListingShareImage(
    slug: string,
    kind: "offers" | "businesses",
    format: ShareImageFormat,
) {
    const city = await getLiveCity(slug);

    if (!city) return null;

    return shareImage(
        {
            eyebrow: kind === "offers" ? "Local offers" : "Local independents",
            headline:
                kind === "offers"
                    ? `Offers across ${city.name}`
                    : `${city.name}'s independent businesses`,
            detail:
                kind === "offers"
                    ? "Claim on your phone. Show the code when you pay."
                    : "Cafés, shops, studios and stays run by people nearby.",
            business: siteName,
            url: `promotello.com/${kind}/${city.slug}`,
        },
        format,
    );
}
