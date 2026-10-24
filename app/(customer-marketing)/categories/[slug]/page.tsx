import { redirectToCity } from "@/lib/city-redirect";

// Only redirects, so it can wait for the request (a real 307, not a page).
export const instant = false;

// Category pages now live under the city (e.g. /bristol/categories/food-drink).
export default async function Page({
    params,
    searchParams,
}: {
    params: Promise<{ slug: string }>;
    searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
    return redirectToCity(`/categories/${(await params).slug}`, searchParams);
}
