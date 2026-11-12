"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { closeLoyaltyProgram, reopenLoyaltyProgram } from "./actions";

// Whether a card is being handed out is the one thing on this page that
// changes what customers can do, and it used to happen on a single
// press. Both directions ask first, and say what the answer does to the
// people already holding one — which is nothing.

export function StopHandingOut({
    businessId,
    programId,
    programName,
    holders,
}: {
    businessId: string;
    programId: string;
    programName: string;
    holders: number;
}) {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <>
            <Button type="button" variant="outline" onClick={() => setIsOpen(true)}>
                Stop handing this out
            </Button>

            <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Stop handing out {programName}?</DialogTitle>

                        <DialogDescription>
                            It stops being the card on offer. You can hand it out again
                            whenever you like, as long as you haven&rsquo;t started
                            another one in the meantime.
                        </DialogDescription>
                    </DialogHeader>

                    <ul className="space-y-2 text-sm text-[#17233B]/75">
                        <li>
                            <strong className="font-semibold text-[#17233B]">
                                Nobody new can join it.
                            </strong>{" "}
                            It comes off your business page, and a QR poster pointing at
                            it tells people the card is closed.
                        </li>

                        <li>
                            <strong className="font-semibold text-[#17233B]">
                                {holders === 0
                                    ? "Nobody is holding one yet."
                                    : holders === 1
                                        ? "The 1 customer holding one carries on."
                                        : `The ${holders} customers holding one carry on.`}
                            </strong>{" "}
                            {holders === 0
                                ? "Nothing is lost either way."
                                : "They keep collecting stamps and claim what they were promised, and you stamp them exactly as before."}
                        </li>

                        <li>
                            It leaves you free to start a card with a different deal, since
                            only one card at a time takes new joiners.
                        </li>
                    </ul>

                    <form action={closeLoyaltyProgram}>
                        <input type="hidden" name="businessId" value={businessId} />
                        <input type="hidden" name="programId" value={programId} />

                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                size="lg"
                                onClick={() => setIsOpen(false)}
                            >
                                Keep handing it out
                            </Button>

                            <Button type="submit" size="lg">
                                Stop handing it out
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </>
    );
}

export function StartHandingOutAgain({
    businessId,
    programId,
    programName,
    // The card now on offer, if there is one: reopening this card would
    // mean two taking joiners at once, which isn't allowed.
    openCardName,
}: {
    businessId: string;
    programId: string;
    programName: string;
    openCardName: string | null;
}) {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <>
            <Button type="button" variant="outline" onClick={() => setIsOpen(true)}>
                Start handing this out again
            </Button>

            <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            {openCardName
                                ? `${openCardName} is the card on offer`
                                : `Hand out ${programName} again?`}
                        </DialogTitle>

                        <DialogDescription>
                            {openCardName
                                ? `Only one card at a time takes new joiners. Stop handing out ${openCardName} first, then this one can go back on offer.`
                                : "It goes back on your business page, with the stamps and reward it already promises, and customers can join it again."}
                        </DialogDescription>
                    </DialogHeader>

                    {openCardName ? (
                        <DialogFooter>
                            <Button type="button" size="lg" onClick={() => setIsOpen(false)}>
                                I see
                            </Button>
                        </DialogFooter>
                    ) : (
                        <form action={reopenLoyaltyProgram}>
                            <input type="hidden" name="businessId" value={businessId} />
                            <input type="hidden" name="programId" value={programId} />

                            <DialogFooter>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="lg"
                                    onClick={() => setIsOpen(false)}
                                >
                                    Leave it closed
                                </Button>

                                <Button type="submit" size="lg">
                                    Hand it out again
                                </Button>
                            </DialogFooter>
                        </form>
                    )}
                </DialogContent>
            </Dialog>
        </>
    );
}
