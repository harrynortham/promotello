"use client";

import { useEffect } from "react";

// Scrolls to #offer or #card once they exist.
//
// The page this renders on streams, so at first paint the shell is a
// skeleton and the browser's own jump to the hash finds nothing and
// gives up. Rendered inside the Suspense boundary, this mounts only
// once the real sections are in the document, which is the moment the
// scroll can actually work.
//
// Nothing happens without a hash, so a plain visit is untouched.

export function ScrollToHash() {
    useEffect(() => {
        const id = window.location.hash.slice(1);
        if (!id) return;

        // One frame, so the scroll runs against a laid-out page rather
        // than whatever the browser has measured so far.
        const frame = requestAnimationFrame(() => {
            document.getElementById(id)?.scrollIntoView({ block: "start" });
        });

        return () => cancelAnimationFrame(frame);
    }, []);

    return null;
}
