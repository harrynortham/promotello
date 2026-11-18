import { NextResponse } from "next/server";

import { letterBackground } from "@/lib/letter-background";
import { previewLink, tokenFromPreviewSegment } from "@/lib/previews";
import { absoluteUrl } from "@/lib/site";
import { createAdminClient } from "@/utils/supabase/admin";

// The page a letter is printed on, for one preview.
//
// Public on purpose: Stannp fetches it from their printer when the
// letter is made, so it cannot sit behind an admin session. What it
// gives away is a picture of a link whose token is already the secret
// — the same thing the email puts in plain text — and it gives it away
// only to somebody who already has the token.
//
// It is not in the sitemap and robots.ts already disallows
// /business/preview/; this lives under /api, which is disallowed too.
export async function GET(
    _request: Request,
    { params }: { params: Promise<{ token: string }> },
) {
    const { token: segment } = await params;
    const token = tokenFromPreviewSegment(segment);

    if (!token) {
        return new NextResponse("Not found", { status: 404 });
    }

    // Only for a preview that exists and has not been claimed: once it
    // is theirs there is no letter left to send, and an image that
    // outlives its purpose is one more thing to leak.
    const supabase = createAdminClient();

    const { data: preview } = await supabase
        .from("business_previews")
        .select("token, claimed_at, businesses ( name )")
        .eq("token", token)
        .maybeSingle();

    if (!preview || preview.claimed_at) {
        return new NextResponse("Not found", { status: 404 });
    }

    const businesses = preview.businesses as { name: string } | { name: string }[] | null;
    const name = (Array.isArray(businesses) ? businesses[0]?.name : businesses?.name) ?? null;

    const { png } = await letterBackground(absoluteUrl(previewLink(preview.token, name)));

    return new NextResponse(new Uint8Array(png), {
        headers: {
            "Content-Type": "image/png",
            // Stannp fetches this once when the letter is made. Caching
            // it at the edge means a second letter to the same business
            // does not rebuild it.
            "Cache-Control": "public, max-age=3600, s-maxage=86400",
        },
    });
}
