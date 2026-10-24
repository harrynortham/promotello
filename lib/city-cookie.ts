// The place a visitor chose in the location search: a city slug, or "all"
// for every location. Wins over their detected location.
export const CITY_COOKIE = "promotello_city";
export const ALL_LOCATIONS = "all";

export function rememberCity(value: string) {
    document.cookie = `${CITY_COOKIE}=${encodeURIComponent(value)}; Max-Age=${60 * 60 * 24 * 365}; path=/; SameSite=Lax`;
}
