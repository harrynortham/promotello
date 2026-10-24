import { redirectToCity } from "@/lib/city-redirect";

// Only redirects, so it can wait for the request (a real 307, not a page).
export const instant = false;

// Listings now live under the city (e.g. /bristol/categories): send visitors to theirs.
export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
    return redirectToCity("/categories", searchParams);
}
