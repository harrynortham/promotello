"use client";

import { useState } from "react";
import { FiMap } from "react-icons/fi";

import { Button } from "@/components/ui/button";

// Google Maps can set its own cookies, so the map only loads once the
// visitor asks for it (see /legal/cookies).
export function MapEmbed({ src, title }: { src: string; title: string }) {
    const [shown, setShown] = useState(false);

    if (shown) {
        return (
            <iframe
                title={title}
                src={src}
                className="h-52 w-full border-0"
                referrerPolicy="no-referrer-when-downgrade"
                allowFullScreen
            />
        );
    }

    return (
        <div className="flex h-52 flex-col items-center justify-center gap-3 bg-[#FFF8F0] px-6 text-center">
            <Button type="button" variant="outline" size="sm" onClick={() => setShown(true)}>
                <FiMap aria-hidden="true" />
                Show map
            </Button>
            <p className="max-w-xs text-xs leading-5 text-muted-foreground">
                Loads Google Maps, which may set cookies.
            </p>
        </div>
    );
}
