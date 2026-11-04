"use client";

import { usePathname, useRouter } from "next/navigation";
import { useId, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { createPortal } from "react-dom";
import { FiMapPin, FiNavigation, FiX } from "react-icons/fi";

import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ALL_LOCATIONS, rememberCity } from "@/lib/city-cookie";
import type { Place } from "@/lib/cities";
import { nearestCity } from "@/lib/geo";
import { useMediaQuery } from "@/lib/use-media-query";

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

// Everything both layouts need: what to offer, and what happens when one is
// picked. Only where the choices appear differs between them.
function usePicker({
    places,
    basePath,
    current,
    citiesOnly,
    browse = false,
}: {
    places: Place[];
    basePath: string;
    current: { name: string } | null;
    citiesOnly: boolean;
    // List the neighbourhoods as well as the cities when nothing is typed.
    // On a desktop that would be an unwieldy dropdown; in a sheet it is just
    // a list, and it means nobody has to summon a keyboard to get anywhere.
    browse?: boolean;
}) {
    const router = useRouter();
    const pathname = usePathname();
    const [query, setQuery] = useState("");
    // The highlight is for arrow keys. A sheet has none, and pre-selecting a
    // row there just looks like something was already chosen, so it starts
    // with nothing marked.
    const [active, setActive] = useState(browse ? -1 : 0);
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
            : browse
                ? all
                : all.filter((item) => item.detail === "City");

        const extras: Suggestion[] = text
            ? []
            : [
                { label: "Use my location", detail: "Find the nearest city", href: "", locate: true },
                ...(current ? [{ label: "All locations", detail: "Everywhere on Promotello", href: basePath, remember: ALL_LOCATIONS }] : []),
            ];

        // A dropdown has to stay short enough to hang off a field; a sheet
        // scrolls, so it can show the lot.
        return browse ? [...extras, ...matches] : [...extras, ...matches].slice(0, 9);
    }, [places, basePath, query, current, citiesOnly, browse]);

    function go(suggestion: Suggestion) {
        setQuery("");
        setMessage("");

        if (suggestion.remember) {
            rememberCity(suggestion.remember);
        }

        router.push(suggestion.href);

        // Only when it isn't really a navigation. Choosing "All locations"
        // while already on /businesses goes nowhere, so nothing would
        // re-render — but the city has just been written to the cookie and
        // the server reads it. Refreshing alongside a real push instead
        // re-renders the page being left, and both trees end up on screen.
        if (suggestion.href === `${pathname}${window.location.search}`) {
            router.refresh();
        }
    }

    // Asks the browser for the visitor's position (they can say no) and
    // goes to the nearest live city. The position isn't stored or sent.
    function locateVisitor(close: () => void) {
        close();

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

                go({ label: city.name, detail: "City", href: `${basePath}/${city.slug}`, remember: city.slug });
            },
            () => setMessage("We couldn't get your location. Type a place instead."),
            { timeout: 10_000, maximumAge: 600_000 },
        );
    }

    function choose(suggestion: Suggestion | undefined, close: () => void) {
        if (!suggestion) return;

        if (suggestion.locate) {
            locateVisitor(close);
            return;
        }

        close();
        go(suggestion);
    }

    return { query, setQuery, active, setActive, message, suggestions, choose };
}

function Suggestions({
    listId,
    suggestions,
    active,
    setActive,
    onChoose,
    big = false,
}: {
    listId: string;
    suggestions: Suggestion[];
    active: number;
    setActive: (index: number) => void;
    onChoose: (suggestion: Suggestion) => void;
    big?: boolean;
}) {
    return suggestions.map((suggestion, index) => (
        <li
            key={`${suggestion.label}-${suggestion.href}`}
            id={`${listId}-${index}`}
            role="option"
            aria-selected={index === active}
            onMouseDown={(event) => {
                event.preventDefault();
                onChoose(suggestion);
            }}
            onMouseEnter={() => setActive(index)}
            className={`flex cursor-pointer items-center gap-3 px-4 ${big ? "min-h-14 py-3" : "py-2.5"} ${index === active ? "bg-[#FF593F]/10" : ""}`}
        >
            {suggestion.locate ? (
                <FiNavigation aria-hidden="true" className="shrink-0 text-[#FF593F]" />
            ) : (
                <FiMapPin aria-hidden="true" className="shrink-0 text-[#17233B]/65" />
            )}
            <span className="min-w-0">
                <span className={`block truncate font-medium ${big ? "text-base" : "text-sm"}`}>{suggestion.label}</span>
                <span className="block truncate text-xs text-[#17233B]/70">{suggestion.detail}</span>
            </span>
        </li>
    ));
}

function fieldClasses(tall: boolean) {
    return `flex items-center gap-2 rounded-2xl border border-[#17233B]/10 bg-white px-4 shadow-sm ${tall ? "h-16" : "h-11"}`;
}

function ClearButton({ onClear }: { onClear: () => void }) {
    return (
        <button
            type="button"
            aria-label="Show all locations"
            onClick={onClear}
            className="shrink-0 rounded-full p-1 text-[#17233B]/65 hover:bg-[#17233B]/5 hover:text-[#17233B]"
        >
            <FiX aria-hidden="true" />
        </button>
    );
}

// A TripAdvisor-style "Where?" box: type a city or neighbourhood and pick a
// suggestion. Clearing it goes back to every location.
//
// On a desktop the choices hang off the field. On a phone they don't: a
// panel pinned to the viewport has to be re-measured on every scroll and
// resize, and the soft keyboard, the address bar and scroll-into-view all
// move the field out from under it — so the list changed height as you
// scrolled and flipped sides as the keyboard opened.
//
// They open in a dialog instead, pinned near the top of the screen. iOS
// keeps position:fixed against the layout viewport, so a keyboard draws
// over the bottom of the screen rather than pushing anything up: anchored
// low, a panel vanishes under it; centred, it sits lower than it looks and
// can still be caught. Near the top it is clear of it whatever happens.
export function LocationSearch(props: LocationSearchProps) {
    const beside = useMediaQuery("(min-width: 1024px)");

    return beside ? <AnchoredPicker {...props} /> : <ModalPicker {...props} />;
}

