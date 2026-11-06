import type { Metadata } from "next";
import Link from "next/link";

import { Button } from "@/components/ui/button";

// Where a scan lands when its code points at nothing: a business still
// being checked, one that has been suspended, or an offer that has ended.
// It used to be the homepage, which tells someone standing in a shop with
// their phone out precisely nothing.
export const metadata: Metadata = {
    title: "This code isn't live yet",
    robots: { index: false, follow: false },
};

export default function ScanUnavailablePage() {
    return (
        <main className="flex min-h-screen items-center justify-center bg-[#FFF8F0] px-6">
            <section className="w-full max-w-md text-center">
                <p className="text-sm font-medium text-[#FF593F]">Nothing here yet</p>

                <h1 className="mt-3 text-3xl font-semibold tracking-tight text-[#17233B]">
                    That code isn&apos;t live yet.
                </h1>

                <p className="mt-3 leading-7 text-[#17233B]/65">
                    The business may still be joining Promotello, or the offer
                    behind it has ended. Worth asking at the counter — and
                    there are plenty of others nearby.
                </p>

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
