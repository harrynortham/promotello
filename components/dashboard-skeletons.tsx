import { Skeleton } from "@/components/ui/skeleton";

// The waiting shapes for the business dashboard.
//
// A skeleton is a promise about what is coming, so each of these is laid
// out from the page it stands in for: the same header, the same grid,
// the same number of columns. One that guesses is worse than none —
// the page jumps when the real thing arrives, and a jump reads as a bug.
//
// Kept together, and apart from the pages, because the edit screens show
// the same one twice: the page waits for the server, then the form waits
// for what it loads itself, and a visitor shouldn't be able to tell
// those two waits apart.

function PageHeading({ back = false }: { back?: boolean }) {
    return (
        <>
            {back && <Skeleton className="h-9 w-24 rounded-lg" />}

            <div
                className={`flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between ${back ? "mt-8" : ""}`}
            >
                <div className="w-full">
                    <Skeleton className="h-5 w-24 rounded-lg" />
                    <Skeleton className="mt-3 h-10 w-72 max-w-full rounded-lg" />
                    <Skeleton className="mt-4 h-5 w-[32rem] max-w-full rounded-lg" />
                </div>

                <Skeleton className="h-9 w-32 shrink-0 rounded-lg" />
            </div>
        </>
    );
}

// One offer card: a picture across the top, then its words.
function OfferCardSkeleton() {
    return (
        <div className="overflow-hidden rounded-xl border border-[#17233B]/10 bg-white">
            <Skeleton className="aspect-[3/1] w-full rounded-none" />

            <div className="p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                        <Skeleton className="h-4 w-20 rounded-lg" />
                        <Skeleton className="mt-2 h-7 w-56 max-w-full rounded-lg" />
                        <Skeleton className="mt-2 h-4 w-28 rounded-lg" />
                    </div>

                    <Skeleton className="h-6 w-20 shrink-0 rounded-full" />
                </div>

                <Skeleton className="mt-5 h-5 w-full rounded-lg" />

                <div className="mt-6 grid gap-3 border-t border-[#17233B]/10 pt-5 sm:grid-cols-2">
                    <Skeleton className="h-4 w-32 rounded-lg" />
                    <Skeleton className="h-4 w-40 rounded-lg" />
                </div>

                <div className="mt-6 flex flex-wrap gap-3">
                    <Skeleton className="h-8 w-24 rounded-lg" />
                    <Skeleton className="h-8 w-20 rounded-lg" />
                    <Skeleton className="h-8 w-24 rounded-lg" />
                </div>
            </div>
        </div>
    );
}

// The list: the tile that makes another offer, then the offers.
export function OffersLoading() {
    return (
        <div className="text-[#17233B]">
            <div>
                <PageHeading />

                <section className="mt-10">
                    <div className="grid gap-5 xl:grid-cols-2">
                        <div className="flex h-full min-h-56 flex-col items-center justify-center rounded-xl border border-dashed border-[#17233B]/20 bg-white p-8">
                            <Skeleton className="size-10 rounded-full" />
                            <Skeleton className="mt-4 h-6 w-40 rounded-lg" />
                            <Skeleton className="mt-3 h-4 w-64 max-w-full rounded-lg" />
                            <Skeleton className="mt-5 h-11 w-36 rounded-lg" />
                        </div>

                        <OfferCardSkeleton />
                    </div>
                </section>
            </div>
        </div>
    );
}

// The fields, as a card of rows. Used by both forms, which ask for the
// same things in the same order.
function OfferFormSkeleton() {
    return (
        <div className="rounded-xl border border-[#17233B]/10 bg-white">
            <div className="p-6">
                <Skeleton className="h-6 w-32 rounded-lg" />
            </div>

            <div className="space-y-7 p-6 pt-0">
                {/* The photo, then its note. */}
                <div className="flex flex-wrap items-center gap-4">
                    <Skeleton className="h-20 w-28 rounded-lg" />
                    <Skeleton className="h-10 w-44 rounded-lg" />
                </div>

                <div className="space-y-2">
                    <Skeleton className="h-4 w-24 rounded-lg" />
                    <Skeleton className="h-12 w-full rounded-lg" />
                </div>

                {/* Category beside the type of offer. */}
                <div className="grid gap-6 sm:grid-cols-2">
                    {[1, 2].map((field) => (
                        <div key={field} className="space-y-2">
                            <Skeleton className="h-4 w-28 rounded-lg" />
                            <Skeleton className="h-12 w-full rounded-lg" />
                        </div>
                    ))}
                </div>

                <div className="space-y-2">
                    <Skeleton className="h-4 w-24 rounded-lg" />
                    <Skeleton className="h-28 w-full rounded-lg" />
                </div>

                {/* When can it be used, and who for. */}
                <div className="space-y-3">
                    <Skeleton className="h-4 w-40 rounded-lg" />
                    <div className="grid gap-2 sm:grid-cols-3">
                        {[1, 2, 3].map((choice) => (
                            <Skeleton key={choice} className="h-11 w-full rounded-xl" />
                        ))}
                    </div>
                </div>

                <div className="space-y-3">
                    <Skeleton className="h-4 w-28 rounded-lg" />
                    <div className="grid gap-2 sm:grid-cols-2">
                        {[1, 2].map((choice) => (
                            <Skeleton key={choice} className="h-11 w-full rounded-xl" />
                        ))}
                    </div>
                </div>

                <div className="space-y-2">
                    <Skeleton className="h-4 w-24 rounded-lg" />
                    <Skeleton className="h-12 w-full rounded-lg" />
                </div>

                <Skeleton className="h-12 w-full rounded-lg" />
            </div>
        </div>
    );
}

