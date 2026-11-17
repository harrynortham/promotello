// The page we built for them, and it isn't there any more.
//
// The preview itself shows their business page inside a browser window
// — chrome, traffic lights, promotello.com/businesses/… in the address
// bar — so this draws the same window with nothing in it. Somebody who
// opened the email a second time sees the shape of what they were sent,
// which says "this was yours and the link has gone" better than a
// sentence does.
//
// Built from the page's own colours rather than an image, like the
// shuttered shopfront on the business 404: nothing to load, and it
// follows the brand if the palette ever moves.
export function ExpiredPreview() {
    return (
        <div aria-hidden="true" className="relative mx-auto w-full max-w-sm lg:max-w-none">
            {/* Kept inside the card's box: a glow that reaches past it
                adds scrollable width on a phone. */}
            <div className="pointer-events-none absolute inset-0 -z-10 rounded-full bg-[#FF593F]/10 blur-3xl" />

            {/* The one underneath, for depth. */}
            <div className="absolute inset-x-6 top-6 h-full rotate-3 rounded-[1.75rem] border border-[#17233B]/10 bg-white/60" />

            <div className="relative -rotate-2 overflow-hidden rounded-[1.75rem] border border-[#17233B]/10 bg-white shadow-[0_1rem_3rem_rgba(23,35,59,0.08)]">
                <div className="flex items-center gap-3 border-b border-[#17233B]/10 bg-[#FFF8F0] px-5 py-3.5">
                    <span className="flex gap-1.5">
                        <span className="size-2 rounded-full bg-[#17233B]/15" />
                        <span className="size-2 rounded-full bg-[#17233B]/15" />
                        <span className="size-2 rounded-full bg-[#17233B]/15" />
                    </span>

                    {/* An address bar with nothing in it. */}
                    <span className="h-5 flex-1 rounded-full bg-white/70 ring-1 ring-inset ring-[#17233B]/10" />
                </div>

                <div className="px-7 pb-9 pt-7">
                    {/* Where the cover photo was. */}
                    <div className="h-20 rounded-xl bg-[#17233B]/[0.06]" />

                    <div className="-mt-6 ml-1 size-12 rounded-2xl border-4 border-white bg-[#17233B]/[0.08]" />

                    <div className="mt-5 space-y-2.5">
                        <div className="h-3.5 w-1/2 rounded-full bg-[#17233B]/10" />
                        <div className="h-3 w-3/4 rounded-full bg-[#17233B]/[0.07]" />
                        <div className="h-3 w-2/5 rounded-full bg-[#17233B]/[0.07]" />
                    </div>

                    <div className="mt-7 flex items-center justify-between">
                        <div className="h-9 w-28 rounded-full bg-[#17233B]/[0.06]" />

                        <span className="-rotate-6 rounded-full bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#FF593F] shadow-sm ring-1 ring-[#FF593F]/15">
                            Expired
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}
