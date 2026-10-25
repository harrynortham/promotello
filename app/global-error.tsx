"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

// Last resort when the root layout itself fails: a plain page, reported to
// Sentry. Errors inside pages use app/error.tsx instead.
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
    useEffect(() => {
        Sentry.captureException(error);
    }, [error]);

    return (
        <html lang="en-GB">
            <body style={{ fontFamily: "system-ui, sans-serif", background: "#FFF8F0", color: "#17233B", padding: "4rem 1.5rem", textAlign: "center" }}>
                <h1 style={{ fontSize: "1.75rem" }}>Something went wrong</h1>
                <p style={{ marginTop: "0.75rem", color: "#45506a" }}>Sorry about that. Please try again.</p>
                <button
                    type="button"
                    onClick={reset}
                    style={{ marginTop: "1.5rem", background: "#FF593F", color: "#fff", border: 0, borderRadius: 10, padding: "0.75rem 1.25rem", fontWeight: 600, cursor: "pointer" }}
                >
                    Try again
                </button>
            </body>
        </html>
    );
}
