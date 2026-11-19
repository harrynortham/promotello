"use client";

import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";

// A cover built from the business's own colours rather than a photo.
//
// Most of these businesses have no photo worth using and no time to
// send one, and a preview page with a grey box at the top of it is a
// worse advert than one with their name on their own colour. So: press
// it, look at it, press it again until it is right.
//
// The preview is the real thing at full size, not an approximation of
// it — the same route draws what gets saved, so what is on screen is
// what the business will see.
export function GeneratedCoverField({
    name,
    categoryId,
    logo,
    disabled,
    onChange,
}: {
    name: string;
    categoryId: string;
    logo: File | null;
    disabled?: boolean;
    // The cover as a file, ready to upload the same way a photo is, or
    // null when there isn't one.
    onChange: (file: File | null) => void;
}) {
    const [variation, setVariation] = useState(0);
    const [url, setUrl] = useState<string | null>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [problem, setProblem] = useState("");

    // The object URL of whatever is on screen, so it can be let go of.
    const shown = useRef<string | null>(null);

    useEffect(() => {
        return () => {
            if (shown.current) URL.revokeObjectURL(shown.current);
        };
    }, []);

    async function draw(next: number) {
        setIsDrawing(true);
        setProblem("");

        try {
            const body = new FormData();
            body.set("categoryId", categoryId);
            body.set("variation", String(next));
            // The logo has not been uploaded anywhere yet, so its bytes
            // go up with the request. Without it the cover still works;
            // it just uses the trade's colour instead of theirs.
            if (logo) body.set("logo", logo);

            const response = await fetch("/api/admin/cover", { method: "POST", body });

            if (!response.ok) throw new Error("The cover couldn't be drawn.");

            const blob = await response.blob();

            if (shown.current) URL.revokeObjectURL(shown.current);
            shown.current = URL.createObjectURL(blob);

            setUrl(shown.current);
            setVariation(next);
            // Named like a photo, because from here on it is treated as
            // one: the same upload, the same bucket, the same column.
            onChange(new File([blob], "cover.png", { type: "image/png" }));
        } catch {
            setProblem("The cover couldn't be drawn. Try again.");
        } finally {
            setIsDrawing(false);
        }
    }

    function clear() {
        if (shown.current) URL.revokeObjectURL(shown.current);
        shown.current = null;
        setUrl(null);
        setVariation(0);
        onChange(null);
    }

    return (
        <div className="space-y-3">
            {url && (
                // eslint-disable-next-line @next/next/no-img-element -- A blob
                // that exists only in this tab; there is nothing for the image
                // optimiser to fetch.
                <img
                    src={url}
                    alt={`A generated cover for ${name || "the business"}`}
                    className="aspect-video w-full rounded-xl border border-[#17233B]/10 object-cover"
                />
            )}

            <div className="flex flex-wrap items-center gap-2">
                <Button
                    type="button"
                    size="sm"
                    variant={url ? "outline" : "secondary"}
                    disabled={disabled || isDrawing}
                    onClick={() => draw(url ? variation + 1 : 0)}
                >
                    {isDrawing ? "Drawing…" : url ? "Try another" : "Generate a cover"}
                </Button>

                {url && (
                    <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        disabled={disabled || isDrawing}
                        onClick={clear}
                    >
                        Remove it
                    </Button>
                )}
            </div>

            <p className="text-xs leading-5 text-[#17233B]/60">
                {url
                    ? "Saved with the preview, and replaced the moment they upload a photo of their own."
                    : "Their logo's colour and their trade, with no words on it — the page prints the name right underneath. For a business with no photo worth using."}
            </p>

            {problem && <p className="text-xs text-red-700">{problem}</p>}
        </div>
    );
}
