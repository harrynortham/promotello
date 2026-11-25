"use client";

import type { ReactNode } from "react";

import { createClient } from "@/utils/supabase/client";

// Counts a press on a bio row.
//
// Wrapped around the link rather than built into it, so the rows stay
// server-rendered and a business with tracking blocked still gets a
// page that works. Nothing here can stop a navigation: the write is
// fired and forgotten, and a failure is a number we do not have rather
// than a link that did not open.

export function BioTap({
    businessId,
    kind,
    linkId,
    children,
}: {
    businessId: string;
    kind: string;
    linkId?: string;
    children: ReactNode;
}) {
    function count() {
        try {
            void createClient()
                .rpc("record_bio_tap", {
                    requested_business_id: businessId,
                    tapped_kind: kind,
                    tapped_link_id: linkId ?? null,
                })
                .then(() => undefined);
        } catch {
            // A tap we cannot count is still a tap that works.
        }
    }

    // Capture, so it runs whether they tapped the label, the icon or
    // the arrow. Not onClick on the anchor itself: the row is a block
    // and the press can land anywhere in it.
    return (
        <div onClickCapture={count} className="contents">
            {children}
        </div>
    );
}
