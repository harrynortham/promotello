"use client";

import Link from "next/link";
import { FiArrowLeft, FiPrinter } from "react-icons/fi";

import { Button } from "@/components/ui/button";

// Off the sheet when it is printed: this is the bit on screen.
export function PrintToolbar({ backHref }: { backHref: string }) {
    return (
        <div className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 border-b border-[#17233B]/10 bg-white/95 px-6 py-3 backdrop-blur print:hidden">
            <Button render={<Link href={backHref} />} nativeButton={false} variant="ghost" size="sm">
                <FiArrowLeft aria-hidden="true" />
                Back to the dashboard
            </Button>

            <Button type="button" size="sm" onClick={() => window.print()}>
                <FiPrinter aria-hidden="true" />
                Print or save as PDF
            </Button>
        </div>
    );
}
