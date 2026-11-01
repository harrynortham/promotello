"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { Label } from "@/components/ui/label";

// Picks the paper size for the preview and for the Print poster links.
// It lives in the URL (?size=), so the server renders the right one.
export function PosterSizeSelect({ size }: { size: "a4" | "a5" }) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    function choose(next: string) {
        const params = new URLSearchParams(searchParams);
        params.set("size", next);
        router.replace(`${pathname}?${params}`, { scroll: false });
    }

    return (
        <div className="space-y-2">
            <Label htmlFor="poster-size">Paper size</Label>

            <select
                id="poster-size"
                value={size}
                onChange={(event) => choose(event.target.value)}
                className="h-12 w-full rounded-lg border border-input bg-background px-3 text-sm"
            >
                <option value="a4">A4 — window or wall</option>
                <option value="a5">A5 — till or tables</option>
            </select>
        </div>
    );
}
