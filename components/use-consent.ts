"use client";

import { useSyncExternalStore } from "react";

import { onConsentChange, readConsent } from "@/lib/consent";

// The visitor's cookie choice; undefined until read in the browser.
export function useConsent() {
    return useSyncExternalStore(onConsentChange, readConsent, () => undefined);
}
