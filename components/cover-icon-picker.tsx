"use client";

import { createElement, useEffect, useMemo, useState } from "react";

import { Input } from "@/components/ui/input";
import type { IconShapes } from "@/lib/cover-icon-shapes";

// Any of lucide's eighteen hundred, searched by name.
//
// Drawn from the same shapes the cover is drawn from, rather than from
// lucide-react's components — one source for both, so the icon in the
// grid is the icon on the image, and no chance of the picker offering
// something the cover cannot draw.
//
// Loaded when the picker is first opened, not with the page. It is four
// hundred kilobytes and this is one control on one admin page.
type Library = Record<string, IconShapes>;

// Shown before anybody types. Not a limit — the search reaches the
// whole library — but "Beer" and "Scissors" are the answer often
// enough that having them in front of you beats thinking of the word.
const SUGGESTED = [
    "Store", "Coffee", "Beer", "Wine", "UtensilsCrossed", "Pizza", "Croissant",
    "CakeSlice", "IceCream", "Sandwich", "Beef", "Fish", "Apple", "ShoppingBag",
    "Scissors", "Sparkles", "Flower2", "Dumbbell", "Bike", "Car", "Wrench",
    "Shirt", "Gem", "BookOpen", "Music", "Camera", "Palette", "Dog", "Baby",
    "HeartPulse", "Stethoscope", "Hotel", "Ticket", "Hammer", "Leaf",
];

const SHOWN = 72;

export function CoverIconPicker({
    value,
    disabled,
    onChange,
}: {
    value: string;
    disabled?: boolean;
    onChange: (icon: string) => void;
}) {
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState("");
    const [library, setLibrary] = useState<Library | null>(null);

    useEffect(() => {
        if (!isOpen || library) return;

        let live = true;

        void import("@/lib/cover-icon-shapes").then((module) => {
            if (live) setLibrary(module.default);
        });

        return () => {
            live = false;
        };
    }, [isOpen, library]);

    const results = useMemo(() => {
        if (!library) return [];

        const wanted = query.trim().toLowerCase().replace(/[^a-z0-9]/g, "");

        if (!wanted) return SUGGESTED.filter((name) => name in library);

        // Starts-with first: typing "bea" should offer Beaker before
        // Headphones, which also contains the letters.
        const names = Object.keys(library);
        const hay = (name: string) => name.toLowerCase();

        return [
            ...names.filter((name) => hay(name).startsWith(wanted)),
            ...names.filter((name) => !hay(name).startsWith(wanted) && hay(name).includes(wanted)),
        ].slice(0, SHOWN);
    }, [library, query]);

    const chosen = library?.[value];

    return (
        <div className="space-y-2">
            <button
                type="button"
                disabled={disabled}
                onClick={() => setIsOpen((open) => !open)}
                className="flex items-center gap-2 rounded-lg border border-[#17233B]/15 bg-white px-3 py-2 text-xs text-[#17233B] transition hover:border-[#17233B]/30 disabled:opacity-50"
            >
                {chosen ? <Mark shapes={chosen} /> : <span className="size-5" />}
                <span>{spaced(value)}</span>
                <span aria-hidden="true" className="text-[#17233B]/40">
                    {isOpen ? "▴" : "▾"}
                </span>
            </button>

            {isOpen && (
                <div className="space-y-2 rounded-xl border border-[#17233B]/10 bg-[#FFF8F0] p-3">
                    <Input
                        autoFocus
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        placeholder="Search — beer, barber, bakery…"
                        className="h-10 bg-white text-sm"
                    />

                    {!library ? (
                        <p className="py-6 text-center text-xs text-[#17233B]/55">Loading the icons…</p>
                    ) : results.length === 0 ? (
                        <p className="py-6 text-center text-xs text-[#17233B]/55">
                            Nothing called that. Try the thing itself — a pint, a comb, a spanner.
                        </p>
                    ) : (
                        <div className="grid max-h-60 grid-cols-[repeat(auto-fill,minmax(4.25rem,1fr))] gap-1 overflow-y-auto">
                            {results.map((name) => {
                                const shapes = library[name];

                                return (
                                    <button
                                        key={name}
                                        type="button"
                                        title={spaced(name)}
                                        disabled={disabled}
                                        onClick={() => {
                                            onChange(name);
                                            setIsOpen(false);
                                        }}
                                        className={`flex flex-col items-center gap-1 rounded-lg px-1 py-2 transition disabled:opacity-50 ${
                                            name === value ? "bg-[#FF593F]/10" : "hover:bg-white"
                                        }`}
                                    >
                                        <Mark shapes={shapes} />
                                        <span className="w-full truncate text-[0.625rem] leading-3 text-[#17233B]/60">
                                            {spaced(name)}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

function Mark({ shapes }: { shapes: IconShapes }) {
    return (
        <svg
            viewBox="0 0 24 24"
            className="size-5 shrink-0 text-[#17233B]"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
        >
            {shapes.map(([tag, attributes], index) =>
                createElement(tag, { key: index, ...attributes }),
            )}
        </svg>
    );
}

// "UtensilsCrossed" is a key, not a label.
function spaced(name: string) {
    return name.replace(/([a-z0-9])([A-Z])/g, "$1 $2").replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2");
}
