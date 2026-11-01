"use client";

import { useState, type ReactNode } from "react";
import { FiHelpCircle } from "react-icons/fi";

import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

export const INK = "#17233B";
export const CORAL = "#FF593F";

// The cream tile each step's illustration sits on, so every set of steps
// looks like the same family.
export function StepFrame({ children }: { children: ReactNode }) {
    return (
        <svg viewBox="0 0 72 72" aria-hidden="true" className="size-16 shrink-0">
            <rect width="72" height="72" rx="16" fill="#FFF8F0" />
            {children}
        </svg>
    );
}

// A decorative QR pattern: not a real code.
export function QrGlyph({ x = 0, y = 0, scale = 1 }: { x?: number; y?: number; scale?: number }) {
    return (
        <g transform={`translate(${x} ${y}) scale(${scale})`}>
            {[
                [0, 0],
                [17, 0],
                [0, 17],
            ].map(([fx, fy]) => (
                <g key={`${fx}-${fy}`}>
                    <rect x={fx} y={fy} width="9" height="9" rx="2" fill="none" stroke={INK} strokeWidth="2" />
                    <rect x={fx + 3.2} y={fy + 3.2} width="2.6" height="2.6" fill={INK} />
                </g>
            ))}
            {[
                [12, 2],
                [12, 8],
                [17, 13],
                [22, 18],
                [12, 18],
                [17, 23],
                [23, 23],
                [2, 12],
                [8, 12],
            ].map(([mx, my]) => (
                <rect key={`${mx}-${my}`} x={mx} y={my} width="2.6" height="2.6" fill={INK} fillOpacity="0.75" />
            ))}
        </g>
    );
}

export type HowItWorksStep = {
    art: ReactNode;
    title: string;
    body: string;
};

// A "How it works" button and the modal of illustrated steps behind it.
export function HowItWorksDialog({
    title,
    description,
    steps,
    label = "How it works",
    numbered = true,
    footer,
}: {
    title: string;
    description: string;
    steps: HowItWorksStep[];
    label?: string;
    // Off when the entries are topics rather than an order to follow.
    numbered?: boolean;
    // Anything to show after the steps, such as who to contact.
    footer?: ReactNode;
}) {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <>
            <Button type="button" variant="outline" size="lg" onClick={() => setIsOpen(true)}>
                <FiHelpCircle aria-hidden="true" />
                {label}
            </Button>

            <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogContent className="max-h-[85vh] overflow-y-auto p-6 sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="text-xl">{title}</DialogTitle>
                        <DialogDescription>{description}</DialogDescription>
                    </DialogHeader>

                    <ol className="space-y-5">
                        {steps.map((step, index) => (
                            <li key={step.title} className="flex gap-4">
                                {step.art}

                                <div className="min-w-0">
                                    {numbered && (
                                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#FF593F]">
                                            Step {index + 1}
                                        </p>
                                    )}

                                    <p className="mt-1 font-semibold text-[#17233B]">
                                        {step.title}
                                    </p>

                                    <p className="mt-1 text-sm leading-6 text-[#17233B]/65">
                                        {step.body}
                                    </p>
                                </div>
                            </li>
                        ))}
                    </ol>

                    {footer}

                    <Button
                        type="button"
                        size="lg"
                        className="w-full bg-[#FF593F] text-white hover:bg-[#FF593F]/90"
                        onClick={() => setIsOpen(false)}
                    >
                        Got it
                    </Button>
                </DialogContent>
            </Dialog>
        </>
    );
}
