import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";

import { Button } from "@/components/ui/button";
import { createPublicClient } from "@/utils/supabase/public";

// Where a scan lands when its code points at nothing: a business still
// being read, one that has been suspended, or an offer that has ended.
// It used to be the homepage, which tells someone standing in a shop with
// their phone out precisely nothing.
//
// A business can make its poster before its page is live now
// (20270125090000_a_poster_is_made_before_the_page_is_live.sql), so the
// commonest visitor here is somebody who scanned a brand new poster in a
// window. "That code isn't live yet" is true but reads as the shop's
// mistake. The name turns it into a sentence about this business.
export const metadata: Metadata = {
    title: "This code isn't live yet",
    robots: { index: false, follow: false },
};

type Fallback = { business_name: string; reason: string };

function Words({ eyebrow, heading, body }: { eyebrow: string; heading: string; body: string }) {
    return (
        <>
            <p className="text-sm font-medium text-[#FF593F]">{eyebrow}</p>

            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-[#17233B]">
                {heading}
            </h1>

            <p className="mt-3 leading-7 text-[#17233B]/65">{body}</p>
        </>
    );
}

// What this page said before it could name anybody, and still the right
// answer for a suspended business, an ended offer or a code we cannot
// place. It is also the fallback while the lookup is in flight, so a slow
// query shows something true rather than a gap.
function Generic() {
    return (
        <Words
            eyebrow="Nothing here yet"
            heading="That code isn't live yet."
            body="The business may still be joining Promotello, or the offer behind it has ended. Worth asking at the counter — and there are plenty of others nearby."
        />
    );
}

async function WhoScanned({ searchParams }: { searchParams: Promise<{ code?: string }> }) {
    await connection();

    const { code } = await searchParams;

    if (!code || !/^[a-z0-9]{6,16}$/i.test(code)) {
        return <Generic />;
    }

    // scan_fallback hands back one name for one code somebody is holding.
    // A pending business stays unreadable to anonymous clients otherwise,
    // which is what makes building a page before it is public safe.
    const { data } = await createPublicClient()
        .rpc("scan_fallback", { requested_code: code })
        .maybeSingle<Fallback>();

    if (data?.reason !== "waiting") {
        return <Generic />;
    }

    return (
        <Words
            eyebrow="Almost there"
            heading={`${data.business_name} is coming to Promotello.`}
            body="We're reading their page now — usually the same day — and this code starts working the moment it goes live. Worth scanning again tomorrow."
        />
    );
}

export default function ScanUnavailablePage({
    searchParams,
}: {
    searchParams: Promise<{ code?: string }>;
}) {
    return (
        <main className="flex min-h-screen items-center justify-center bg-[#FFF8F0] px-6">
            <section className="w-full max-w-md text-center">
                <Suspense fallback={<Generic />}>
                    <WhoScanned searchParams={searchParams} />
                </Suspense>

                <Button
                    size="lg"
                    render={<Link href="/offers" />}
                    nativeButton={false}
                    className="mt-8"
                >
                    Browse local offers
                </Button>
            </section>
        </main>
    );
}
