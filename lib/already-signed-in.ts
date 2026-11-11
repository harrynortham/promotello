import { redirect } from "next/navigation";
import { connection } from "next/server";

import { safeNextPath } from "@/lib/redirects";
import { createClient } from "@/utils/supabase/server";

// A form for making an account is no use to somebody who has one. Both
// sign-up pages ask this first and send them on instead of showing it:
// to wherever they were heading if something asked for a particular page
// (claiming a preview, an invitation), and otherwise to their own side
// of Promotello.
//
// It is the page's own guard rather than the link's, because a link is
// only where somebody came from — an address typed, kept in a tab or
// clicked in an old email arrives here just the same.
export async function sendSignedInAway(
    searchParams: Promise<{ next?: string | string[] }> | undefined,
    fallback: string,
) {
    await connection();

    const {
        data: { user },
    } = await (await createClient()).auth.getUser();

    if (!user) return;

    const requested = (await searchParams)?.next;
    const next = safeNextPath(Array.isArray(requested) ? requested[0] : requested);

    redirect(next ?? fallback);
}
