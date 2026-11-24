import Link from "next/link";
import { cardLine } from "@/lib/loyalty-state";
import { FiGift, FiTag } from "react-icons/fi";

import { Button } from "@/components/ui/button";

// The offer and the card we put in their email, on the first screen
// they see after claiming.
//
// This is the join between the thing that persuaded them and the thing
// they now have to do. Before it, a business said yes to "2 for 1 on
// coffee, 9 stamps for a free flat white" and then met a blank form.
//
// It is a prompt, not a promise: nothing is live, nothing has been
// written on their page, and both buttons open a form they can change or
// abandon. It stops appearing as soon as they have an offer and a card
// of their own, because by then ours is a worse version of a thing they
// have already done.

export function FromYourEmail({
    businessId,
    offer,
    card,
}: {
    businessId: string;
    offer: string | null;
    card: { reward: string; stamps: number } | null;
}) {
    if (!offer && !card) return null;

    return (
        <section
            aria-labelledby="from-your-email"
            className="rounded-2xl border border-[#FF593F]/20 bg-[#FFF4EE] p-5 sm:p-6"
        >
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#FF593F]">
                From your email
            </p>

            {/* starterToShow drops whichever half is done, so by the time
                somebody has made the offer only the card is left — and
                the heading went on naming the offer and offering "either
                one" of the one thing below it. */}
            <h2 id="from-your-email" className="mt-2 text-lg font-semibold">
                {offer && card
                    ? "The offer and card we showed you are still here"
                    : offer
                        ? "The offer we showed you is still here"
                        : "The card we showed you is still here"}
            </h2>

            <p className="mt-1 text-sm leading-6 text-[#17233B]/70">
                {offer && card
                    ? "Open either one and it comes up filled in, ready for you to change or publish."
                    : "It comes up filled in, ready for you to change or publish."}
            </p>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {offer && (
                    <div className="flex flex-col justify-between gap-4 rounded-xl bg-white p-4">
                        <div>
                            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[#17233B]/55">
                                <FiTag aria-hidden="true" className="text-[#FF593F]" />
                                Your offer
                            </p>
                            <p className="mt-2 font-semibold leading-6">{offer}</p>
                        </div>

                        <Button
                            render={<Link href={`/business/${businessId}/offers/new?from=email`} />}
                            nativeButton={false}
                            size="sm"
                            className="w-fit"
                        >
                            Use this offer
                        </Button>
                    </div>
                )}

                {card && (
                    <div className="flex flex-col justify-between gap-4 rounded-xl bg-white p-4">
                        <div>
                            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[#17233B]/55">
                                <FiGift aria-hidden="true" className="text-[#FF593F]" />
                                Your loyalty card
                            </p>
                            <p className="mt-2 font-semibold leading-6">
                                {cardLine(card.stamps, card.reward)}
                            </p>
                        </div>

                        <Button
                            render={<Link href={`/business/${businessId}/loyalty?from=email`} />}
                            nativeButton={false}
                            size="sm"
                            variant="outline"
                            className="w-fit"
                        >
                            Set up this card
                        </Button>
                    </div>
                )}
            </div>
        </section>
    );
}
