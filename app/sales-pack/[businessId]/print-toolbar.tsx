"use client";

import Link from "next/link";
import { FiArrowLeft, FiPrinter } from "react-icons/fi";

import { Button } from "@/components/ui/button";

// On screen only: the sheets print without it, the way the staff guide
// and the posters do.
export function PrintToolbar({ backHref }: { backHref: string }) {
    return (
        <div className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 border-b border-[#17233B]/10 bg-white/95 px-6 py-3 backdrop-blur print:hidden">
            <div className="flex items-center gap-3">
                <Button render={<Link href={backHref} />} nativeButton={false} variant="ghost" size="sm">
                    <FiArrowLeft aria-hidden="true" />
                    Back to the dashboard
                </Button>

                <p className="hidden text-sm text-[#17233B]/65 sm:block">
                    Six sheets. Print them, or save the lot as one PDF.
                </p>
            </div>

            <Button type="button" size="sm" onClick={() => window.print()}>
                <FiPrinter aria-hidden="true" />
                Download as PDF
            </Button>
        </div>
    );
}
