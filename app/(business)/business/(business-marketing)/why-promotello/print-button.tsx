"use client";

import { FiPrinter } from "react-icons/fi";

import { Button } from "@/components/ui/button";

export function PrintButton() {
    return (
        <Button type="button" variant="outline" size="sm" onClick={() => window.print()}>
            <FiPrinter aria-hidden="true" />
            Print or save as PDF
        </Button>
    );
}
