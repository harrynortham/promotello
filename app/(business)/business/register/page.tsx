import { Suspense } from "react";

import { sendSignedInAway } from "@/lib/already-signed-in";
import { previewBeingClaimed } from "@/lib/previews";
import { safeNextPath } from "@/lib/redirects";
import { createClient } from "@/utils/supabase/server";
import { BusinessRegisterForm, RegisterLoading } from "./register-form";
import type { ClaimPreview } from "./register-form";

type PageProps = { searchParams: Promise<{ next?: string | string[] }> };

// The page somebody is here to claim, when they are. Nothing is passed in
// the URL but the link they followed: ?next= already carries the token,
// which is the only thing that proves which business this is. A name in
// the query string would let anybody put any business on our sign-up
// page, and would drift from the record the moment either changed.
//
// preview_card() rather than open_business_preview(), because the latter
// counts a view (20270130090000). Rendering a form is not the business
// opening their link.
async function claimedPreview(next: string | undefined): Promise<ClaimPreview | null> {
    const path = safeNextPath(next ?? null);
    const token = path ? previewBeingClaimed(path) : null;

    if (!token) {
        return null;
    }

    const supabase = await createClient();
    const { data, error } = await supabase.rpc("preview_card", { requested_token: token });

    if (error) {
        // A panel is not worth failing a sign-up over.
        console.error("Register: could not read the preview", error);
        return null;
    }

    const row = (Array.isArray(data) ? data[0] : null) as ClaimPreview | null;

    return row ?? null;
}

// Signed in already? Then this form has nothing to offer: on to the
// business dashboard, or to whatever sent them here.
async function RegisterOrDashboard({ searchParams }: PageProps) {
    await sendSignedInAway(searchParams, "/business/dashboard");

    const { next } = await searchParams;
    const preview = await claimedPreview(Array.isArray(next) ? next[0] : next);

    return <BusinessRegisterForm preview={preview} />;
}

export default function BusinessRegisterPage({ searchParams }: PageProps) {
    return (
        <Suspense fallback={<RegisterLoading />}>
            <RegisterOrDashboard searchParams={searchParams} />
        </Suspense>
    );
}
