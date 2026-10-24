import { createPublicClient } from "@/utils/supabase/public";

export type CityOption = {
    id: string;
    slug: string;
    name: string;
    postcodeDistricts: string[];
    areas: { id: string; name: string }[];
};

// Live cities and their active areas, for location forms. Platform admins
// can pass includeNotLive to set up a business in a city before launch.
export async function getCityOptions({ includeNotLive = false } = {}): Promise<CityOption[]> {
    let query = createPublicClient()
        .from("cities")
        .select("id, slug, name, postcode_districts, is_live, areas ( id, name, is_active )")
        .order("name");

    if (!includeNotLive) {
        query = query.eq("is_live", true);
    }

    const { data } = await query;

    return (data ?? []).map((city) => ({
        id: city.id,
        slug: city.slug,
        name: city.name,
        postcodeDistricts: city.postcode_districts ?? [],
        areas: (city.areas ?? [])
            .filter((area) => area.is_active)
            .map(({ id, name }) => ({ id, name }))
            .sort((a, b) => a.name.localeCompare(b.name)),
    }));
}

// "bs7 8aa" → "BS7 8AA", or null if it isn't a full UK postcode. Must
// match public.normalise_postcode().
export function normalisePostcode(raw: string) {
    const compact = raw.replace(/\s/g, "").toUpperCase();
    return /^[A-Z]{1,2}[0-9][A-Z0-9]?[0-9][A-Z]{2}$/.test(compact)
        ? `${compact.slice(0, -3)} ${compact.slice(-3)}`
        : null;
}
