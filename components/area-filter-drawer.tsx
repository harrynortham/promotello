"use client";

import Link from "next/link";
import { useState, type MouseEvent } from "react";
import { FiCheck, FiSliders } from "react-icons/fi";

import {
    Drawer,
    DrawerContent,
    DrawerDescription,
    DrawerHeader,
    DrawerTitle,
    DrawerTrigger,
} from "@/components/ui/drawer";

type AreaOption = { label: string; href: string; active: boolean };

// A Filter pill that opens a drawer of areas, so the area choices don't take
// a row of pills of their own. `options` starts with the whole city.
export function AreaFilterDrawer({ options, place }: { options: AreaOption[]; place: string }) {
    const [open, setOpen] = useState(false);
    // The first option is "All of the city"; anything else means a filter is on.
    const chosen = options.slice(1).find((option) => option.active);

    // Choosing an area closes the drawer as the page updates.
    function closeOnLink(event: MouseEvent<HTMLDivElement>) {
        if ((event.target as HTMLElement).closest("a")) setOpen(false);
    }

    return (
        <Drawer open={open} onOpenChange={setOpen} showSwipeHandle>
            <DrawerTrigger
                className={`inline-flex shrink-0 cursor-pointer items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition ${chosen
                    ? "border-[#17233B] bg-[#17233B] text-white"
                    : "border-[#17233B]/15 bg-white text-[#17233B]/75 hover:border-[#17233B]/40 hover:text-[#17233B]"
                    }`}
            >
                <FiSliders aria-hidden="true" className="size-4" />
                {chosen ? chosen.label : "Filter"}
            </DrawerTrigger>

            <DrawerContent>
                <div className="mx-auto w-full max-w-md">
                    <DrawerHeader className="text-left">
                        <DrawerTitle className="text-lg font-semibold">Filter by area</DrawerTitle>
                        <DrawerDescription>Businesses in a part of {place}.</DrawerDescription>
                    </DrawerHeader>

                    <div className="max-h-[60dvh] overflow-y-auto p-4 pb-8" onClick={closeOnLink}>
                        <ul className="space-y-1">
                            {options.map((option) => (
                                <li key={option.href}>
                                    <Link
                                        href={option.href}
                                        scroll={false}
                                        aria-current={option.active ? "page" : undefined}
                                        className={`flex items-center justify-between rounded-xl px-4 py-3 text-sm transition ${option.active
                                            ? "bg-[#17233B]/5 font-semibold text-[#17233B]"
                                            : "text-[#17233B]/75 hover:bg-[#17233B]/5 hover:text-[#17233B]"
                                            }`}
                                    >
                                        {option.label}
                                        {option.active && <FiCheck aria-hidden="true" className="size-4 text-[#FF593F]" />}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </DrawerContent>
        </Drawer>
    );
}
