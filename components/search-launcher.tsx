"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { FiSearch } from "react-icons/fi";

import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

// On phones, one compact search pill instead of the full search area, so
// results start near the top. Tapping it opens the search fields (children)
// in a panel pinned near the top of the screen.
//
// Near the top because iOS keeps position:fixed against the layout viewport:
// a keyboard draws over the bottom of the screen rather than pushing
// anything up, so anything low down can be swallowed by it. Typing is the
// whole point here, so the fields have to stay in view while it is open.
export function SearchLauncher({
    title,
    summary,
    heading,
    children,
}: {
    title: string;
    summary: string;
    // The panel's title, such as "Search offers".
    heading: string;
    children: React.ReactNode;
}) {
    const [open, setOpen] = useState(false);

    // Picking a place changes the path; close as the new page shows.
    const pathname = usePathname();
    const [shownFor, setShownFor] = useState(pathname);
    if (pathname !== shownFor) {
        setShownFor(pathname);
        setOpen(false);
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger className="flex w-full cursor-pointer items-center gap-3 rounded-full border border-[#17233B]/10 bg-white px-5 py-3 text-left shadow-[0_6px_20px_rgba(23,35,59,0.08)] transition active:scale-[0.99]">
                <FiSearch aria-hidden="true" className="size-5 shrink-0 text-[#17233B]" />
                <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-[#17233B]">{title}</span>
                    <span className="block truncate text-xs text-[#17233B]/65">{summary}</span>
                </span>
            </DialogTrigger>

            <DialogContent className="top-3 flex max-h-[82dvh] -translate-y-0 flex-col gap-0 p-0 sm:max-w-md">
                <div className="min-h-0 overflow-y-auto p-4">
                    <DialogTitle className="text-lg font-semibold">{heading}</DialogTitle>

                    {/* The place suggestions used to need room reserved below
                        them to open into. They open in their own panel now. */}
                    <div className="mt-4 space-y-6">{children}</div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
