import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";

import { keystaticEnabled } from "@/lib/keystatic-enabled";
import KeystaticApp from "./keystatic";

export const metadata: Metadata = {
    title: "Blog editor",
    robots: { index: false, follow: false },
};

// Rendered on request: the editor can't be prerendered.
async function Editor() {
    await connection();
    return <KeystaticApp />;
}

// The blog editor. Who can save is controlled by GitHub (repo access) on
// the live site; locally anyone running the dev server can.
export default function KeystaticLayout() {
    if (!keystaticEnabled) {
        notFound();
    }

    return (
        <Suspense>
            <Editor />
        </Suspense>
    );
}
