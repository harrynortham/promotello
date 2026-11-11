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

// Eyebrow, title, the line under it, and whatever sits opposite. Every
// dashboard page opens this way, some behind a back link.
function PageHeading({
    back = false,
    eyebrow = true,
    action = true,
}: {
    back?: boolean;
    eyebrow?: boolean;
    action?: boolean;
}) {
    return (
        <>
            {back && <Skeleton className="h-9 w-24 rounded-lg" />}

            <div
                className={`flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between ${back ? "mt-8" : ""}`}
            >
                <div className="w-full">
                    {eyebrow && <Skeleton className="h-5 w-24 rounded-lg" />}
                    <Skeleton className={`${eyebrow ? "mt-3 " : ""}h-10 w-72 max-w-full rounded-lg`} />
                    <Skeleton className="mt-4 h-5 w-[32rem] max-w-full rounded-lg" />
                </div>

                {action && <Skeleton className="h-9 w-32 shrink-0 rounded-lg" />}
            </div>
        </>
    );
}

// A card of fields: a heading, rows of label-and-box, then the button
// that saves them.
function FieldsCard({ fields = 4, heading = true }: { fields?: number; heading?: boolean }) {
    return (
        <div className="rounded-xl border border-[#17233B]/10 bg-white p-6 sm:p-8">
            {heading && <Skeleton className="h-6 w-48 rounded-lg" />}

            <div className={`space-y-5 ${heading ? "mt-6" : ""}`}>
                {Array.from({ length: fields }, (_, field) => (
                    <div key={field} className="space-y-2">
                        <Skeleton className="h-4 w-28 rounded-lg" />
                        <Skeleton className="h-12 w-full rounded-lg" />
                    </div>
                ))}
            </div>

            <Skeleton className="mt-8 h-12 w-40 rounded-lg" />
        </div>
    );
}

// One screen, one form: the profile's own pages, and the pages that make
// a QR code or a loyalty card.
export function FormPageLoading({
    back = false,
    eyebrow = true,
    fields = 4,
}: {
    back?: boolean;
    eyebrow?: boolean;
    fields?: number;
}) {
    return (
        <div className="text-[#17233B]">
            <div>
                <PageHeading back={back} eyebrow={eyebrow} action={false} />

                <div className="mt-10">
                    <FieldsCard fields={fields} heading={false} />
                </div>
            </div>
        </div>
    );
}

// A header and a stack of wide cards: the automations, the events, the
// settings.
export function CardStackLoading({
    cards = 3,
    eyebrow = true,
    action = true,
}: {
    cards?: number;
    eyebrow?: boolean;
    action?: boolean;
}) {
    return (
        <div className="text-[#17233B]">
            <div>
                <PageHeading eyebrow={eyebrow} action={action} />

                <div className="mt-10 space-y-5">
                    {Array.from({ length: cards }, (_, card) => (
                        <div
                            key={card}
                            className="rounded-xl border border-[#17233B]/10 bg-white p-6 sm:p-8"
                        >
                            <Skeleton className="h-6 w-56 max-w-full rounded-lg" />
                            <Skeleton className="mt-3 h-4 w-full max-w-lg rounded-lg" />
                            <Skeleton className="mt-6 h-12 w-full rounded-lg" />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

// A header, the tile that makes another one, then what there is: the QR
// posters, laid out like the offers.
export function CardGridLoading({ cards = 2 }: { cards?: number }) {
    return (
        <div className="text-[#17233B]">
            <div>
                <PageHeading />

                <div className="mt-10 grid gap-5 md:grid-cols-2">
                    <div className="flex h-full min-h-56 flex-col items-center justify-center rounded-xl border border-dashed border-[#17233B]/20 bg-white p-8">
                        <Skeleton className="size-10 rounded-full" />
                        <Skeleton className="mt-4 h-6 w-40 rounded-lg" />
                        <Skeleton className="mt-3 h-4 w-56 max-w-full rounded-lg" />
                        <Skeleton className="mt-5 h-11 w-36 rounded-lg" />
                    </div>

                    {Array.from({ length: cards }, (_, card) => (
                        <div
                            key={card}
                            className="rounded-xl border border-[#17233B]/10 bg-white p-6"
                        >
                            <div className="flex gap-4">
                                <Skeleton className="size-24 shrink-0 rounded-lg" />

                                <div className="w-full space-y-2">
                                    <Skeleton className="h-5 w-32 rounded-lg" />
                                    <Skeleton className="h-4 w-full rounded-lg" />
                                    <Skeleton className="h-4 w-24 rounded-lg" />
                                </div>
                            </div>

                            <div className="mt-6 grid grid-cols-3 gap-3">
                                {[1, 2, 3].map((stat) => (
                                    <Skeleton key={stat} className="h-12 rounded-lg" />
                                ))}
                            </div>

                            <div className="mt-6 flex gap-3">
                                <Skeleton className="h-9 w-28 rounded-lg" />
                                <Skeleton className="h-9 w-24 rounded-lg" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

// A form with the thing it makes beside it: the loyalty card.
export function FormAndPreviewLoading() {
    return (
        <div className="text-[#17233B]">
            <div>
                <PageHeading />

                <div className="mt-10 grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_21rem]">
                    <FieldsCard fields={4} />

                    <aside>
                        <Skeleton className="h-4 w-44 rounded-lg" />
                        <Skeleton className="mt-3 h-64 w-full rounded-2xl" />
                        <Skeleton className="mt-3 h-4 w-full rounded-lg" />
                    </aside>
                </div>
            </div>
        </div>
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
