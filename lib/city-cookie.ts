// The place a visitor chose in the location search: a city slug, or "all"
// for every location. Wins over their detected location.
export const CITY_COOKIE = "promotello_city";
export const ALL_LOCATIONS = "all";

// Set once someone closes the "we're not in your town yet" notice, so it
// stays closed. It only ever appears when we can't place them in a live
// city, so this can't hide anything they'd want later.
export const NOTICE_COOKIE = "promotello_notice";

const A_YEAR = 60 * 60 * 24 * 365;

export function rememberCity(value: string) {
    document.cookie = `${CITY_COOKIE}=${encodeURIComponent(value)}; Max-Age=${A_YEAR}; path=/; SameSite=Lax`;
}

export function dismissCityNotice() {
    document.cookie = `${NOTICE_COOKIE}=hidden; Max-Age=${A_YEAR}; path=/; SameSite=Lax`;
}
