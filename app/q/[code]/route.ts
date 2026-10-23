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
    const destination = new URL("/", request.url);

    if (/^[a-z0-9]{6,16}$/i.test(code)) {
        const { data: path, error } = await createPublicClient().rpc("record_qr_scan", {
            requested_code: code,
            requested_device: deviceFromUserAgent(request.headers.get("user-agent")),
        });

        if (error) {
            console.error("QR scan: failed to record scan", error);
        }

        if (typeof path === "string" && path.startsWith("/")) {
            destination.pathname = path;
            destination.searchParams.set("ref", "qr");
        }
    }

    // 307 so browsers don't cache the redirect and skip counting later scans.
    return NextResponse.redirect(destination, 307);
}
