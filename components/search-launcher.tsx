"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { FiSearch } from "react-icons/fi";

import {
    Drawer,
    DrawerContent,
    DrawerHeader,
    DrawerTitle,
    DrawerTrigger,
} from "@/components/ui/drawer";

// On phones, one compact search pill instead of the full search area, so
// results start near the top. Tapping it opens the search fields (children)
// in a panel that drops down from the top.
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
        <Drawer open={open} onOpenChange={setOpen} swipeDirection="up" showSwipeHandle>
            <DrawerTrigger className="flex w-full cursor-pointer items-center gap-3 rounded-full border border-[#17233B]/10 bg-white px-5 py-3 text-left shadow-[0_6px_20px_rgba(23,35,59,0.08)] transition active:scale-[0.99]">
                <FiSearch aria-hidden="true" className="size-5 shrink-0 text-[#17233B]" />
                <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-[#17233B]">{title}</span>
                    <span className="block truncate text-xs text-[#17233B]/60">{summary}</span>
                </span>
            </DrawerTrigger>

            <DrawerContent>
                <div className="mx-auto w-full max-w-md">
                    <DrawerHeader className="text-left">
                        <DrawerTitle className="text-lg font-semibold">{heading}</DrawerTitle>
                    </DrawerHeader>

                    {/* Room below for the place suggestions to open into. */}
                    <div className="min-h-[60dvh] space-y-6 p-4">{children}</div>
                </div>
            </DrawerContent>
        </Drawer>
    );
}
