type AddressFields = {
    address_line_1?: string | null;
    address_line_2?: string | null;
    city?: string | null;
    region?: string | null;
    postal_code?: string | null;
};

// Address lines in display order, skipping blanks and repeats, so a street
// that shares its name with the area ("Gloucester Road") appears once.
//
// The second line is the locality — what goes between the street and the
// town on an envelope. The region is our own area, which is a different
// thing: Horfield is a place the Post Office knows, Gloucester Road is
// how people say where something is. With both, printing both gave
// "240 – 242 Gloucester Road, Horfield, Gloucester Road, Bristol", which
// is not an address anybody would write.
//
// So the locality wins where there is one, and the area stands in where
// there is not — "Narrow Quay, Harbourside, Bristol" is how that business
// would write it, and it is the only neighbourhood we hold for them. The
// area is still on the page either way: it is in the heading and in the
// link back to the places near them.
export function addressParts(location: AddressFields | null | undefined) {
    if (!location) {
        return [];
    }

    const seen = new Set<string>();
    const locality = location.address_line_2?.trim() ? location.address_line_2 : location.region;

    return [
        location.address_line_1,
        locality,
        location.city,
        location.postal_code,
    ].filter((part): part is string => {
        const key = part?.trim().toLowerCase();

        if (!key || seen.has(key)) {
            return false;
        }

        seen.add(key);
        return true;
    });
}

export function directionsUrl(parts: string[]) {
    return parts.length > 0
        ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(parts.join(", "))}`
        : null;
}
