import Link from "next/link";
import { FiArrowRight } from "react-icons/fi";

import { Button } from "@/components/ui/button";

// A shuttered shopfront: the shape of the thing that isn't there, the
// way the offer page draws a torn-off voucher. Built from the page's own
// colours rather than an image, so it costs nothing to load and follows
// the brand if the palette ever moves.
export function ClosedShopfront() {
    return (
        <div aria-hidden="true" className="relative mx-auto w-full max-w-sm lg:max-w-none">
            {/* Kept inside the card's own box: a glow that reaches past
                it adds scrollable width on a phone. */}
            <div className="pointer-events-none absolute inset-0 -z-10 rounded-full bg-[#FF593F]/10 blur-3xl" />

            {/* The one underneath, for depth. */}
            <div className="absolute inset-x-6 top-6 h-full rotate-3 rounded-[1.75rem] border border-[#17233B]/10 bg-white/60" />

            <div className="relative -rotate-2 overflow-hidden rounded-[1.75rem] border border-[#17233B]/10 bg-white shadow-[0_1rem_3rem_rgba(23,35,59,0.08)]">
                <div
                    className="h-12"
                    style={{
                        backgroundImage:
                            "repeating-linear-gradient(90deg, #FF593F 0 1.25rem, #FFD9D1 1.25rem 2.5rem)",
                    }}
                />

                <div className="px-7 pb-8 pt-7">
                    <div className="space-y-2.5">
                        <div className="h-3 w-2/3 rounded-full bg-[#17233B]/10" />
                        <div className="h-3 w-2/5 rounded-full bg-[#17233B]/10" />
                    </div>

                    <div className="mt-7 flex items-end gap-4">
                        <div className="h-24 flex-1 rounded-xl bg-[#17233B]/[0.06]" />

                        <div className="relative h-28 w-20 rounded-t-2xl bg-[#17233B]/[0.06]">
                            <span className="absolute left-1/2 top-7 -translate-x-1/2 -rotate-6 rounded-full bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#FF593F] shadow-sm">
                                Closed
                            </span>

                            <span className="absolute bottom-9 right-3 size-2 rounded-full bg-[#17233B]/20" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function BusinessNotFound() {
    return (
        <main className="bg-[#FFF8F0] px-6 py-14 text-[#17233B] sm:py-20">
            <div className="mx-auto grid max-w-5xl items-center gap-12 lg:grid-cols-2 lg:gap-16">
                <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#FF593F]">
                        Business unavailable
                    </p>

                    <h1 className="mt-5 text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
                        We couldn&rsquo;t find that place.
                    </h1>

                    <p className="mt-5 max-w-lg text-lg leading-8 text-[#17233B]/65">
                        It may have moved on, or the link may be incorrect.
                        There are plenty of others nearby.
                    </p>

                    <div className="mt-8 flex flex-wrap gap-3">
                        <Button render={<Link href="/businesses" />} nativeButton={false} size="lg">
                            Browse local businesses
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

                <ClosedShopfront />
            </div>
        </main>
    );
}
