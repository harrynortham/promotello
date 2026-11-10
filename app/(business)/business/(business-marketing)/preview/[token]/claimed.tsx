import Link from "next/link";

import { Button } from "@/components/ui/button";

// A shop sign with the lights on and a key in the door: this page has an
// owner now. Built from the page's own colours rather than an image, the
// way the offer page draws a torn voucher and the business page draws a
// shuttered front — same idiom, opposite news.
function SignedShopfront({ name }: { name: string }) {
    return (
        <div aria-hidden="true" className="relative mx-auto w-full max-w-sm lg:max-w-none">
            <div className="pointer-events-none absolute inset-0 -z-10 rounded-full bg-[#FF593F]/10 blur-3xl" />

            {/* The one underneath, for depth. */}
            <div className="absolute inset-x-6 top-6 h-full -rotate-3 rounded-[1.75rem] border border-[#17233B]/10 bg-white/60" />

            <div className="relative rotate-2 overflow-hidden rounded-[1.75rem] border border-[#17233B]/10 bg-white shadow-[0_1rem_3rem_rgba(23,35,59,0.08)]">
                {/* The awning, lit rather than shuttered. */}
                <div
                    className="h-12"
                    style={{
                        backgroundImage:
                            "repeating-linear-gradient(90deg, #FF593F 0 1.25rem, #FFD9D1 1.25rem 2.5rem)",
                    }}
                />

                <div className="px-7 pb-8 pt-7">
                    {/* The name over the door, which is the whole point. */}
                    <p className="truncate text-lg font-semibold tracking-tight text-[#17233B]">{name}</p>
                    <div className="mt-2.5 h-3 w-2/5 rounded-full bg-[#17233B]/10" />

                    <div className="mt-7 flex items-end gap-4">
                        <div className="relative h-24 flex-1 rounded-xl bg-[#FFF4E8]">
                            <span className="absolute left-1/2 top-6 -translate-x-1/2 rotate-3 rounded-full bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#FF593F] shadow-sm">
                                Open
                            </span>
                        </div>

                        {/* The door, with the key still in it. */}
                        <div className="relative h-28 w-20 rounded-t-2xl bg-[#17233B]/[0.06]">
                            <span className="absolute bottom-11 right-3 size-9 rounded-full bg-white/80 shadow-sm" />

                            <svg
                                viewBox="0 0 24 24"
                                className="absolute bottom-10 right-1.5 size-10 -rotate-45 text-[#FF593F]"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.9"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            >
                                <circle cx="8.5" cy="8.5" r="3.6" />
                                <path d="M11.2 11.2 19 19" />
                                <path d="M16.2 16.2 14.6 17.8" />
                                <path d="M18 18 16.4 19.6" />
                            </svg>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// Someone has already taken this page. Usually them, a moment ago, on
// another tab — so the first thing offered is the way back in.
export function PreviewClaimed({ name }: { name: string }) {
    // A <div>, not a <main>: the page it is returned into is the <main>.
    return (
        <div className="px-6 py-14 sm:py-20">
            <div className="mx-auto grid max-w-5xl items-center gap-12 lg:grid-cols-2 lg:gap-16">
                <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#FF593F]">
                        Already claimed
                    </p>

                    <h1 className="mt-5 text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
                        {name} has an owner now.
                    </h1>

                    <p className="mt-5 max-w-md text-lg leading-8 text-[#17233B]/70">
                        This link only works once, and it has been used. If that was you, sign in
                        and the page is on your dashboard.
                    </p>

                    <div className="mt-8 flex flex-wrap gap-3">
                        <Button render={<Link href="/login?next=/business/dashboard" />} nativeButton={false} size="lg">
                            Sign in
                        </Button>

                        <Button
                            render={<Link href="/business/contact" />}
                            nativeButton={false}
                            variant="outline"
                            size="lg"
                        >
                            It wasn&rsquo;t me
                        </Button>
                    </div>
                </div>

                <SignedShopfront name={name} />
            </div>
        </div>
    );
}
