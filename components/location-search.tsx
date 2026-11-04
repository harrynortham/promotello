"use client";

import { useRouter } from "next/navigation";
import { useId, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { createPortal } from "react-dom";
import { FiMapPin, FiNavigation, FiX } from "react-icons/fi";

import { ALL_LOCATIONS, rememberCity } from "@/lib/city-cookie";
import type { Place } from "@/lib/cities";
import { nearestCity } from "@/lib/geo";

// Where to draw the suggestion list: pinned to the field's left edge and
// width, below it when there's room and above it when there isn't.
type Anchor = {
    left: number;
    width: number;
    top?: number;
    bottom?: number;
    maxHeight: number;
};

// Matches the gap the list used to get from mt-2.
const GAP = 8;
// Less room than this below the field and it's worth opening upwards.
const ROOM_FOR_A_FEW = 180;

function anchorFor(field: HTMLElement | null): Anchor | null {
    if (!field) return null;

    const rect = field.getBoundingClientRect();
    const below = window.innerHeight - rect.bottom - GAP;
    const above = rect.top - GAP;
    const upwards = below < ROOM_FOR_A_FEW && above > below;
    const room = upwards ? above : below;

    return {
        left: rect.left,
        width: rect.width,
        ...(upwards ? { bottom: window.innerHeight - rect.top + GAP } : { top: rect.bottom + GAP }),
        // Never taller than the space it has, and never so short it can only
        // show half a suggestion; it scrolls if it has to.
        maxHeight: Math.min(Math.max(room, 120), window.innerHeight - GAP * 2),
    };
}

// `remember` is what the visitor chose ("all" or a city slug); `locate`
// marks the "Use my location" option.
type Suggestion = { label: string; detail: string; href: string; remember?: string; locate?: boolean };

// Cities only: every live city has pages behind it, while an area might be
// one nobody has joined from yet.
function examplePlaceholder(places: Place[]) {
    const names = places.slice(0, 2).map((place) => place.name);

    if (names.length === 0) return "Where?";

    return `Where? Try ${names.join(" or ")}`;
}

type LocationSearchProps = {
    places: Place[];
    // Where a choice goes: e.g. "/offers" sends Bristol to /offers/bristol
    // and Clifton to /offers/bristol?area=Clifton (or, from /explore, to
    // /explore/bristol/clifton).
    basePath: string;
    // The city currently shown, if any.
    current?: { name: string } | null;
    placeholder?: string;
    size?: "md" | "lg";
    // For pages that can show a city but not an area, like a category page.
    // Offering neighbourhoods there would silently drop the choice.
    citiesOnly?: boolean;
};

// A TripAdvisor-style "Where?" box: type a city or neighbourhood and pick a
// suggestion. Clearing it goes back to every location.
export function LocationSearch({ places, basePath, current = null, placeholder, size = "md", citiesOnly = false }: LocationSearchProps) {
    const router = useRouter();
    const listId = useId();
    const inputRef = useRef<HTMLInputElement>(null);
    const fieldRef = useRef<HTMLDivElement>(null);
    const [anchor, setAnchor] = useState<Anchor | null>(null);
    const [query, setQuery] = useState("");
    const [open, setOpen] = useState(false);
    const [active, setActive] = useState(0);
    const [message, setMessage] = useState("");

    const suggestions = useMemo<Suggestion[]>(() => {
        const text = query.trim().toLowerCase();
        const all: Suggestion[] = places.flatMap((city) => [
            { label: city.name, detail: "City", href: `${basePath}/${city.slug}`, remember: city.slug },
            ...(citiesOnly ? [] : city.areas).map((area) => ({
                label: area,
                detail: city.name,
                // Areas have their own explore pages; elsewhere they're a filter.
                href:
                    basePath === "/explore" && city.areaSlugs?.[area]
                        ? `/explore/${city.slug}/${city.areaSlugs[area]}`
                        : `${basePath}/${city.slug}?area=${encodeURIComponent(area)}`,
                remember: city.slug,
            })),
        ]);

        const matches = text
            ? all.filter((item) => `${item.label} ${item.detail}`.toLowerCase().includes(text))
            : all.filter((item) => item.detail === "City");

        const extras: Suggestion[] = text
            ? []
            : [
                { label: "Use my location", detail: "Find the nearest city", href: "", locate: true },
                ...(current ? [{ label: "All locations", detail: "Everywhere on Promotello", href: basePath, remember: ALL_LOCATIONS }] : []),
            ];

        return [...extras, ...matches].slice(0, 9);
    }, [places, basePath, query, current, citiesOnly]);

    function choose(suggestion: Suggestion | undefined) {
        if (!suggestion) return;

        if (suggestion.locate) {
            locateVisitor();
            return;
        }

        setOpen(false);
        setQuery("");
        setMessage("");

        if (suggestion.remember) {
            rememberCity(suggestion.remember);
        }

        router.push(suggestion.href);
        router.refresh();
    }

    // Asks the browser for the visitor's position (they can say no) and
    // goes to the nearest live city. The position isn't stored or sent.
    function locateVisitor() {
        setOpen(false);

        if (!("geolocation" in navigator)) {
            setMessage("Your browser can't share your location. Type a place instead.");
            return;
        }

        setMessage("Finding you…");
        navigator.geolocation.getCurrentPosition(
            ({ coords }) => {
                const city = nearestCity(places, coords.latitude, coords.longitude);

                if (!city) {
                    setMessage("Promotello isn't in your area yet. Pick a city to look around.");
                    return;
                }

                choose({ label: city.name, detail: "City", href: `${basePath}/${city.slug}`, remember: city.slug });
            },
            () => setMessage("We couldn't get your location. Type a place instead."),
            { timeout: 10_000, maximumAge: 600_000 },
        );
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

    // The list is drawn at the end of the document rather than next to the
    // field, so an ancestor with overflow:hidden can't cut it off — the hero
    // sections on the home and explore pages both clip their contents.
    // Being out of the flow, it has to be positioned by hand, and follow the
    // field as the page scrolls or the window changes size.
    // Runs again when the number of suggestions changes, because that is
    // what decides whether there is room to open downwards.
    useLayoutEffect(() => {
        if (!open) return;

        const place = () => setAnchor(anchorFor(fieldRef.current));

        place();
        // `true` catches scrolling inside any container, not just the window.
        window.addEventListener("scroll", place, true);
        window.addEventListener("resize", place);

        return () => {
            window.removeEventListener("scroll", place, true);
            window.removeEventListener("resize", place);
        };
    }, [open, suggestions.length]);

    const tall = size === "lg";

    return (
        <div className="relative">
            <div
                ref={fieldRef}
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
                    placeholder={current ? current.name : (placeholder ?? examplePlaceholder(places))}
                    onChange={(event) => {
                        setQuery(event.target.value);
                        setActive(0);
                        setOpen(true);
                    }}
                    onFocus={() => setOpen(true)}
                    onBlur={() => setTimeout(() => setOpen(false), 120)}
                    onKeyDown={onKeyDown}
                    className={`min-w-0 flex-1 bg-transparent text-[#17233B] outline-none placeholder:text-[#17233B]/70 ${tall ? "text-base" : "text-sm"}`}
                />
                {current && (
                    <button
                        type="button"
                        aria-label="Show all locations"
                        onClick={() => choose({ label: "All locations", detail: "", href: basePath, remember: ALL_LOCATIONS })}
                        className="shrink-0 rounded-full p-1 text-[#17233B]/65 hover:bg-[#17233B]/5 hover:text-[#17233B]"
                    >
                        <FiX aria-hidden="true" />
                    </button>
                )}
            </div>

            {open && suggestions.length > 0 && anchor && createPortal(
                <ul
                    id={listId}
                    role="listbox"
                    aria-label="Locations"
                    style={{
                        position: "fixed",
                        left: anchor.left,
                        width: anchor.width,
                        top: anchor.top,
                        bottom: anchor.bottom,
                        maxHeight: anchor.maxHeight,
                    }}
                    className="z-50 overflow-y-auto overscroll-contain rounded-2xl border border-[#17233B]/10 bg-white py-1 text-[#17233B] shadow-xl"
                >
                    {suggestions.map((suggestion, index) => (
                        <li
                            key={`${suggestion.label}-${suggestion.href}`}
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
                            {suggestion.locate ? (
                                <FiNavigation aria-hidden="true" className="shrink-0 text-[#FF593F]" />
                            ) : (
                                <FiMapPin aria-hidden="true" className="shrink-0 text-[#17233B]/65" />
                            )}
                            <span className="min-w-0">
                                <span className="block truncate text-sm font-medium">{suggestion.label}</span>
                                <span className="block truncate text-xs text-[#17233B]/70">{suggestion.detail}</span>
                            </span>
                        </li>
                    ))}
                </ul>,
                document.body,
            )}

            {message && (
                <p role="status" className="mt-2 text-xs text-[#17233B]/70">
                    {message}
                </p>
            )}
        </div>
    );
}
