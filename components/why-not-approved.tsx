import Link from "next/link";

import { declineLines, findReason, helpAnchor, type ReviewOf } from "@/lib/review-reasons";

// What we couldn't approve, where they are standing when they find out.
//
// The email says it, the notification says it, and this is the third
// place it has to agree: on the dashboard, next to the thing that isn't
// live. All three read from the same row and the same sentences, so
// there is nothing to keep in step.
//
// A decline from before reasons existed renders nothing but the way to
// reach us, which is honest — we don't know why either.

export function WhyNotApproved({
    of,
    reason,
    note,
    className = "",
}: {
    of: ReviewOf;
    reason: string | null | undefined;
    note: string | null | undefined;
    className?: string;
}) {
    const lines = declineLines(of, reason, note);
    const fix = findReason(of, reason)?.fix;
    const said = lines.filter((line) => line !== fix);

    return (
        <div className={`rounded-xl border border-red-100 bg-red-50/60 p-4 ${className}`}>
            <p className="text-sm font-semibold text-[#17233B]">
                {of === "business" ? "Why it wasn't approved" : "Why this offer wasn't approved"}
            </p>

            {said.length > 0 ? (
                said.map((line, index) => (
                    <p key={index} className="mt-2 text-sm leading-6 text-[#17233B]/75">
                        {line}
                    </p>
                ))
            ) : (
                <p className="mt-2 text-sm leading-6 text-[#17233B]/75">
                    We didn&apos;t record a reason for this one. Ask us and we&apos;ll tell you
                    straight away.
                </p>
            )}

            {fix && (
                <div className="mt-3 rounded-lg bg-white/70 p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-[#FF593F]">
                        What to change
                    </p>
                    <p className="mt-1 text-sm leading-6 text-[#17233B]/80">{fix}</p>
                </div>
            )}

            <p className="mt-3 text-sm text-[#17233B]/70">
                <Link href={helpAnchor(of)} className="font-medium underline underline-offset-4">
                    {of === "business" ? "Why a business isn't approved" : "Why an offer isn't approved"}
                </Link>
                {" · "}
                <Link
                    href="/business/contact"
                    className="font-medium underline underline-offset-4"
                >
                    Ask us
                </Link>
            </p>
        </div>
    );
}
