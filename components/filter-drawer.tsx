"use client";

import Link from "next/link";
import { useState, type MouseEvent } from "react";
import { FiCheck, FiSliders, FiX } from "react-icons/fi";

import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
    Drawer,
    DrawerClose,
    DrawerContent,
    DrawerDescription,
    DrawerHeader,
    DrawerTitle,
    DrawerTrigger,
} from "@/components/ui/drawer";
import { useMediaQuery } from "@/lib/use-media-query";

// A count is shown beside the label where the list has one to give,
// such as how many vouchers are in each state.
export type FilterOption = { label: string; href: string; active: boolean; count?: number };

// Each section's first option is its default (all areas, newest first).
export type FilterSection = { title: string; options: FilterOption[] };

function triggerClasses(chosen: string[]) {
    return `inline-flex max-w-64 shrink-0 cursor-pointer items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition ${chosen.length
        ? "border-[#17233B] bg-[#17233B] text-white"
        : "border-[#17233B]/15 bg-white text-[#17233B]/75 hover:border-[#17233B]/40 hover:text-[#17233B]"
        }`;
}

function TriggerLabel({ chosen }: { chosen: string[] }) {
    return (
        <>
            <FiSliders aria-hidden="true" className="size-4 shrink-0" />
            <span className="truncate">{chosen.length ? chosen.join(" · ") : "Filter"}</span>
        </>
    );
}

function Choices({ sections, onChoose }: { sections: FilterSection[]; onChoose: (event: MouseEvent<HTMLDivElement>) => void }) {
    return (
        <div className="space-y-6" onClick={onChoose}>
            {sections.map((section) => (
                <section key={section.title}>
                    <h3 className="px-4 pb-1 text-xs font-semibold uppercase tracking-[0.14em] text-[#17233B]/65">
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

                                    <span className="flex shrink-0 items-center gap-2">
                                        {option.count !== undefined && (
                                            <span className="rounded-full bg-[#17233B]/5 px-2 py-0.5 text-xs text-[#17233B]/65">
                                                {option.count}
                                            </span>
                                        )}
                                        {option.active && <FiCheck aria-hidden="true" className="size-4 text-[#FF593F]" />}
                                    </span>
                                </Link>
                            </li>
                        ))}
                    </ul>
                </section>
            ))}
        </div>
    );
}

// A Filter pill that opens the choices (area, sort order…), so they don't
// each need a row of pills. The pill shows what's chosen.
//
// A desktop has width to spare and the pointer is already up near the pill,
// so they come in from the side and leave the results on screen beside them.
// A phone gets the same panel near the top of the screen as the search and
// the places: one shape to learn, and clear of a keyboard — iOS draws one
// over the bottom of the screen rather than pushing anything up.
export function FilterDrawer({ sections, description }: { sections: FilterSection[]; description?: string }) {
    const beside = useMediaQuery("(min-width: 1024px)");
    const [open, setOpen] = useState(false);

    const chosen = sections
        .map((section) => section.options.slice(1).find((option) => option.active)?.label)
        .filter((label): label is string => Boolean(label));

    // Choosing an option closes it as the page updates.
    function closeOnLink(event: MouseEvent<HTMLDivElement>) {
        if ((event.target as HTMLElement).closest("a")) setOpen(false);
    }

    if (!beside) {
        return (
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger className={triggerClasses(chosen)}>
                    <TriggerLabel chosen={chosen} />
                </DialogTrigger>

                <DialogContent className="top-3 flex max-h-[82dvh] -translate-y-0 flex-col gap-0 p-0 sm:max-w-md">
                    <div className="min-h-0 overflow-y-auto p-4">
                        <DialogTitle className="text-lg font-semibold">Filter</DialogTitle>
                        {description && <p className="mt-1 text-sm text-[#17233B]/70">{description}</p>}

                        <div className="mt-4">
                            <Choices sections={sections} onChoose={closeOnLink} />
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        );
    }

    return (
        <Drawer open={open} onOpenChange={setOpen} swipeDirection="right" showSwipeHandle>
            <DrawerTrigger className={triggerClasses(chosen)}>
                <TriggerLabel chosen={chosen} />
            </DrawerTrigger>

            <DrawerContent>
                <div className="flex h-full w-full flex-col">
                    <DrawerHeader className="flex-row items-start justify-between text-left">
                        <span>
                            <DrawerTitle className="text-lg font-semibold">Filter</DrawerTitle>
                            {description && <DrawerDescription>{description}</DrawerDescription>}
                        </span>

                        {/* Beside the results there's no swiping it away, and
                            the backdrop isn't an obvious target with a pointer. */}
                        <DrawerClose
                            aria-label="Close"
                            className="flex size-9 shrink-0 items-center justify-center rounded-full text-[#17233B]/65 transition hover:bg-[#17233B]/5 hover:text-[#17233B] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF593F]"
                        >
                            <FiX aria-hidden="true" className="size-5" />
                        </DrawerClose>
                    </DrawerHeader>

                    <div className="flex-1 overflow-y-auto p-4 pb-8">
                        <Choices sections={sections} onChoose={closeOnLink} />
                    </div>
                </div>
            </DrawerContent>
        </Drawer>
    );
}
