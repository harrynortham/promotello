"use client";

import { useState } from "react";
import Link from "next/link";
import { FiCheck, FiChevronDown } from "react-icons/fi";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { SubmitButton } from "@/components/submit-button";

export type RedemptionRow = {
    id: string;
    code: string;
    claimedAt: string | null;
    usedAt: string | null;
    expired: boolean;
    offer: {
        title: string;
        discount: string;
        description: string | null;
        terms: string | null;
        expiresAt: string;
    } | null;
};

function when(value: string | null) {
    if (!value) return null;

    return new Intl.DateTimeFormat("en-GB", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "Europe/London",
    }).format(new Date(value));
}

// One claimed voucher. The code is the thing being matched against what
// the customer is holding, so it is the one monospaced, readable line;
// everything else is around it.
export function Redemption({
    redemption,
    businessId,
    markUsed,
}: {
    redemption: RedemptionRow;
    businessId: string;
    markUsed: (formData: FormData) => void;
}) {
    const [confirming, setConfirming] = useState(false);
    const [showingDetail, setShowingDetail] = useState(false);

    const { offer } = redemption;
    const used = Boolean(redemption.usedAt);
    const detail = offer?.description || offer?.terms;

    return (
        <li className="rounded-2xl border border-[#17233B]/10 bg-white">
            <div className="flex flex-wrap items-start justify-between gap-4 p-4 sm:p-5">
                <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold leading-tight">{offer?.title ?? "Offer"}</p>

                        {used ? (
                            <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">Used</Badge>
                        ) : redemption.expired ? (
                            <Badge className="bg-amber-100 text-amber-900 hover:bg-amber-100">Offer ended</Badge>
                        ) : (
                            <Badge variant="outline">To use</Badge>
                        )}
                    </div>

                    {offer?.discount && (
                        <p className="mt-1 text-sm font-medium text-[#FF593F]">{offer.discount}</p>
                    )}

                    <p className="mt-2 text-sm text-[#17233B]/60">
                        {when(redemption.claimedAt) ? `Claimed ${when(redemption.claimedAt)}` : "Claimed"}
                        {used && when(redemption.usedAt) && ` · used ${when(redemption.usedAt)}`}
                    </p>
                </div>

                <div className="flex shrink-0 flex-col items-stretch gap-2">
                    {/* The code opens the voucher itself, which is where
                        the QR and the whole of it live. */}
                    <Link
                        href={`/redeem/${redemption.code}`}
                        className="rounded-lg bg-[#17233B] px-3 py-1.5 text-center font-mono text-sm font-semibold tracking-[0.18em] text-white hover:bg-[#17233B]/90"
                    >
                        {redemption.code}
                    </Link>

                    {!used && (
                        <Button type="button" size="sm" onClick={() => setConfirming(true)}>
                            Mark as used
                        </Button>
                    )}
                </div>
            </div>

            {detail && (
                <div className="border-t border-[#17233B]/5 px-4 pb-4 sm:px-5">
                    {/* Folded away, because a list of twelve of these is
                        unreadable with every one open — but here, because
                        "what was this offer again?" is asked at the till. */}
                    <button
                        type="button"
                        onClick={() => setShowingDetail((open) => !open)}
                        aria-expanded={showingDetail}
                        className="mt-3 inline-flex cursor-pointer items-center gap-1.5 text-sm font-medium text-[#17233B]/70 hover:text-[#17233B]"
                    >
                        <FiChevronDown
                            aria-hidden="true"
                            className={`size-4 transition ${showingDetail ? "rotate-180" : ""}`}
                        />
                        Offer details
                    </button>

                    {showingDetail && (
                        <div className="mt-3 space-y-3 rounded-xl bg-[#FFF8F0] p-4">
                            {offer?.description && (
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#17233B]/55">
                                        What they get
                                    </p>
                                    <p className="mt-1 whitespace-pre-line text-sm leading-6 text-[#17233B]/80">
                                        {offer.description}
                                    </p>
                                </div>
                            )}

                            {offer?.terms && (
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#17233B]/55">
                                        Terms
                                    </p>
                                    <p className="mt-1 whitespace-pre-line text-sm leading-6 text-[#17233B]/80">
                                        {offer.terms}
                                    </p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* Marking a voucher used can't be undone, and the thing being
                given away is on the other side of the counter, so it asks
                once — with what the offer covers in front of them. */}
            <Dialog open={confirming} onOpenChange={setConfirming}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Mark this voucher as used?</DialogTitle>
                        <DialogDescription>
                            This can&apos;t be undone, and the customer can only use it once.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="rounded-xl bg-[#FFF8F0] p-4 text-sm">
                        <p className="font-semibold text-[#17233B]">{offer?.title ?? "Offer"}</p>
                        <p className="mt-1 font-medium text-[#FF593F]">{offer?.discount}</p>
                        <p className="mt-2 font-mono text-sm tracking-[0.18em] text-[#17233B]/70">
                            {redemption.code}
                        </p>

                        {offer?.description && (
                            <p className="mt-3 whitespace-pre-line leading-6 text-[#17233B]/75">
                                {offer.description}
                            </p>
                        )}

                        {offer?.terms && (
                            <p className="mt-2 whitespace-pre-line leading-6 text-[#17233B]/60">
                                {offer.terms}
                            </p>
                        )}
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="ghost" onClick={() => setConfirming(false)}>
                            Not yet
                        </Button>

                        <form action={markUsed}>
                            <input type="hidden" name="redemptionId" value={redemption.id} />
                            <input type="hidden" name="businessId" value={businessId} />
                            <input type="hidden" name="code" value={redemption.code} />
                            <SubmitButton pendingLabel="Marking…">
                                <FiCheck aria-hidden="true" />
                                Yes, mark it used
                            </SubmitButton>
                        </form>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </li>
    );
}

// What was just done, at the top of the page it comes back to.
export function JustUsed({ code, discount }: { code: string; discount: string | null }) {
    return (
        <div
            role="status"
            className="mt-8 flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-900"
        >
            <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white">
                <FiCheck aria-hidden="true" className="size-3.5" />
            </span>

            <div>
                <p className="font-semibold">Voucher {code} is used</p>
                <p className="mt-0.5 text-sm leading-6">
                    {discount ? `Apply ${discount} to their bill.` : "Apply the discount to their bill."}
                </p>
            </div>
        </div>
    );
}
