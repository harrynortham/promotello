import Link from "next/link";
import { FiArrowRight, FiTag } from "react-icons/fi";

import { Button } from "@/components/ui/button";

// A torn-off voucher: the shape of the thing that isn't there. Built
// from the page's own colours rather than an image, so it costs nothing
// to load and follows the brand if the palette ever moves.
function TornVoucher() {
    return (
        <div aria-hidden="true" className="relative mx-auto w-full max-w-sm lg:max-w-none">
            {/* Kept inside the card's own box: a glow that reaches past
                it adds scrollable width on a phone. */}
            <div className="pointer-events-none absolute inset-0 -z-10 rounded-full bg-[#FF593F]/10 blur-3xl" />

            {/* The one underneath, for depth. */}
            <div className="absolute inset-x-6 top-6 h-full rotate-3 rounded-[1.75rem] border border-[#17233B]/10 bg-white/60" />

            <div className="relative -rotate-2 rounded-[1.75rem] border border-[#17233B]/10 bg-white p-7 shadow-[0_1rem_3rem_rgba(23,35,59,0.08)]">
                <span className="flex size-14 items-center justify-center rounded-2xl bg-[#FF593F] text-white">
                    <FiTag className="size-7" />
                </span>

                <div className="mt-6 space-y-2.5">
                    <div className="h-3 w-3/4 rounded-full bg-[#17233B]/10" />
                    <div className="h-3 w-1/2 rounded-full bg-[#17233B]/10" />
                </div>

                {/* The tear: notches punched out of the card, and the
                    perforation between them. */}
                <div className="relative -mx-7 mt-7 flex items-center">
                    <span className="absolute -left-3.5 size-7 rounded-full bg-[#FFF8F0]" />
                    <span className="mx-5 h-px flex-1 border-t-2 border-dashed border-[#17233B]/15" />
                    <span className="absolute -right-3.5 size-7 rounded-full bg-[#FFF8F0]" />
                </div>

                <div className="mt-7 flex items-center justify-between">
                    <div className="h-3 w-20 rounded-full bg-[#17233B]/10" />

                    <span className="rounded-full bg-[#FFF4E8] px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-[#FF593F]">
                        Gone
                    </span>
                </div>
            </div>
        </div>
    );
}

export default function OfferNotFound() {
    return (
        <main className="bg-[#FFF8F0] px-6 py-14 text-[#17233B] sm:py-20">
            <div className="mx-auto grid max-w-5xl items-center gap-12 lg:grid-cols-2 lg:gap-16">
                <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#FF593F]">
                        Offer unavailable
                    </p>

                    <h1 className="mt-5 text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
                        We couldn&rsquo;t find that deal.
                    </h1>

                    <p className="mt-5 max-w-lg text-lg leading-8 text-[#17233B]/65">
                        It may have expired or the link may be incorrect.
                        There are plenty of others nearby.
                    </p>

                    <div className="mt-8 flex flex-wrap gap-3">
                        <Button render={<Link href="/offers" />} nativeButton={false} size="lg">
                            Browse all deals
                            <FiArrowRight aria-hidden="true" />
                        </Button>

                        <Button
                            render={<Link href="/explore" />}
                            nativeButton={false}
                            variant="outline"
                            size="lg"
                        >
                            Explore by area
                        </Button>
                    </div>
                </div>

                <TornVoucher />
            </div>
        </main>
    );
}
