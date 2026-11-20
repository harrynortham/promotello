"use client";

import { useEffect, useState } from "react";
import { FiCheck, FiCopy } from "react-icons/fi";

import { Button } from "@/components/ui/button";

export function CopyButton({
    text,
    label,
    size = "sm",
    // Just the icon, for a list where a labelled button per row would
    // be louder than the rows.
    iconOnly = false,
    className,
}: {
    text: string;
    label: string;
    size?: "sm" | "default";
    iconOnly?: boolean;
    className?: string;
}) {
    const [copied, setCopied] = useState(false);

    // Cancelled if the button goes first: a list that re-renders while
    // the timer is running would otherwise set state on something that
    // has gone.
    useEffect(() => {
        if (!copied) return;

        const timer = setTimeout(() => setCopied(false), 2000);

        return () => clearTimeout(timer);
    }, [copied]);

    async function copy(event: React.MouseEvent) {
        // The sales list makes the whole card a link, so without both of
        // these, copying a name also opens the lead.
        event.preventDefault();
        event.stopPropagation();

        try {
            await navigator.clipboard.writeText(text);
            setCopied(true);
        } catch {
            // Refused on an untrusted page or an older browser. Saying
            // nothing at all would look like it had worked.
            setCopied(false);
            window.prompt("Copy it from here:", text);
        }
    }

    if (iconOnly) {
        return (
            <button
                type="button"
                onClick={copy}
                title={copied ? "Copied" : label}
                aria-label={copied ? "Copied" : label}
                className={className}
            >
                {copied ? (
                    <FiCheck aria-hidden="true" className="size-4 text-emerald-600" />
                ) : (
                    <FiCopy aria-hidden="true" className="size-4" />
                )}
            </button>
        );
    }

    return (
        <Button type="button" variant="outline" size={size} onClick={copy} className={className}>
            {copied ? <FiCheck aria-hidden="true" /> : <FiCopy aria-hidden="true" />}
            {copied ? "Copied" : label}
        </Button>
    );
}
