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

export function CloseBusiness({
    businessId,
    businessName,
    teammates,
    hasSubscription,
}: {
    businessId: string;
    businessName: string;
    // Everyone who loses access, named before anyone confirms.
    teammates: string[];
    hasSubscription: boolean;
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
                            The stamps and vouchers customers are holding stay theirs, and
                            posters already in your window still open a page that explains
                            you&rsquo;ve left.
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
