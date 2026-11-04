"use client";

import { useSyncExternalStore } from "react";

// Reads a CSS media query from React, for the handful of cases where a
// component has to behave differently rather than just look different — a
// drawer that slides up on a phone and in from the side on a desktop can't
// be done with classes alone.
//
// Prefer Tailwind's breakpoints for anything that is only styling.
//
// On the server there is no window, so the query is reported as not matching
// and the mobile behaviour is rendered first. useSyncExternalStore keeps that
// first paint consistent between server and browser, so React doesn't warn.
export function useMediaQuery(query: string) {
    return useSyncExternalStore(
        (onChange) => {
            const list = window.matchMedia(query);
            list.addEventListener("change", onChange);
            return () => list.removeEventListener("change", onChange);
        },
        () => window.matchMedia(query).matches,
        () => false,
    );
}
