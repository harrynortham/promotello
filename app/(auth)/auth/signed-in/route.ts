import { NextResponse } from "next/server";

import { afterSignIn } from "@/lib/after-sign-in";
import { createClient } from "@/utils/supabase/server";

// Where the browser goes the moment a code has been accepted. The session
// is already in the cookies by then; this is the server's half of signing
// in — the welcome email, a business marked as one, a preview claimed —
// and it decides where they land.
export async function GET(request: Request) {
    const requestUrl = new URL(request.url);
    const requestedNext = requestUrl.searchParams.get("next");

    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    // The cookies didn't arrive, or the session has already gone. Nothing
    // to do but ask them to sign in again.
    if (!user) {
        const loginUrl = new URL("/login", requestUrl.origin);
        loginUrl.searchParams.set("error", "session");

        if (requestedNext) {
            loginUrl.searchParams.set("next", requestedNext);
        }

        return NextResponse.redirect(loginUrl);
    }

    const landing = await afterSignIn(supabase, user, requestedNext);

    return NextResponse.redirect(new URL(landing, requestUrl.origin));
}
