"use client";

import Link from "next/link";
import { Popover } from "@base-ui/react/popover";
import { FiArrowLeft } from "react-icons/fi";

// Pills that sit over a business's cover image. Both are at least 36px tall
// so they stay a real tap target, and both use a translucent backdrop so
// they read over a light photo as well as a dark one.
const pill =
    "inline-flex min-h-9 items-center gap-1.5 rounded-full px-3 text-sm font-medium shadow-sm backdrop-blur " +
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF593F]";

export function CoverBackLink({ href, label, city }: { href: string; label: string; city: string }) {
    return (
        <Link
            href={href}
            aria-label={`Back to businesses in ${city}`}
            className={`${pill} absolute left-3 top-3 z-10 bg-white/90 text-[#17233B] ring-1 ring-[#17233B]/10 hover:bg-white`}
        >
            <FiArrowLeft aria-hidden="true" className="size-4" />
            {label}
        </Link>
    );
}

// The old full-width banner explained what an example business is. As a pill
// there is no room for that, so the explanation moves into a popover a touch
// device can open — a title attribute alone would never be reachable.
export function CoverExampleBadge() {
    return (
        <Popover.Root>
            <Popover.Trigger
                className={`${pill} absolute right-3 top-3 z-10 bg-[#17233B]/90 font-semibold text-white ring-1 ring-white/30 hover:bg-[#17233B]`}
            >
                Example
            </Popover.Trigger>

            <Popover.Portal>
                <Popover.Positioner side="bottom" align="end" sideOffset={8} className="z-50">
                    <Popover.Popup className="max-w-xs rounded-2xl border border-[#17233B]/10 bg-white p-4 text-sm leading-6 text-[#17233B] shadow-lg">
                        This is an example business, to show how Promotello works. It isn&apos;t real, so
                        its offers can&apos;t be claimed.
                    </Popover.Popup>
                </Popover.Positioner>
            </Popover.Portal>
        </Popover.Root>
    );
}
