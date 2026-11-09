import { NextResponse } from "next/server";

import { deviceFromUserAgent } from "@/lib/qr";
import { createPublicClient } from "@/utils/supabase/public";

// Short link printed on QR posters: records the scan, then sends the visitor
// to the business or offer the code points at.
export async function GET(
    request: Request,
    { params }: { params: Promise<{ code: string }> },
) {
    const { code } = await params;

    // Not the homepage: someone who has just scanned a poster is standing
    // in a shop, and "here is our front page" answers nothing. A code only
    // resolves to null while its business is waiting for approval or after
    // it is suspended — there is no public page to send anyone to. Every
    // other code lands somewhere, even when what it pointed at has gone.
    const destination = new URL("/q/unavailable", request.url);

    if (/^[a-z0-9]{6,16}$/i.test(code)) {
        const { data: path, error } = await createPublicClient().rpc("record_qr_scan", {
            requested_code: code,
            requested_device: deviceFromUserAgent(request.headers.get("user-agent")),
        });

        if (error) {
            console.error("QR scan: failed to record scan", error);
        }

        if (typeof path === "string" && path.startsWith("/")) {
            // A loyalty code resolves to a path with an anchor on it, and a
            // code whose target has gone resolves to one with a query on it.
            // Assigning either to pathname escapes the # or ? — a path that
            // doesn't exist rather than a place on the page. Each part is
            // set as the part it is.
            const [beforeHash, hash] = path.split("#");
            const [pathname, query] = beforeHash.split("?");

            destination.pathname = pathname;

            for (const [key, value] of new URLSearchParams(query)) {
                destination.searchParams.set(key, value);
            }

            destination.searchParams.set("ref", "qr");

            if (hash) {
                destination.hash = hash;
            }
        }
    }

    // 307 so browsers don't cache the redirect and skip counting later scans.
    return NextResponse.redirect(destination, 307);
}
