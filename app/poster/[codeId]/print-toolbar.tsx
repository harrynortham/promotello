"use client";

import Link from "next/link";
import { useCallback, useEffect } from "react";
import { FiArrowLeft, FiPrinter } from "react-icons/fi";

import { Button } from "@/components/ui/button";
import { createClient } from "@/utils/supabase/client";
import { POSTER_SIZES, type PosterSize } from "@/lib/poster-sizes";

export function PrintToolbar({
    backHref,
    codeId,
    size,
    sizeHrefs,
}: {
    backHref: string;
    codeId: string;
    size: PosterSize;
    sizeHrefs: Record<PosterSize, string>;
}) {
    // Made is not printed. The dashboard used to tick "Print a QR poster"
    // the moment a code existed, and the funnel wants the poster that
    // actually went in a window — so the printing is what gets recorded,
    // whether it starts here or with Cmd-P.
    const printed = useCallback(() => {
        void createClient()
            .rpc("mark_poster_printed", { requested_code_id: codeId })
            .then(undefined, () => undefined);
    }, [codeId]);

    useEffect(() => {
        window.addEventListener("beforeprint", printed);

        return () => window.removeEventListener("beforeprint", printed);
    }, [printed]);

    return (
        <div className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 border-b border-[#17233B]/10 bg-white/95 px-6 py-3 backdrop-blur print:hidden">
            <Button render={<Link href={backHref} />} nativeButton={false} variant="ghost" size="sm">
                <FiArrowLeft aria-hidden="true" />
                Back to QR posters
            </Button>

            <div className="flex items-center gap-2">
                {POSTER_SIZES.map((option) => (
                    <Button
                        key={option.value}
                        render={<Link href={sizeHrefs[option.value]} replace />}
                        nativeButton={false}
                        variant={size === option.value ? "default" : "outline"}
                        size="sm"
                    >
                        {option.label}
                    </Button>
                ))}

                <Button
                    type="button"
                    size="sm"
                    onClick={() => {
                        printed();
                        window.print();
                    }}
                    className="bg-[#FF593F] text-white hover:bg-[#FF593F]/90"
                >
                    <FiPrinter aria-hidden="true" />
                    Print or save as PDF
                </Button>
            </div>
        </div>
    );
}
