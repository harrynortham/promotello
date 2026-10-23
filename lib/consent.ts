// Cookie consent for optional analytics. The choice is kept in a first-party
// cookie (an essential cookie: it only remembers the choice itself).

export const CONSENT_COOKIE = "promotello_consent";
export type ConsentChoice = "analytics" | "essential";

const CONSENT_EVENT = "promotello:consent";
const ONE_YEAR = 60 * 60 * 24 * 365;

// Google Analytics runs on the live site only (not previews or local
// development), unless NEXT_PUBLIC_GA_MEASUREMENT_ID is set explicitly.
export const gaMeasurementId =
    process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID ??
    (process.env.NODE_ENV === "production" && process.env.NEXT_PUBLIC_VERCEL_ENV !== "preview"
        ? "G-2W27LXHDWE"
        : null);

export function readConsent(): ConsentChoice | null {
    if (typeof document === "undefined") return null;

    const value = document.cookie
        .split("; ")
        .find((part) => part.startsWith(`${CONSENT_COOKIE}=`))
        ?.split("=")[1];

    return value === "analytics" || value === "essential" ? value : null;
}

function deleteAnalyticsCookies() {
    const host = window.location.hostname;
    const domains = ["", host, `.${host}`, `.${host.replace(/^www\./, "")}`];

    for (const part of document.cookie.split("; ")) {
        const name = part.split("=")[0];
        if (name === "_ga" || name.startsWith("_ga_")) {
            for (const domain of domains) {
                document.cookie = `${name}=; Max-Age=0; path=/${domain ? `; domain=${domain}` : ""}`;
            }
        }
    }
}

export function saveConsent(choice: ConsentChoice) {
    const secure = window.location.protocol === "https:" ? "; Secure" : "";
    document.cookie = `${CONSENT_COOKIE}=${choice}; Max-Age=${ONE_YEAR}; path=/; SameSite=Lax${secure}`;

    if (choice === "essential" && gaMeasurementId) {
        // Stop any analytics already loaded on this page and remove its cookies.
        (window as unknown as Record<string, boolean>)[`ga-disable-${gaMeasurementId}`] = true;
        deleteAnalyticsCookies();
    }

    window.dispatchEvent(new CustomEvent(CONSENT_EVENT));
}

export function onConsentChange(callback: () => void) {
    window.addEventListener(CONSENT_EVENT, callback);
    return () => window.removeEventListener(CONSENT_EVENT, callback);
}
