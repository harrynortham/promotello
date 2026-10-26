import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { keystaticEnabled } from "@/lib/keystatic-enabled";
import KeystaticApp from "./keystatic";

export const metadata: Metadata = {
    title: "Blog editor",
    robots: { index: false, follow: false },
};

// The blog editor. Who can save is controlled by GitHub (repo access) on
// the live site; locally anyone running the dev server can.
export default function KeystaticLayout() {
    if (!keystaticEnabled) {
        notFound();
    }

    return <KeystaticApp />;
}
