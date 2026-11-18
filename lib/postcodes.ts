import { normalisePostcode } from "@/lib/locations";

// Where a lead actually is, from its postcode
//
// Google's terms let a place_id be kept and restrict the rest, so the
// import no longer writes an address at all (20270204090000). The
// postcode comes from the business's own site or is typed, and
// everything else is looked up from it here.
//
// Not the other way round. Reverse geocoding a shop's coordinates
// returns the nearest postcode centroid, which on a long road is
// routinely the wrong postcode: from Joe's Bakery's own coordinates the
// three nearest are BS7 8PH, BS7 8QN and BS7 8TJ, and the real one —
// BS7 8NZ — is not among them. Close enough for a map, useless on an
// envelope. Given the postcode, the same service answers exactly.
//
// postcodes.io: free, no key, Ordnance Survey OpenData and ONS data.
// Storing it is allowed and carries an attribution condition, which
// ATTRIBUTION below satisfies wherever the data is shown.
//
// Northern Ireland is not covered: BT postcodes come from Land and
// Property Services and commercial use needs a licence direct from
// them. Nothing stops a lookup returning one, so a BT postcode is
// refused here rather than quietly stored.

export const ATTRIBUTION =
    "Contains OS data © Crown copyright and database right. Source: Office for National Statistics licensed under the Open Government Licence v3.0.";

export type PostcodePlace = {
    postcode: string;
    latitude: number;
    longitude: number;
    ward: string | null;
    district: string | null;
    region: string | null;
};

export type PostcodeLookup =
    | { found: true; place: PostcodePlace }
    | { found: false; reason: "invalid" | "not_found" | "northern_ireland" | "unreachable" };

// The shape postcodes.io returns, pulled out so it can be tested
// without the network.
export function placeFromResult(result: unknown): PostcodePlace | null {
    if (!result || typeof result !== "object") return null;

    const row = result as Record<string, unknown>;
    const postcode = typeof row.postcode === "string" ? normalisePostcode(row.postcode) : null;
    const latitude = typeof row.latitude === "number" ? row.latitude : null;
    const longitude = typeof row.longitude === "number" ? row.longitude : null;

    // A postcode with no coordinates is no use for the thing this is
    // for, so it counts as not found rather than a half-filled row.
    if (!postcode || latitude === null || longitude === null) return null;

    const text = (value: unknown) => (typeof value === "string" && value.trim() ? value.trim() : null);

    return {
        postcode,
        latitude,
        longitude,
        ward: text(row.admin_ward),
        district: text(row.admin_district),
        region: text(row.region),
    };
}

export function isNorthernIreland(postcode: string) {
    return /^BT/i.test(postcode.replace(/\s/g, ""));
}

export async function lookupPostcode(raw: string | null | undefined): Promise<PostcodeLookup> {
    const postcode = normalisePostcode((raw ?? "").trim());

    if (!postcode) return { found: false, reason: "invalid" };
    if (isNorthernIreland(postcode)) return { found: false, reason: "northern_ireland" };

    try {
        const response = await fetch(
            `https://api.postcodes.io/postcodes/${encodeURIComponent(postcode)}`,
            { headers: { "User-Agent": "PromotelloBot/1.0" }, signal: AbortSignal.timeout(8000) },
        );

        if (response.status === 404) return { found: false, reason: "not_found" };
        if (!response.ok) return { found: false, reason: "unreachable" };

        const body = (await response.json()) as { result?: unknown };
        const place = placeFromResult(body.result);

        return place ? { found: true, place } : { found: false, reason: "not_found" };
    } catch {
        return { found: false, reason: "unreachable" };
    }
}
