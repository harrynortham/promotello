"use client";

import { useMemo, useState } from "react";

import { Input } from "@/components/ui/input";

// Which trades to ask Google about for this area.
//
// Nothing is ticked to start with, and a sweep with nothing ticked is
// refused rather than taken to mean everything. All 183 is around five
// hundred billed searches — a tenth of the monthly allowance — and it
// is not a thing to arrive at by pressing a button twice.
//
// Ours and Google's are shown apart because they mean different
// things: ours put a lead straight into a category, Google's leave it
// without one for somebody to pick later.
export function TradePicker({
    ours,
    others,
}: {
    // searches: one of ours is several of Google's words, so ticking
    // it is several billed searches rather than one.
    ours: { id: string; name: string; searches: number }[];
    others: string[];
}) {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState("");
    const [picked, setPicked] = useState<Set<string>>(new Set());

    const everything = useMemo(
        () => [
            ...ours.map((category) => ({
                key: `ours:${category.id}`,
                name: category.name,
                mine: true,
                searches: category.searches,
            })),
            ...others.map((trade) => ({ key: `trade:${trade}`, name: trade, mine: false, searches: 1 })),
        ],
        [ours, others],
    );

    const showing = useMemo(() => {
        const wanted = query.trim().toLowerCase();

        return wanted ? everything.filter((trade) => trade.name.toLowerCase().includes(wanted)) : everything;
    }, [everything, query]);

    function toggle(key: string) {
        const next = new Set(picked);

        if (next.has(key)) next.delete(key);
        else next.add(key);

        setPicked(next);
    }

    const chosen = picked;

    return (
        <div className="space-y-2">
            {/* Submitted whatever is open: a hidden field a trade, so
                the action reads a plain list and does not have to know
                this control exists. */}
            {[...chosen].map((key) => (
                <input key={key} type="hidden" name="trade" value={key} />
            ))}

            <div className="flex flex-wrap items-center gap-2">
                <button
                    type="button"
                    onClick={() => setOpen((was) => !was)}
                    className="flex items-center gap-2 rounded-lg border border-[#17233B]/15 bg-white px-3 py-2 text-xs text-[#17233B] transition hover:border-[#17233B]/30"
                >
                    <span>
                        {chosen.size === 0
                            ? `Pick the trades to sweep · ${everything.length} to choose from`
                            : `${chosen.size} of ${everything.length} trades`}
                    </span>
                    <span aria-hidden="true" className="text-[#17233B]/40">
                        {open ? "▴" : "▾"}
                    </span>
                </button>

                {chosen.size > 0 && (
                    <button
                        type="button"
                        onClick={() => setPicked(new Set())}
                        className="text-xs text-[#17233B]/60 underline underline-offset-4"
                    >
                        Clear
                    </button>
                )}
            </div>

            {open && (
                <div className="space-y-2 rounded-xl border border-[#17233B]/10 bg-[#FFF8F0] p-3">
                    <div className="flex flex-wrap items-center gap-2">
                        <Input
                            value={query}
                            onChange={(event) => setQuery(event.target.value)}
                            placeholder="Search trades — barber, bakery, solicitor…"
                            className="h-10 flex-1 bg-white text-sm"
                        />

                        {/* Adds to what is ticked rather than
                            replacing it, so three searches can build
                            up one list. */}
                        <button
                            type="button"
                            onClick={() =>
                                setPicked(new Set([...picked, ...showing.map((trade) => trade.key)]))
                            }
                            className="text-xs font-medium text-[#FF593F] underline underline-offset-2"
                        >
                            Add these {showing.length}
                        </button>
                    </div>

                    <p className="text-xs text-[#17233B]/55">
                        {showing.length} shown, {chosen.size} ticked —{" "}
                        {everything
                            .filter((trade) => chosen.has(trade.key))
                            .reduce((total, trade) => total + trade.searches, 0)}{" "}
                        searches before paging, so up to three times that billed. One of
                        ours asks several of Google&apos;s words, because its own name is a
                        poor thing to search for.
                    </p>

                    <div className="grid max-h-64 grid-cols-[repeat(auto-fill,minmax(11rem,1fr))] gap-x-3 gap-y-1 overflow-y-auto">
                        {showing.map((trade) => (
                            <label
                                key={trade.key}
                                className="flex cursor-pointer items-center gap-2 rounded px-1 py-1 text-xs transition hover:bg-white"
                            >
                                <input
                                    type="checkbox"
                                    checked={chosen.has(trade.key)}
                                    onChange={() => toggle(trade.key)}
                                    className="size-3.5 shrink-0 accent-[#FF593F]"
                                />
                                <span className="min-w-0 flex-1 truncate">{trade.name}</span>
                                {/* Ours put the lead straight into a
                                    category; Google's leave it without
                                    one. */}
                                {trade.mine && (
                                    <span className="shrink-0 text-[10px] text-[#FF593F]">
                                        ours · {trade.searches}
                                    </span>
                                )}
                            </label>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
