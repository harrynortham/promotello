"use client";

import Link from "next/link";
import { FiArrowLeft, FiPrinter } from "react-icons/fi";

import { Button } from "@/components/ui/button";

export function PrintToolbar({
    backHref,
    size,
    sizeHrefs,
}: {
    backHref: string;
    size: "a4" | "a5";
    sizeHrefs: Record<"a4" | "a5", string>;
}) {
    return (
        <div className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 border-b border-[#17233B]/10 bg-white/95 px-6 py-3 backdrop-blur print:hidden">
            <Button render={<Link href={backHref} />} nativeButton={false} variant="ghost" size="sm">
                <FiArrowLeft aria-hidden="true" />
                Back to QR codes
            </Button>

            <div className="flex items-center gap-2">
                {(["a4", "a5"] as const).map((option) => (
                    <Button
                        key={option}
                        render={<Link href={sizeHrefs[option]} replace />}
                        nativeButton={false}
                        variant={size === option ? "default" : "outline"}
                        size="sm"
                    >
                        {option.toUpperCase()}
                    </Button>
                ))}

                <Button type="button" size="sm" onClick={() => window.print()} className="bg-[#FF593F] text-white hover:bg-[#FF593F]/90">
                    <FiPrinter aria-hidden="true" />
                    Print or save as PDF
                </Button>
            </div>
        </div>
    );
}
