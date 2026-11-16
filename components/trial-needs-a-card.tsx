import Link from "next/link";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

// A trial that took no card ends by stopping rather than by charging
// (billing/actions.ts sets missing_payment_method: "cancel"). So the one
// business with something to do is the one that has not added a card,
// and until this the only places that said so were the billing page and
// an email five days out.
//
// It is shown for the whole trial rather than only at the end. A
// business that reads it in week one can decide once and stop thinking
// about it; one that first hears five days out has been left to find
// out, which is the thing we are fixing. The wording hardens as the
// date gets close, because "nothing to pay" is the useful fact early on
// and "this stops on Tuesday" is the useful fact late.

const DAY = 24 * 60 * 60 * 1000;

// Last week of the trial: close enough that the date matters more than
// the reassurance.
const SOON = 7;

export function daysUntil(end: string, now: Date = new Date()) {
    return Math.ceil((new Date(end).getTime() - now.getTime()) / DAY);
}

export function TrialNeedsACard({
    businessId,
    trialEnd,
    now,
}: {
    businessId: string;
    // The day it stops, already written the way a person reads it.
    trialEnd: string;
    now?: Date;
}) {
    const left = daysUntil(trialEnd, now);
    const soon = left <= SOON;
    const ends = new Intl.DateTimeFormat("en-GB", {
        day: "numeric",
        month: "long",
        timeZone: "Europe/London",
    }).format(new Date(trialEnd));

    return (
        <Alert className={soon ? "border-[#FF593F]/40 bg-[#FF593F]/5" : "border-[#17233B]/15 bg-white"}>
            <AlertTitle>
                {soon
                    ? `Add a card to keep Pro past ${ends}`
                    : `Pro is free until ${ends}`}
            </AlertTitle>

            <AlertDescription>
                <p>
                    There&apos;s no card on your trial, so nothing has been charged and
                    nothing will be.{" "}
                    {soon
                        ? `On ${ends} this goes back to Free unless you add one.`
                        : `Add one before ${ends} to carry on, or do nothing and it stops by itself.`}
                </p>

                <p className="mt-2">
                    On Free your page stays up and your stamp card keeps working for
                    everyone already on it — but you can&apos;t start another card,
                    offers past the first come off the directory, and your followers
                    stop hearing about new ones.
                </p>

                <p className="mt-3">
                    <Link
                        href={`/business/${businessId}/billing`}
                        className="font-medium underline underline-offset-4"
                    >
                        Add a card
                    </Link>
                </p>
            </AlertDescription>
        </Alert>
    );
}
