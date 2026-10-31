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

export type FilterOption = { label: string; href: string; active: boolean };

// Each section's first option is its default (all areas, newest first).
export type FilterSection = { title: string; options: FilterOption[] };

// A Filter pill that opens a drawer of choices (area, sort order…), so they
// don't each need a row of pills. The pill shows what's chosen.
export function FilterDrawer({ sections, description }: { sections: FilterSection[]; description?: string }) {
    const [open, setOpen] = useState(false);
    const chosen = sections
        .map((section) => section.options.slice(1).find((option) => option.active)?.label)
        .filter(Boolean);

    // Choosing an option closes the drawer as the page updates.
    function closeOnLink(event: MouseEvent<HTMLDivElement>) {
        if ((event.target as HTMLElement).closest("a")) setOpen(false);
    }

    return (
        <Drawer open={open} onOpenChange={setOpen} showSwipeHandle>
            <DrawerTrigger
                className={`inline-flex max-w-64 shrink-0 cursor-pointer items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition ${chosen.length
                    ? "border-[#17233B] bg-[#17233B] text-white"
                    : "border-[#17233B]/15 bg-white text-[#17233B]/75 hover:border-[#17233B]/40 hover:text-[#17233B]"
                    }`}
            >
                <FiSliders aria-hidden="true" className="size-4 shrink-0" />
                <span className="truncate">{chosen.length ? chosen.join(" · ") : "Filter"}</span>
            </DrawerTrigger>

            <DrawerContent>
                <div className="mx-auto w-full max-w-md">
                    <DrawerHeader className="text-left">
                        <DrawerTitle className="text-lg font-semibold">Filter</DrawerTitle>
                        {description && <DrawerDescription>{description}</DrawerDescription>}
                    </DrawerHeader>

                    <div className="max-h-[65dvh] space-y-6 overflow-y-auto p-4 pb-8" onClick={closeOnLink}>
                        {sections.map((section) => (
                            <section key={section.title}>
                                <h3 className="px-4 pb-1 text-xs font-semibold uppercase tracking-[0.14em] text-[#17233B]/55">
                                    {section.title}
                                </h3>
                                <ul className="space-y-1">
                                    {section.options.map((option) => (
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
                            </section>
                        ))}
                    </div>
                </div>
            </DrawerContent>
        </Drawer>
    );
}