function AnchoredPicker({ places, basePath, current = null, placeholder, size = "md", citiesOnly = false }: LocationSearchProps) {
    const listId = useId();
    const fieldRef = useRef<HTMLDivElement>(null);
    const [anchor, setAnchor] = useState<Anchor | null>(null);
    const [open, setOpen] = useState(false);
    const { query, setQuery, active, setActive, message, suggestions, choose } = usePicker({ places, basePath, current, citiesOnly });

    // The list is drawn at the end of the document rather than next to the
    // field, so an ancestor with overflow:hidden can't cut it off — the hero
    // sections on the home and explore pages both clip their contents.
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
    const close = () => setOpen(false);

    function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
        if (event.key === "ArrowDown") {
            event.preventDefault();
            setOpen(true);
            setActive(Math.min(active + 1, suggestions.length - 1));
        } else if (event.key === "ArrowUp") {
            event.preventDefault();
            setActive(Math.max(active - 1, 0));
        } else if (event.key === "Enter") {
            event.preventDefault();
            choose(suggestions[active], close);
        } else if (event.key === "Escape") {
            setOpen(false);
        }
    }

    return (
        <div className="relative">
            <div ref={fieldRef} className={`${fieldClasses(tall)} focus-within:border-[#FF593F]/50`}>
                <FiMapPin aria-hidden="true" className="shrink-0 text-[#FF593F]" />
                <input
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
                {current && <ClearButton onClear={() => choose({ label: "All locations", detail: "", href: basePath, remember: ALL_LOCATIONS }, close)} />}
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
                    <Suggestions
                        listId={listId}
                        suggestions={suggestions}
                        active={active}
                        setActive={setActive}
                        onChoose={(suggestion) => choose(suggestion, close)}
                    />
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

function ModalPicker({ places, basePath, current = null, placeholder, size = "md", citiesOnly = false }: LocationSearchProps) {
    const listId = useId();
    const panelRef = useRef<HTMLDivElement>(null);
    const [open, setOpen] = useState(false);
    const { query, setQuery, active, setActive, message, suggestions, choose } = usePicker({ places, basePath, current, citiesOnly, browse: true });

    const tall = size === "lg";
    const close = () => setOpen(false);

    return (
        <div>
            <div className={fieldClasses(tall)}>
                <FiMapPin aria-hidden="true" className="shrink-0 text-[#FF593F]" />

                <Dialog open={open} onOpenChange={setOpen}>
                    <DialogTrigger
                        aria-label="Location"
                        className={`min-w-0 flex-1 cursor-pointer truncate bg-transparent text-left outline-none focus-visible:underline ${tall ? "text-base" : "text-sm"} ${current ? "text-[#17233B]" : "text-[#17233B]/70"}`}
                    >
                        {current ? current.name : (placeholder ?? examplePlaceholder(places))}
                    </DialogTrigger>

                    {/* Pinned near the top rather than centred, so a keyboard
                        can never reach it, and tall enough to browse. */}
                    {/* initialFocus keeps the dialog from focusing the search
                        box, which would summon a keyboard nobody asked for.
                        Most people are here to tap a name off the list. */}
                    <DialogContent
                        initialFocus={panelRef}
                        className="top-3 flex max-h-[82dvh] -translate-y-0 flex-col gap-0 p-0 sm:max-w-md"
                    >
                        <div ref={panelRef} tabIndex={-1} className="flex min-h-0 flex-col p-4 outline-none">
                            <DialogTitle className="text-lg font-semibold">Where?</DialogTitle>

                            <div className="mt-3 flex h-12 shrink-0 items-center gap-2 rounded-2xl border border-[#17233B]/10 bg-white px-4 focus-within:border-[#FF593F]/50">
                                <FiMapPin aria-hidden="true" className="shrink-0 text-[#FF593F]" />
                                <input
                                    type="text"
                                    role="combobox"
                                    aria-label="Search locations"
                                    aria-expanded
                                    aria-controls={listId}
                                    aria-autocomplete="list"
                                    value={query}
                                    placeholder="City or neighbourhood"
                                    onChange={(event) => {
                                        setQuery(event.target.value);
                                        setActive(0);
                                    }}
                                    className="min-w-0 flex-1 bg-transparent text-base text-[#17233B] outline-none placeholder:text-[#17233B]/70"
                                />
                            </div>

                            {suggestions.length > 0 ? (
                                <ul
                                    id={listId}
                                    role="listbox"
                                    aria-label="Locations"
                                    className="mt-2 min-h-0 flex-1 overflow-y-auto overscroll-contain text-[#17233B]"
                                >
                                    <Suggestions
                                        listId={listId}
                                        suggestions={suggestions}
                                        active={active}
                                        setActive={setActive}
                                        onChoose={(suggestion) => choose(suggestion, close)}
                                        big
                                    />
                                </ul>
                            ) : (
                                <p className="px-4 py-8 text-center text-sm text-[#17233B]/70">
                                    Nowhere by that name.
                                </p>
                            )}
                        </div>
                    </DialogContent>
                </Dialog>

                {current && <ClearButton onClear={() => choose({ label: "All locations", detail: "", href: basePath, remember: ALL_LOCATIONS }, close)} />}
            </div>

            {message && (
                <p role="status" className="mt-2 text-xs text-[#17233B]/70">
                    {message}
                </p>
            )}
        </div>
    );
}
