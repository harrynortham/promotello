"use client";

import { useEffect } from "react";

import { CITY_COOKIE } from "@/lib/city-cookie";

// Remembers the city being browsed, so / and old links come back to it.
export function RememberCity({ slug }: { slug: string }) {
    useEffect(() => {
        document.cookie = `${CITY_COOKIE}=${slug}; Max-Age=${60 * 60 * 24 * 365}; path=/; SameSite=Lax`;
    }, [slug]);

    return null;
}
