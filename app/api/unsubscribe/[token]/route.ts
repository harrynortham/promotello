import { NextResponse } from "next/server";

import { isUnsubscribeToken } from "@/lib/unsubscribe";
import { createPublicClient } from "@/utils/supabase/public";

// One-click unsubscribe (RFC 8058): mail apps POST here from the
// List-Unsubscribe header, without opening a page.
export async function POST(
    _request: Request,
    { params }: { params: Promise<{ token: string }> },
) {
    const { token } = await params;

    if (!isUnsubscribeToken(token)) {
        return new NextResponse(null, { status: 404 });
    }

    const { data, error } = await createPublicClient().rpc("unsubscribe_by_token", {
        requested_token: token,
    });

    if (error) {
        console.error("Unsubscribe: failed", error);
        return new NextResponse(null, { status: 500 });
    }

    return new NextResponse(null, { status: data ? 200 : 404 });
}
