"use client";

import { useState } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SHOP_ICON, categoryIcon } from "@/lib/cover-icons";

// The mark drawn behind a business name on a generated cover.
//
// Shown as it will be drawn, beside the box, because nobody can read
// SVG path data by eye — and a path with a typo in it does not error,
// it just draws something wrong. Typing one character and watching the
// cup lose its handle is the whole point.
export function CategoryIconField({
    idPrefix,
    savedIconPath,
}: {
    idPrefix: string;
    savedIconPath: string | null;
}) {
    const [path, setPath] = useState(savedIconPath ?? "");
    const drawn = categoryIcon(path);

    return (
        <div className="space-y-2">
            <Label htmlFor={`${idPrefix}-icon`}>Mark</Label>

            <div className="flex items-start gap-3">
                <div className="flex size-12 shrink-0 items-center justify-center rounded-lg border border-[#17233B]/15 bg-[#FFF8F0]">
                    <svg
                        viewBox="0 0 24 24"
                        className="size-7"
                        fill="none"
                        stroke="#17233B"
                        strokeWidth={1.5}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                    >
                        <path d={drawn} />
                    </svg>
                </div>

                <div className="min-w-0 flex-1 space-y-1">
                    <Input
                        id={`${idPrefix}-icon`}
                        name="iconPath"
                        value={path}
                        onChange={(event) => setPath(event.target.value)}
                        placeholder="SVG path on a 24×24 box"
                        className="font-mono text-xs"
                    />

                    <p className="text-xs leading-5 text-[#17233B]/60">
                        {path.trim()
                            ? "Drawn behind the business name on a generated cover."
                            : "Empty, so covers in this category get a shop front."}{" "}
                        Paste the{" "}
                        <code className="rounded bg-[#17233B]/5 px-1">d</code> of any{" "}
                        <a
                            href="https://lucide.dev/icons/"
                            target="_blank"
                            rel="noreferrer"
                            className="underline underline-offset-2"
                        >
                            lucide icon
                        </a>
                        , which is what the rest of the site draws with.
                    </p>
                </div>
            </div>
        </div>
    );
}

export { SHOP_ICON };
