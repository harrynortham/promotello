"use client";

import { useEffect } from "react";

// Scrolls to #offer or #card once they exist, and keeps them there
// while the page settles.
//
// Two things fight this. The page streams, so at first paint the
// sections are not in the document and the browser's own jump to the
// hash finds nothing and gives up. And the cover image and logo above
// them load late, so a scroll that landed correctly is pushed down a
// moment later.
//
// So: mounted inside the Suspense boundary, which is the moment the
// sections exist, then re-aimed whenever the page height changes, for
// a second. Any real scroll from the person stops it at once -- being
// yanked back while you are reading is worse than landing low.
//
// Nothing happens without a hash, so a plain visit is untouched.

const SETTLE_MS = 1000;

export function ScrollToHash() {
    useEffect(() => {
        const id = window.location.hash.slice(1);
        if (!id) return;

        const target = document.getElementById(id);
        if (!target) return;

        let live = true;

        const aim = () => {
            if (live) target.scrollIntoView({ block: "start" });
        };

        const stop = () => {
            live = false;
            observer.disconnect();
            window.removeEventListener("wheel", stop);
            window.removeEventListener("touchstart", stop);
            window.removeEventListener("keydown", stop);
        };

        // Height changes mean something above loaded and moved the
        // target, so aim again.
        const observer = new ResizeObserver(aim);
        observer.observe(document.body);

        window.addEventListener("wheel", stop, { passive: true });
        window.addEventListener("touchstart", stop, { passive: true });
        window.addEventListener("keydown", stop);

        const frame = requestAnimationFrame(aim);
        const done = setTimeout(stop, SETTLE_MS);

        return () => {
            cancelAnimationFrame(frame);
            clearTimeout(done);
            stop();
        };
    }, []);

    return null;
}