// Creating one: the form, and the card it will become.
export function NewOfferLoading() {
    return (
        <div className="text-[#17233B]">
            <div>
                <PageHeading back />

                <div className="mt-10 grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
                    <div className="order-2 lg:order-1">
                        <OfferFormSkeleton />
                    </div>

                    <aside className="order-1 lg:order-2">
                        <div className="rounded-xl border border-[#17233B]/10 bg-[#FFF8F0] p-4">
                            <Skeleton className="h-4 w-16 rounded-lg" />
                            <Skeleton className="mt-3 aspect-[3/4] w-full rounded-2xl" />
                            <Skeleton className="mt-3 h-4 w-48 max-w-full rounded-lg" />
                        </div>
                    </aside>
                </div>
            </div>
        </div>
    );
}

// Editing one: how it has done so far, then the same form.
export function EditOfferLoading() {
    return (
        <div className="text-[#17233B]">
            <div>
                <Skeleton className="h-9 w-24 rounded-lg" />

                <div className="mt-8">
                    <Skeleton className="h-5 w-40 rounded-lg" />
                    <Skeleton className="mt-3 h-10 w-56 rounded-lg" />
                    <Skeleton className="mt-4 h-6 w-48 rounded-lg" />
                </div>

                <div className="mt-8 rounded-xl border border-[#17233B]/10 bg-white p-6">
                    <Skeleton className="h-6 w-44 rounded-lg" />
                    <Skeleton className="mt-4 h-8 w-32 rounded-lg" />
                    <Skeleton className="mt-2 h-4 w-56 rounded-lg" />
                </div>

                <div className="mt-6">
                    <OfferFormSkeleton />
                </div>
            </div>
        </div>
    );
}

// The business's own details: a card of tabbed fields, and the card the
// directory shows beside it.
export function BusinessProfileLoading() {
    return (
        <div className="text-[#17233B]">
            <div>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="w-full">
                        <Skeleton className="h-5 w-40 rounded-lg" />
                        <Skeleton className="mt-3 h-10 w-64 max-w-full rounded-lg" />
                        <Skeleton className="mt-4 h-5 w-[26rem] max-w-full rounded-lg" />
                    </div>

                    <Skeleton className="h-11 w-44 shrink-0 rounded-lg" />
                </div>

                <div className="mt-10 grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_21rem]">
                    <div className="rounded-xl border border-[#17233B]/10 bg-white p-6 sm:p-8">
                        {/* Profile, Photos, Location, Hours. Only the
                            chosen one is a pill on the loaded page, and
                            four skeletons on this track would just read
                            as one long bar. */}
                        <div className="flex w-full flex-wrap gap-1 rounded-full bg-[#17233B]/5 p-1">
                            <div className="h-9 w-20 rounded-full bg-white shadow-sm" />
                        </div>

                        <div className="mt-8 space-y-6">
                            {[1, 2].map((field) => (
                                <div key={field} className="space-y-2">
                                    <Skeleton className="h-4 w-28 rounded-lg" />
                                    <Skeleton className="h-12 w-full rounded-lg" />
                                </div>
                            ))}

                            <div className="space-y-2">
                                <Skeleton className="h-4 w-24 rounded-lg" />
                                <Skeleton className="h-24 w-full rounded-lg" />
                            </div>

                            {[1, 2, 3].map((field) => (
                                <div key={field} className="space-y-2">
                                    <Skeleton className="h-4 w-32 rounded-lg" />
                                    <Skeleton className="h-12 w-full rounded-lg" />
                                </div>
                            ))}
                        </div>

                        <Skeleton className="mt-8 h-12 w-full rounded-lg" />
                    </div>

                    <aside>
                        <Skeleton className="h-4 w-44 rounded-lg" />
                        <Skeleton className="mt-3 h-72 w-full rounded-2xl" />
                        <Skeleton className="mt-3 h-4 w-full rounded-lg" />
                        <Skeleton className="mt-2 h-4 w-3/4 rounded-lg" />
                    </aside>
                </div>
            </div>
        </div>
    );
}
