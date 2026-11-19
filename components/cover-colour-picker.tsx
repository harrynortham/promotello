"use client";

import { useEffect, useRef, useState } from "react";

import { Input } from "@/components/ui/input";

// What colour the cover is.
//
// The automatic answer is the most common colour in the logo, which is
// right often enough to be the default and wrong often enough to need
// this. A logo on a white card averages to white; one with a red
// roundel on black can land on either; and a photographic logo lands
// anywhere. The admin is looking at the thing — so: the colours
// actually in it, an eyedropper over it, a hex box, and the wheel.
export function CoverColourPicker({
    logo,
    auto,
    autoSource,
    value,
    disabled,
    onChange,
}: {
    logo: File | null;
    // What the drawing picked on its own, and where from — "from the
    // logo" over a colour that came from the trade is a small lie that
    // sends somebody looking at the logo for a brown that is not in it.
    auto: string | null;
    autoSource: string | null;
    // The chosen colour, or null while the automatic one is in use.
    value: string | null;
    disabled?: boolean;
    onChange: (colour: string | null) => void;
}) {
    const [isOpen, setIsOpen] = useState(false);
    const [swatches, setSwatches] = useState<string[]>([]);
    const [logoUrl, setLogoUrl] = useState<string | null>(null);
    const [typed, setTyped] = useState("");

    const canvas = useRef<HTMLCanvasElement | null>(null);

    // The logo's own colours, read off the pixels.
    useEffect(() => {
        if (!logo) {
            setSwatches([]);
            setLogoUrl(null);
            return;
        }

        const url = URL.createObjectURL(logo);
        setLogoUrl(url);

        const image = new Image();

        image.onload = () => {
            const board = document.createElement("canvas");
            // Small on purpose: this is a palette, not a photograph, and
            // 96 squared is four hundred times less work than the full
            // logo for an answer that rounds to the same colours.
            const size = 96;
            board.width = size;
            board.height = size;

            const context = board.getContext("2d", { willReadFrequently: true });
            if (!context) return;

            context.drawImage(image, 0, 0, size, size);
            canvas.current = board;
            setSwatches(paletteOf(context.getImageData(0, 0, size, size).data));
        };

        image.src = url;

        return () => URL.revokeObjectURL(url);
    }, [logo]);

    function choose(colour: string) {
        onChange(colour.toUpperCase());
        setIsOpen(false);
    }

    // The pixel under the pointer, from the copy already drawn.
    function sample(event: React.MouseEvent<HTMLImageElement>) {
        const board = canvas.current;
        if (!board) return;

        const box = event.currentTarget.getBoundingClientRect();
        const x = Math.floor(((event.clientX - box.left) / box.width) * board.width);
        const y = Math.floor(((event.clientY - box.top) / box.height) * board.height);

        const pixel = board.getContext("2d")?.getImageData(x, y, 1, 1).data;
        if (!pixel) return;

        choose(hexOf(pixel[0], pixel[1], pixel[2]));
    }

    const showing = value ?? auto ?? "#17233B";

    return (
        <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
                <button
                    type="button"
                    disabled={disabled}
                    onClick={() => setIsOpen((open) => !open)}
                    className="flex items-center gap-2 rounded-lg border border-[#17233B]/15 bg-white px-3 py-2 text-xs text-[#17233B] transition hover:border-[#17233B]/30 disabled:opacity-50"
                >
                    <span
                        aria-hidden="true"
                        className="size-5 shrink-0 rounded border border-[#17233B]/15"
                        style={{ background: showing }}
                    />
                    <span className="font-mono">{showing}</span>
                    <span className="text-[#17233B]/55">{value ? "picked" : whereFrom(autoSource)}</span>
                    <span aria-hidden="true" className="text-[#17233B]/40">
                        {isOpen ? "▴" : "▾"}
                    </span>
                </button>

                {value && (
                    <button
                        type="button"
                        disabled={disabled}
                        onClick={() => onChange(null)}
                        className="text-xs text-[#17233B]/60 underline underline-offset-4 disabled:opacity-50"
                    >
                        Back to {whereFrom(autoSource)}
                    </button>
                )}
            </div>

            {isOpen && (
                <div className="space-y-3 rounded-xl border border-[#17233B]/10 bg-[#FFF8F0] p-3">
                    {swatches.length > 0 && (
                        <div className="space-y-1.5">
                            <p className="text-xs text-[#17233B]/60">In the logo</p>
                            <div className="flex flex-wrap gap-1.5">
                                {swatches.map((colour) => (
                                    <button
                                        key={colour}
                                        type="button"
                                        title={colour}
                                        disabled={disabled}
                                        onClick={() => choose(colour)}
                                        className={`size-8 rounded-lg border transition disabled:opacity-50 ${
                                            showing.toUpperCase() === colour
                                                ? "border-[#FF593F] ring-2 ring-[#FF593F]/30"
                                                : "border-[#17233B]/15 hover:scale-105"
                                        }`}
                                        style={{ background: colour }}
                                    />
                                ))}
                            </div>
                        </div>
                    )}

                    {logoUrl && (
                        <div className="space-y-1.5">
                            <p className="text-xs text-[#17233B]/60">Or click anywhere on the logo</p>
                            {/* eslint-disable-next-line @next/next/no-img-element -- a blob
                                that exists only in this tab; nothing for the optimiser to fetch. */}
                            <img
                                src={logoUrl}
                                alt="The logo, to pick a colour from"
                                onClick={sample}
                                className="size-24 cursor-crosshair rounded-lg border border-[#17233B]/15 bg-white object-contain"
                            />
                        </div>
                    )}

                    <div className="space-y-1.5">
                        <p className="text-xs text-[#17233B]/60">
                            {logo ? "Or type one, or open the wheel" : "Type one, or open the wheel"}
                        </p>
                        <div className="flex items-center gap-2">
                            <Input
                                value={typed}
                                onChange={(event) => {
                                    const next = event.target.value;
                                    setTyped(next);

                                    const hex = next.startsWith("#") ? next : `#${next}`;
                                    if (/^#[0-9a-f]{6}$/i.test(hex)) onChange(hex.toUpperCase());
                                }}
                                placeholder={showing}
                                maxLength={7}
                                className="h-10 bg-white font-mono text-sm"
                            />

                            <input
                                type="color"
                                value={showing}
                                disabled={disabled}
                                onChange={(event) => onChange(event.target.value.toUpperCase())}
                                aria-label="Colour wheel"
                                className="h-10 w-12 shrink-0 cursor-pointer rounded-lg border border-[#17233B]/15 bg-white p-1"
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// A logo that is a mark on a white card averages to white, which is
// thrown away, and the trade's colour is used instead. Saying so is the
// difference between "that is wrong" and "ah, it could not tell".
function whereFrom(source: string | null) {
    if (source === "logo") return "the logo's";
    if (source === "category") return "the trade's";

    return "the default";
}

function hexOf(r: number, g: number, b: number) {
    return `#${[r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("")}`.toUpperCase();
}

// The colours actually in the logo, most-used first.
//
// Counted in coarse buckets rather than exactly, so a gradient and a
// flat fill of roughly the same colour come out as one swatch instead
// of thirty near-identical ones. Transparent and near-transparent
// pixels are skipped: a PNG logo is mostly nothing, and counting it
// would make "nothing" the most common colour.
function paletteOf(pixels: Uint8ClampedArray) {
    const counts = new Map<string, { n: number; r: number; g: number; b: number }>();

    for (let at = 0; at < pixels.length; at += 4) {
        if (pixels[at + 3] < 200) continue;

        const [r, g, b] = [pixels[at], pixels[at + 1], pixels[at + 2]];
        const bucket = `${r >> 5}:${g >> 5}:${b >> 5}`;
        const seen = counts.get(bucket);

        if (seen) {
            seen.n += 1;
            seen.r += r;
            seen.g += g;
            seen.b += b;
        } else {
            counts.set(bucket, { n: 1, r, g, b });
        }
    }

    return [...counts.values()]
        .sort((a, b) => b.n - a.n)
        .slice(0, 8)
        // The bucket's average rather than its corner, so the swatch is
        // a colour that is really in there.
        .map(({ n, r, g, b }) => hexOf(Math.round(r / n), Math.round(g / n), Math.round(b / n)));
}
