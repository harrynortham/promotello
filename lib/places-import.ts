// Finding out who is trading on a street.
//
// Google's terms are the shape of this file. A place_id may be kept
// indefinitely; names, addresses, ratings and photos have no caching
// exception, and bulk storing them is called out by name. So nothing here
// writes to the database. It returns what Google said, once, for somebody
// to look at and choose from — and what gets kept is whatever they decide
// to keep, as their own record, plus the place_id that ties a second
// import of the same street to the leads already on it.
//
// Check the live terms before changing this. They are revised, and the
// EEA version differs from the general one.

export type PlaceResult = {
    place_id: string;
    name: string;
    address: string | null;
    website: string | null;
    phone: string | null;
    // Already a lead, matched on place_id. Shown so the same street can be
    // imported twice without making duplicates.
    known: boolean;
};

export type PlacesSearch =
    | { ok: true; results: PlaceResult[] }
    | { ok: false; reason: "no_key" | "failed"; detail?: string };

// What a business has to look like to be worth a row. Promotello is for
// independent shops, so the chains and the things that are not shops at
// all are left out before anybody has to read them.
const NOT_FOR_US = [
    "lodging", "atm", "bank", "gas_station", "car_dealer", "car_rental",
    "hospital", "doctor", "dentist", "lawyer", "insurance_agency",
    "real_estate_agency", "school", "university", "church", "city_hall",
    "police", "post_office", "storage", "moving_company", "funeral_home",
];

export async function searchArea(query: string): Promise<PlacesSearch> {
    const key = process.env.GOOGLE_PLACES_API_KEY?.trim();

    if (!key) {
        return { ok: false, reason: "no_key" };
    }

    try {
        // The newer Places endpoint, which takes the fields it may return
        // as a header: asking for less is both cheaper and less to
        // explain. No ratings, no photos, no opening hours — none of it
        // would be kept anyway.
        const response = await fetch("https://places.googleapis.com/v1/places:searchText", {
            method: "POST",
            headers: {
                "content-type": "application/json",
                "X-Goog-Api-Key": key,
                "X-Goog-FieldMask": [
                    "places.id",
                    "places.displayName",
                    "places.formattedAddress",
                    "places.websiteUri",
                    "places.nationalPhoneNumber",
                    "places.primaryType",
                    "places.types",
                ].join(","),
            },
            body: JSON.stringify({ textQuery: query, maxResultCount: 20 }),
        });

        if (!response.ok) {
            return { ok: false, reason: "failed", detail: `${response.status}` };
        }

        const body = (await response.json()) as {
            places?: {
                id: string;
                displayName?: { text?: string };
                formattedAddress?: string;
                websiteUri?: string;
                nationalPhoneNumber?: string;
                types?: string[];
            }[];
        };

        const results = (body.places ?? [])
            .filter((place) => !(place.types ?? []).some((type) => NOT_FOR_US.includes(type)))
            .map((place) => ({
                place_id: place.id,
                name: place.displayName?.text ?? "",
                address: place.formattedAddress ?? null,
                website: place.websiteUri ?? null,
                phone: place.nationalPhoneNumber ?? null,
                known: false,
            }))
            .filter((place) => place.place_id && place.name);

        return { ok: true, results };
    } catch (error) {
        return { ok: false, reason: "failed", detail: error instanceof Error ? error.message : "unknown" };
    }
}

// "Bakeries in Bedminster, Bristol" — the unit of work is an area, which
// is how the rest of the product thinks about places too
// (docs/MULTI-CITY.md).
export function areaQuery(what: string, area: string, city: string) {
    return `${what} in ${area}, ${city}, UK`.replace(/\s+/g, " ").trim();
}
