"use client";

import { useEffect } from "react";

// Google Analytics is gone, and so is the question about it. But a
// browser that answered yes still carries _ga and _ga_<id> for two years,
// and every browser that answered at all still carries the record of the
// answer. Nothing reads them now, so they are deleted on the next visit
// rather than left to sit there — "we set no analytics cookies" should be
// true of the browser, not only of the server.
//
// Delete this once the cookies it clears have expired everywhere: the
// last one was set in November 2026, and _ga lasts two years.
const GONE = [/^_ga$/, /^_ga_/, /^promotello_consent$/];

export function ForgetAnalyticsCookies() {
    useEffect(() => {
        const host = window.location.hostname;
        // GA set its cookies on the registrable domain, ours on the host,
        // so each name is cleared against both.
        const domains = ["", host, `.${host}`, `.${host.replace(/^www\./, "")}`];

        for (const part of document.cookie.split("; ")) {
            const name = part.split("=")[0];

            if (!GONE.some((gone) => gone.test(name))) {
                continue;
            }

            for (const domain of domains) {
                document.cookie = `${name}=; Max-Age=0; path=/${domain ? `; domain=${domain}` : ""}`;
            }
        }
    }, []);

    return null;
}
