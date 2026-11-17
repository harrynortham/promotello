"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

// Checkout sends them back here before Stripe's webhook has reached us,
// so for a second or two the page still shows the plans they just paid
// for. It used to say the plan "will appear here in a few seconds.
// Refresh the page if it doesn't" — and nothing made it appear, because
// the page is rendered once on the server and never asked again. The
// business was left reading a promise it had to keep itself.
//
// So this asks. router.refresh() re-runs the server component, and the
// moment the subscription is there the parent stops rendering this.
//
// Giving up matters as much as trying. A webhook that never lands is a
// real state — the listener is down, Stripe is retrying, the secret is
// wrong — and a spinner that turns for ever is a worse answer than
// saying so and pointing at the people who can look.
const EVERY = 2000;
const GIVE_UP_AFTER = 30_000;

export function WaitingForStripe() {
    const router = useRouter();
    const [waitedTooLong, setWaitedTooLong] = useState(false);

    useEffect(() => {
        const started = Date.now();

        const tick = setInterval(() => {
            if (Date.now() - started >= GIVE_UP_AFTER) {
                setWaitedTooLong(true);
                clearInterval(tick);
                return;
            }

            router.refresh();
        }, EVERY);

        return () => clearInterval(tick);
    }, [router]);

    if (waitedTooLong) {
        return (
            <Alert className="mt-8 border-amber-300 bg-amber-50 text-amber-900">
                <AlertTitle>This is taking longer than it should</AlertTitle>
                <AlertDescription>
                    <p>
                        Stripe has your details and you have not been charged twice — your
                        plan simply has not reached us yet. It usually arrives on its own.
                        If it still is not here in a few minutes, tell us and we will sort
                        it out.
                    </p>

                    <div className="mt-4 flex flex-wrap gap-2">
                        <Button size="sm" variant="outline" onClick={() => router.refresh()}>
                            Check again
                        </Button>
                    </div>
                </AlertDescription>
            </Alert>
        );
    }

    // Green, and leading with what happened for them. Stripe took the
    // sign-up; the only thing outstanding is our own plumbing catching
    // up, which is not their problem and should not be their worry. A
    // neutral box at the moment somebody has just subscribed reads as
    // "something is unresolved" when the honest answer is "that worked".
    return (
        <Alert className="mt-8 border-emerald-200 bg-emerald-50 text-emerald-900">
            <AlertTitle>You&apos;re signed up</AlertTitle>
            <AlertDescription>
                Stripe has confirmed your details. Your plan will appear here in a
                moment — nothing for you to do.
            </AlertDescription>
        </Alert>
    );
}
