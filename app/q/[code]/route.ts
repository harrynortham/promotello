import { NextResponse } from "next/server";

import { joinLoyaltyCard } from "@/lib/join-loyalty";
import { deviceFromUserAgent } from "@/lib/qr";
import { createClient } from "@/utils/supabase/server";
import { createPublicClient } from "@/utils/supabase/public";

// A poster for a loyalty card is an invitation to join it, so a scan
// should end with the card in somebody's phone rather than on a page
// describing it. record_qr_scan answers with the business and the card
// it is still handing out, in that shape.
const CARD_SCAN = /^\/businesses\/([^#?]+)#loyalty-([0-9a-f-]+)$/i;

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

        const card = typeof path === "string" ? CARD_SCAN.exec(path) : null;

        if (card) {
            return NextResponse.redirect(await cardDestination(card[1], card[2], request.url), 307);
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

// Where a scanned card poster lands.
//
// Signed out, that is the sign-up page — it takes an address, emails a
// code and lets somebody who already has an account in through the same
// door — carrying ?join=1 so the card is theirs the moment they are.
// Signed in, there is nothing to ask: the card is added here and they
// land on it.
async function cardDestination(business: string, programId: string, requestUrl: string) {
    const joining = `/businesses/${business}?join=1`;

    try {
        const supabase = await createClient();

        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (user) {
            const { joined } = await joinLoyaltyCard(supabase, business, user);

            if (joined) {
                return new URL(`/loyalty/${programId}?ref=qr`, requestUrl);
            }

            // The card has gone since the poster went up: the business
            // page says so, which is where a scan used to land anyway.
            return new URL(`/businesses/${business}?ref=qr#loyalty-${programId}`, requestUrl);
        }
    } catch (error) {
        // Reading the session is not worth failing a scan over: the
        // sign-up page is where somebody signed out was going anyway.
        console.error("QR scan: could not tell who scanned", error);
    }

    const destination = new URL("/signup", requestUrl);
    destination.searchParams.set("next", joining);
    destination.searchParams.set("ref", "qr");

    return destination;
}
