"use client";

import { useEffect, useRef } from "react";

import { createClient } from "@/utils/supabase/client";

// Counts one view of a business or offer page for the business's analytics.
// Runs in the browser so crawlers and prefetches aren't counted.
export function PageViewTracker({
    businessId,
    offerId,
}: {
    businessId: string;
    offerId?: string;
}) {
    const recorded = useRef(false);

    useEffect(() => {
        if (recorded.current) return;
        recorded.current = true;

        // ?ref=qr from poster scans, ?ref=share from shared links.
        const ref = new URLSearchParams(window.location.search).get("ref");
        const source = ref === "qr" || ref === "share" ? ref : "web";

        // Supabase queries only send once awaited, so .then() is needed.
        createClient()
            .rpc("record_page_view", {
                requested_business_id: businessId,
                requested_offer_id: offerId ?? null,
                requested_source: source,
            })
            .then(({ error }) => {
                if (error) console.error("Page view: failed to record", error);
            });
    }, [businessId, offerId]);

    return null;
}
