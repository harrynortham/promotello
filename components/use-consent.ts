"use client";

import { useMemo, useSyncExternalStore } from "react";

import { onConsentChange, parseConsent, readConsent, readConsentCookie } from "@/lib/consent";

// The visitor's cookie choice; undefined until read in the browser.
export function useConsent() {
    return useSyncExternalStore(onConsentChange, readConsent, () => undefined);
}

// The same choice with the day it was made, for showing someone what we
// have recorded. Subscribes to the raw string so the snapshot stays stable.
export function useConsentRecord() {
    const stored = useSyncExternalStore(onConsentChange, readConsentCookie, () => undefined);

    return useMemo(() => parseConsent(stored), [stored]);
}
