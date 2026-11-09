import Link from "next/link";
import { FiArrowLeft, FiEdit2 } from "react-icons/fi";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Shown only to the people who run the business, on the page their
// customers see. Everything on this page is set somewhere in the
// dashboard, and finding which screen is the slow part — so each piece
// carries the way back to its own.
//
// Quiet on purpose: this is still the customer's page, and an owner
// looking at it should be able to read it as one.
export function OwnerEdit({
    href,
    label,
    className,
}: {
    href: string;
    // What it edits, for the screen reader: "Edit your opening hours".
    label: string;
    className?: string;
}) {
    return (
        <Button
            render={<Link href={href} />}
            nativeButton={false}
            variant="outline"
            size="sm"
            aria-label={label}
            className={cn(
                "shrink-0 border-[#17233B]/15 bg-white/90 text-[#17233B]/70 hover:text-[#FF593F]",
                className,
            )}
        >
            <FiEdit2 aria-hidden="true" />
            Edit
        </Button>
    );
}

// An owner who followed "See your page" from the dashboard lands in the
// customer's half of the site: the header offers Explore and Offers, and
// the only link out of the page goes further into the directory. On a
// phone the new tab isn't obvious either, so the way back is on the page.
export function OwnerBar({
    businessId,
    privacy,
}: {
    businessId: string;
    // Why nobody else can see this yet, when that is the case. Said here
    // rather than in a second notice underneath saying much the same.
    privacy?: "unsent" | "waiting";
}) {
    return (
        <div className="mb-5 flex flex-col gap-3 rounded-2xl border border-[#17233B]/10 bg-white px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-[#17233B]/70">
                You&rsquo;re looking at your page the way a customer sees it.
                {privacy === "unsent" &&
                    " Only you and your team can see it, until you send it to us from your dashboard."}
                {privacy === "waiting" &&
                    " Only you and your team can see it, until our team approves it."}
            </p>

            <Button
                render={<Link href={`/business/${businessId}`} />}
                nativeButton={false}
                variant="outline"
                size="sm"
                className="w-fit shrink-0"
            >
                <FiArrowLeft aria-hidden="true" />
                Back to your dashboard
            </Button>
        </div>
    );
}
