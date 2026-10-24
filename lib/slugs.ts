import { createPublicClient } from "@/utils/supabase/public";

// Business and offer addresses end with a short unique id:
//   /businesses/harbour-grind-clifton-bristol-k3x9q2
//   /offers/harbour-grind-20-off-flat-whites-a7d2kq
// The database sets slugs from the name (and, for businesses, the area and
// city). Old addresses, including /businesses/<uuid>, redirect permanently.

export function businessPath(business: { slug: string }) {
    return `/businesses/${business.slug}`;
}

export function offerPath(offer: { slug: string }) {
    return `/offers/${offer.slug}`;
}

// The current path for an outdated /businesses/<segment> or
// /offers/<segment> address, or null if it's current or unknown.
export async function canonicalPath(kind: "business" | "offer", segment: string): Promise<string | null> {
    const { data } = await createPublicClient().rpc("canonical_path", { kind, segment });
    return typeof data === "string" ? data : null;
}

// For the proxy: /businesses/<segment> and /offers/<segment> only.
export async function movedAddress(pathname: string): Promise<string | null> {
    const [, section, segment, extra] = pathname.split("/");

    if (!segment || extra !== undefined) return null;
    if (section === "businesses") return canonicalPath("business", segment);
    if (section === "offers") return canonicalPath("offer", segment);

    return null;
}
