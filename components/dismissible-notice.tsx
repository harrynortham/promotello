"use client";

import { useState } from "react";
import { FiX } from "react-icons/fi";

import { dismissCityNotice } from "@/lib/city-cookie";

// The strip above the listings, with a way to close it. Closing hides it at
// once and is remembered, so it doesn't come back on the next page.
export function DismissibleNotice({ label, children }: { label: string; children: React.ReactNode }) {
    const [shown, setShown] = useState(true);

    if (!shown) return null;

    return (
        <aside aria-label={label} className="relative border-b border-[#FF593F]/20 bg-[#FF593F]/10 text-[#17233B]">
            <div className="mx-auto flex max-w-7xl flex-col gap-3 px-6 py-4 pr-14 sm:px-10 sm:pr-16 lg:flex-row lg:items-center lg:justify-between">
                {children}
            </div>

            <button
                type="button"
                onClick={() => {
                    dismissCityNotice();
                    setShown(false);
                }}
                aria-label="Close"
                className="absolute right-3 top-3 flex size-9 items-center justify-center rounded-full text-[#17233B]/65 transition hover:bg-[#17233B]/5 hover:text-[#17233B] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF593F] sm:right-5"
            >
                <FiX aria-hidden="true" className="size-5" />
            </button>
        </aside>
    );
}
