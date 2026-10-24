"use client";

import { useState } from "react";
import { FiCheck, FiLink, FiShare2 } from "react-icons/fi";

import { Button } from "@/components/ui/button";
import { shareLinks } from "@/lib/share";

// "Share with a friend" on a public offer page. Uses the phone's share
// sheet when there is one; otherwise offers WhatsApp, Facebook, X and a
// copyable link.
export function ShareOfferButton({ url, text }: { url: string; text: string }) {
    const [open, setOpen] = useState(false);
    const [copied, setCopied] = useState(false);
    const links = shareLinks({ url, text });

    async function share() {
        if ("share" in navigator) {
            try {
                await navigator.share({ text, url });
            } catch {
                // Cancelled.
            }
            return;
        }

        setOpen((current) => !current);
    }

    async function copyLink() {
        try {
            await navigator.clipboard.writeText(url);
            setCopied(true);
        } catch {
            setCopied(false);
        }
    }

    return (
        <div className="mt-3">
            <Button type="button" variant="outline" className="w-full" onClick={share} aria-expanded={open}>
                <FiShare2 aria-hidden="true" />
                Share with a friend
            </Button>

            {open && (
                <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                    <a href={links.whatsapp} target="_blank" rel="noopener noreferrer" className="rounded-lg border px-3 py-2 text-center hover:border-[#FF593F]/40">
                        WhatsApp
                    </a>
                    <a href={links.facebook} target="_blank" rel="noopener noreferrer" className="rounded-lg border px-3 py-2 text-center hover:border-[#FF593F]/40">
                        Facebook
                    </a>
                    <a href={links.x} target="_blank" rel="noopener noreferrer" className="rounded-lg border px-3 py-2 text-center hover:border-[#FF593F]/40">
                        X
                    </a>
                    <button type="button" onClick={copyLink} className="inline-flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2 hover:border-[#FF593F]/40">
                        {copied ? <FiCheck aria-hidden="true" /> : <FiLink aria-hidden="true" />}
                        {copied ? "Copied" : "Copy link"}
                    </button>
                </div>
            )}
        </div>
    );
}
