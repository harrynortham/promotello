import Link from "next/link";
import { FiEdit2 } from "react-icons/fi";

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
