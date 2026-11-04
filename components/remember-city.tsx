"use client";

import { useEffect } from "react";

import { rememberCity } from "@/lib/city-cookie";

// Remembers the city whose page this is, so the header links — which are the
// same on every page — keep showing that city afterwards. Without it, someone
// arriving at /offers/bath from a search result and tapping "Businesses"
// would land back on every location.
//
// Only the city's own pages use this. The pages that work out a city from the
// visitor's location deliberately don't, so a detected city is never written
// down as a choice.
export function RememberCity({ slug }: { slug: string }) {
    useEffect(() => {
        rememberCity(slug);
    }, [slug]);

    return null;
}
