"use client";

import { useState } from "react";
import { FiCheck, FiCopy } from "react-icons/fi";

import { Button } from "@/components/ui/button";

export function CopyButton({ text, label, size = "sm" }: { text: string; label: string; size?: "sm" | "default" }) {
    const [copied, setCopied] = useState(false);

    async function copy() {
        try {
            await navigator.clipboard.writeText(text);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            setCopied(false);
        }
    }

    return (
        <Button type="button" variant="outline" size={size} onClick={copy}>
            {copied ? <FiCheck aria-hidden="true" /> : <FiCopy aria-hidden="true" />}
            {copied ? "Copied" : label}
        </Button>
    );
}
