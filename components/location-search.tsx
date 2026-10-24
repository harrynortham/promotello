"use client";

import { useRouter } from "next/navigation";
import { useId, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { FiMapPin, FiX } from "react-icons/fi";

import type { Place } from "@/lib/cities";

type Suggestion = { label: string; detail: string; href: string };

type LocationSearchProps = {
    places: Place[];
    // Where a choice goes: e.g. "/offers" sends Bristol to /offers/bristol
    // and Clifton to /offers/bristol?area=Clifton.
    basePath: string;
    // The city currently shown, if any.
    current?: { name: string } | null;
    placeholder?: string;
    size?: "md" | "lg";
};

// A TripAdvisor-style "Where?" box: type a city or neighbourhood and pick a
// suggestion. Clearing it goes back to every location.
export function LocationSearch({ places, basePath, current = null, placeholder = "Where? Try Bristol or Clifton", size = "md" }: LocationSearchProps) {
    const router = useRouter();
    const listId = useId();
    const inputRef = useRef<HTMLInputElement>(null);
    const [query, setQuery] = useState("");
    const [open, setOpen] = useState(false);
    const [active, setActive] = useState(0);

    const suggestions = useMemo<Suggestion[]>(() => {
        const text = query.trim().toLowerCase();
        const all: Suggestion[] = places.flatMap((city) => [
            { label: city.name, detail: "City", href: `${basePath}/${city.slug}` },
            ...city.areas.map((area) => ({
                label: area,
                detail: city.name,
                href: `${basePath}/${city.slug}?area=${encodeURIComponent(area)}`,
            })),
        ]);

        const matches = text
            ? all.filter((item) => `${item.label} ${item.detail}`.toLowerCase().includes(text))
            : all.filter((item) => item.detail === "City");

        return [...(current ? [{ label: "All locations", detail: "Everywhere on Promotello", href: basePath }] : []), ...matches].slice(0, 8);
    }, [places, basePath, query, current]);

    function choose(suggestion: Suggestion | undefined) {
        if (!suggestion) return;
        setOpen(false);
        setQuery("");
        router.push(suggestion.href);
    }

    function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
        if (event.key === "ArrowDown") {
            event.preventDefault();
            setOpen(true);
            setActive((index) => Math.min(index + 1, suggestions.length - 1));
        } else if (event.key === "ArrowUp") {
            event.preventDefault();
            setActive((index) => Math.max(index - 1, 0));
        } else if (event.key === "Enter") {
            event.preventDefault();
            choose(suggestions[active]);
        } else if (event.key === "Escape") {
            setOpen(false);
        }
    }

    const tall = size === "lg";

    return (
        <div className="relative">
            <div
                className={`flex items-center gap-2 rounded-2xl border border-[#17233B]/10 bg-white px-4 shadow-sm focus-within:border-[#FF593F]/50 ${tall ? "h-16" : "h-11"}`}
            >
                <FiMapPin aria-hidden="true" className="shrink-0 text-[#FF593F]" />
                <input
                    ref={inputRef}
                    type="text"
                    role="combobox"
                    aria-label="Location"
                    aria-expanded={open}
                    aria-controls={listId}
                    aria-autocomplete="list"
                    aria-activedescendant={open && suggestions[active] ? `${listId}-${active}` : undefined}
                    value={query}
                    placeholder={current ? current.name : placeholder}
                    onChange={(event) => {
                        setQuery(event.target.value);
                        setActive(0);
                        setOpen(true);
                    }}
                    onFocus={() => setOpen(true)}
                    onBlur={() => setTimeout(() => setOpen(false), 120)}
                    onKeyDown={onKeyDown}
                    className={`min-w-0 flex-1 bg-transparent text-[#17233B] outline-none placeholder:text-[#17233B]/60 ${tall ? "text-base" : "text-sm"}`}
                />
                {current && (
                    <button
                        type="button"
                        aria-label="Show all locations"
                        onClick={() => router.push(basePath)}
                        className="shrink-0 rounded-full p-1 text-[#17233B]/50 hover:bg-[#17233B]/5 hover:text-[#17233B]"
                    >
                        <FiX aria-hidden="true" />
                    </button>
                )}
            </div>

            {open && suggestions.length > 0 && (
                <ul
                    id={listId}
                    role="listbox"
                    aria-label="Locations"
                    className="absolute inset-x-0 top-full z-30 mt-2 overflow-hidden rounded-2xl border border-[#17233B]/10 bg-white py-1 text-[#17233B] shadow-xl"
                >
                    {suggestions.map((suggestion, index) => (
                        <li
                            key={suggestion.href}
                            id={`${listId}-${index}`}
                            role="option"
                            aria-selected={index === active}
                            onMouseDown={(event) => {
                                event.preventDefault();
                                choose(suggestion);
                            }}
                            onMouseEnter={() => setActive(index)}
                            className={`flex cursor-pointer items-center gap-3 px-4 py-2.5 ${index === active ? "bg-[#FF593F]/10" : ""}`}
                        >
                            <FiMapPin aria-hidden="true" className="shrink-0 text-[#17233B]/40" />
                            <span className="min-w-0">
                                <span className="block truncate text-sm font-medium">{suggestion.label}</span>
                                <span className="block truncate text-xs text-[#17233B]/55">{suggestion.detail}</span>
                            </span>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
