"use client";

import { useEffect, useRef, useState } from "react";

// A description that might run long. Clamped to three lines, with a toggle
// only when the text actually overflows those lines — measured rather than
// guessed from a character count, since how much fits depends on the width
// and the words.
export function ReadMore({ text, className = "" }: { text: string; className?: string }) {
    const paragraph = useRef<HTMLParagraphElement>(null);
    const [open, setOpen] = useState(false);
    const [overflows, setOverflows] = useState(false);

    useEffect(() => {
        const element = paragraph.current;

        // While open the clamp is off, so there is nothing to measure: keep
        // what was measured when it was closed, or the toggle would vanish.
        if (!element || open) return;

        const measure = () => setOverflows(element.scrollHeight - element.clientHeight > 2);
        measure();

        const observer = new ResizeObserver(measure);
        observer.observe(element);

        return () => observer.disconnect();
    }, [text, open]);

    return (
        <>
            <p ref={paragraph} className={`whitespace-pre-line ${open ? "" : "line-clamp-3"} ${className}`}>
                {text}
            </p>

            {overflows && (
                <button
                    type="button"
                    onClick={() => setOpen((shown) => !shown)}
                    aria-expanded={open}
                    className="mt-1 text-sm font-medium text-[#FF593F] underline underline-offset-4 hover:text-[#17233B] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF593F]"
                >
                    {open ? "Show less" : "Read more"}
                </button>
            )}
        </>
    );
}
