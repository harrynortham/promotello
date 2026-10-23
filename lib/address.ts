type AddressFields = {
    address_line_1?: string | null;
    address_line_2?: string | null;
    city?: string | null;
    region?: string | null;
    postal_code?: string | null;
};

// Address lines in display order, skipping blanks and repeats, so a street
// that shares its name with the area ("Gloucester Road") appears once.
export function addressParts(location: AddressFields | null | undefined) {
    if (!location) {
        return [];
    }

    const seen = new Set<string>();

    return [
        location.address_line_1,
        location.address_line_2,
        location.region,
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
