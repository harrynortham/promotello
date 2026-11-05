// Cookie consent for optional analytics. The choice is kept in a first-party
// cookie (an essential cookie: it only remembers the choice itself).
//
// What it holds is the choice, the day it was made and the version of the
// policy it was made against — "analytics|2026-11-05|1". UK GDPR asks us to
// be able to show that someone consented, and to what; a bare "analytics"
// couldn't say when, or to which policy.

export const CONSENT_COOKIE = "promotello_consent";
export type ConsentChoice = "analytics" | "essential";

// A choice is a choice about a particular policy. Bump this when what we
// ask for changes in a way the answer should be given again for — a new
// purpose, a new recipient — not for wording or a new essential cookie.
export const CONSENT_VERSION = 1;

export type ConsentRecord = {
  choice: ConsentChoice;
  // The day it was made, or null for a choice made before we recorded it.
  decidedOn: string | null;
  version: number;
};

const CONSENT_EVENT = "promotello:consent";
const ONE_YEAR = 60 * 60 * 24 * 365;

// Google Analytics runs on the live site only (not previews or local
// development), unless NEXT_PUBLIC_GA_MEASUREMENT_ID is set explicitly.
const LIVE_GA_MEASUREMENT_ID = "G-J5SCQTSJTY";

export const gaMeasurementId =
  process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID ??
  (process.env.NODE_ENV === "production" &&
  process.env.NEXT_PUBLIC_VERCEL_ENV !== "preview"
    ? LIVE_GA_MEASUREMENT_ID
    : null);

// The cookies GA4 sets, named after the property reporting to it: one for
// the visitor and one per stream. The cookie policy lists these, so it is
// read from here rather than typed out, where it could drift from the
// property we actually use.
export const analyticsCookieNames = [
  "_ga",
  `_ga_${(process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID ?? LIVE_GA_MEASUREMENT_ID).replace(/^G-/, "")}`,
];

// What gets stored for a choice. Separate from the cookie so the format
// has one definition, and can be tested without a browser.
export function consentCookieValue(choice: ConsentChoice, on = new Date()) {
  return `${choice}|${on.toISOString().slice(0, 10)}|${CONSENT_VERSION}`;
}

// Reads a stored value. Separate from the cookie so it can be tested, and
// pure so React can call it whenever it likes.
export function parseConsent(value: string | undefined): ConsentRecord | null {
  if (!value) return null;

  const [choice, decidedOn, version] = decodeURIComponent(value).split("|");

  if (choice !== "analytics" && choice !== "essential") {
    return null;
  }

  // A choice made before we recorded the date and version. It was still a
  // choice about this policy, so it stands rather than asking again.
  if (!decidedOn) {
    return { choice, decidedOn: null, version: CONSENT_VERSION };
  }

  const stored = Number.parseInt(version ?? "", 10);

  // Asked against an older policy: ask again rather than assume.
  if (!Number.isFinite(stored) || stored < CONSENT_VERSION) {
    return null;
  }

  return { choice, decidedOn, version: stored };
}

// The raw stored value. React subscribes to this rather than to the parsed
// record: a string it can compare, instead of a new object every render.
export function readConsentCookie(): string | undefined {
  if (typeof document === "undefined") return undefined;

  return document.cookie
    .split("; ")
    .find((part) => part.startsWith(`${CONSENT_COOKIE}=`))
    ?.split("=")[1];
}

export function readConsentRecord(): ConsentRecord | null {
  return parseConsent(readConsentCookie());
}

export function readConsent(): ConsentChoice | null {
  return readConsentRecord()?.choice ?? null;
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
  document.cookie = `${CONSENT_COOKIE}=${consentCookieValue(choice)}; Max-Age=${ONE_YEAR}; path=/; SameSite=Lax${secure}`;

  if (choice === "essential" && gaMeasurementId) {
    // Stop any analytics already loaded on this page and remove its cookies.
    (window as unknown as Record<string, boolean>)[
      `ga-disable-${gaMeasurementId}`
    ] = true;
    deleteAnalyticsCookies();
  }

  window.dispatchEvent(new CustomEvent(CONSENT_EVENT));
}

export function onConsentChange(callback: () => void) {
  window.addEventListener(CONSENT_EVENT, callback);
  return () => window.removeEventListener(CONSENT_EVENT, callback);
}
