import { NextResponse } from "next/server";

import { createClient } from "@/utils/supabase/server";

// Counts a click on a business's Google review link, then sends the
// customer to Google. Falls back to the business page if there's no link.
export async function GET(
    request: Request,
    { params }: { params: Promise<{ businessId: string }> },
) {
    const { businessId } = await params;
    const source = new URL(request.url).searchParams.get("source") ?? "profile";

    const supabase = await createClient();
    const { data: reviewUrl } = await supabase.rpc("record_review_click", {
        requested_business_id: businessId,
        requested_source: source,
    });

    if (typeof reviewUrl === "string" && reviewUrl.startsWith("https://")) {
        return NextResponse.redirect(reviewUrl, 307);
    }

    return NextResponse.redirect(new URL(`/businesses/${businessId}`, request.url), 307);
}
