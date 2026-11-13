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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { confirmsName } from "@/lib/close-business";
import { closeBusiness } from "./actions";

const plural = (count: number, one: string, many: string) =>
    `${count} ${count === 1 ? one : many}`;

export function CloseBusiness({
    businessId,
    businessName,
    teammates,
    hasSubscription,
    cardHolders,
    posters,
    followers,
}: {
    businessId: string;
    businessName: string;
    // Everyone who loses access, named before anyone confirms.
    teammates: string[];
    hasSubscription: boolean;
    // Closing is abstract until it is counted. These are the people on
    // the other side of it, and the things already in windows.
    cardHolders: number;
    posters: number;
    followers: number;
}) {
    const [isOpen, setIsOpen] = useState(false);
    const [typed, setTyped] = useState("");

    const matches = confirmsName(typed, businessName);

    return (
        <>
            <Button type="button" variant="outline" onClick={() => setIsOpen(true)}>
                Close this business
            </Button>

            <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Close {businessName}?</DialogTitle>

                        <DialogDescription>
                            This closes one business. Anything else you run on Promotello
                            carries on exactly as it is.
                        </DialogDescription>
                    </DialogHeader>

                    {(cardHolders > 0 || followers > 0 || posters > 0) && (
                        <p className="rounded-xl bg-[#FFF8F0] px-4 py-3 text-sm leading-6">
                            <span className="font-semibold">Right now: </span>
                            {[
                                cardHolders > 0
                                    ? `${plural(cardHolders, "person is", "people are")} collecting stamps`
                                    : null,
                                followers > 0
                                    ? `${plural(followers, "person follows", "people follow")} you`
                                    : null,
                                posters > 0
                                    ? `${plural(posters, "poster is", "posters are")} up`
                                    : null,
                            ]
                                .filter(Boolean)
                                .join(", ")}
                            .
                        </p>
                    )}

                    <ul className="space-y-2 text-sm text-[#17233B]/75">
                        <li>
                            <strong className="font-semibold text-[#17233B]">
                                It comes off the directory.
                            </strong>{" "}
                            Its page says you have left straight away, and it drops out of
                            the listings within a few minutes. Nobody new can join its
                            loyalty card or claim its offers from the moment you confirm.
                        </li>

                        <li>
                            <strong className="font-semibold text-[#17233B]">
                                Nothing is deleted.
                            </strong>{" "}
                            The stamps and vouchers customers are holding stay theirs. The
                            {posters > 0 ? ` ${plural(posters, "poster", "posters")} in your windows` : " posters in your windows"}
                            {" "}still scan, but what they open is a page saying you have
                            left — so take them down.
                        </li>

                        {hasSubscription && (
                            <li>
                                <strong className="font-semibold text-[#17233B]">
                                    Your subscription is cancelled.
                                </strong>{" "}
                                It runs to the end of the period you have already paid for,
                                and then stops.
                            </li>
                        )}

                        {teammates.length > 0 && (
                            <li>
                                <strong className="font-semibold text-[#17233B]">
                                    {teammates.length === 1
                                        ? "1 other person loses access:"
                                        : `${teammates.length} other people lose access:`}
                                </strong>{" "}
                                {teammates.join(", ")}.
                            </li>
                        )}

                        <li>You can reopen it from your dashboard at any time.</li>
                    </ul>

                    <form action={closeBusiness} className="space-y-4">
                        <input type="hidden" name="businessId" value={businessId} />

                        <div className="space-y-2">
                            <Label htmlFor="confirmName">
                                Type <span className="font-semibold">{businessName}</span> to
                                confirm
                            </Label>
                            <Input
                                id="confirmName"
                                name="confirmName"
                                autoComplete="off"
                                value={typed}
                                onChange={(event) => setTyped(event.target.value)}
                            />
                        </div>

                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                size="lg"
                                onClick={() => setIsOpen(false)}
                            >
                                Keep it open
                            </Button>

                            <Button type="submit" variant="destructive" size="lg" disabled={!matches}>
                                Close {businessName}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </>
    );
}
