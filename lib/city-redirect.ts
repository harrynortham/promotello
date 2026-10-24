import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { CITY_COOKIE } from "@/lib/city-cookie";
import { cityPath, preferredCity } from "@/lib/cities";

type SearchParams = Record<string, string | string[] | undefined>;

// Old, city-less listing URLs (/offers, /categories/…) and / send visitors
// to the same page in their city, keeping any search or filters.
export async function redirectToCity(path: string, searchParams?: Promise<SearchParams>) {
    const city = await preferredCity((await cookies()).get(CITY_COOKIE)?.value);

    if (!city) {
        redirect("/business");
    }

    const query = new URLSearchParams();

    for (const [key, value] of Object.entries((await searchParams) ?? {})) {
        for (const item of Array.isArray(value) ? value : value ? [value] : []) {
            query.append(key, item);
        }
    }

    const search = query.toString();
    redirect(`${cityPath(city, path)}${search ? `?${search}` : ""}`);
}
