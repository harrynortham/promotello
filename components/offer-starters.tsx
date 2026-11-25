"use client";

import { FiArrowRight } from "react-icons/fi";

import { offerHeadline } from "@/lib/offer-kinds";
import type { OfferTemplate } from "@/lib/offer-templates";

// Offers to start from, above the blank form.
//
// Each card shows the headline the offer would carry, the title it would
// have, and one line saying what it is for — because a business choosing
// between "free pastry before 10am" and "£5 off two courses" is choosing
// between two quiet hours, not between two discounts.
//
// Pressing one fills the form in. Nothing is saved and nothing is
// promised: every field is still theirs to change, and the preview
// beside the form updates as they do.

export function OfferStarters({
    templates,
    chosen,
    onPick,
    onClear,
}: {
    templates: OfferTemplate[];
    chosen: OfferTemplate | null;
    onPick: (template: OfferTemplate) => void;
    onClear: () => void;
}) {
    if (templates.length === 0) return null;

    if (chosen) {
        return (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#FF593F]/25 bg-[#FF593F]/[0.04] px-4 py-3">
                <p className="text-sm">
                    Started from <strong>{chosen.title}</strong>. Change anything below.
                </p>
                <button
                    type="button"
                    onClick={onClear}
                    className="text-sm font-medium underline underline-offset-4 hover:text-[#FF593F]"
                >
                    Start again
                </button>
            </div>
        );
    }

    return (
        <div className="rounded-xl border border-[#17233B]/10 bg-white p-5">
            <h2 className="font-semibold">Start from one of these</h2>
            <p className="mt-1 text-sm leading-6 text-[#17233B]/65">
                Each one fills the form in, dates and all. Change whatever you like — or ignore
                them and write your own below.
            </p>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {templates.map((template) => {
                    const headline = offerHeadline({
                        kind: template.kind,
                        value: template.value ? String(template.value) : "",
                        quantity: template.quantity ? String(template.quantity) : "",
                        item: template.item ?? "",
                        text: "",
                    });

                    return (
                        <button
                            key={template.id}
                            type="button"
                            onClick={() => onPick(template)}
                            className="group flex flex-col items-start gap-1 rounded-xl border border-[#17233B]/10 bg-[#FFF8F0] px-4 py-3 text-left transition hover:border-[#FF593F]/50 hover:shadow-sm"
                        >
                            <span className="text-sm font-semibold text-[#FF593F]">{headline}</span>
                            <span className="font-medium leading-6">{template.title}</span>
                            <span className="text-sm leading-6 text-[#17233B]/65">{template.why}</span>
                            <span className="mt-1 inline-flex items-center gap-1 text-sm font-medium text-[#17233B]/70 group-hover:text-[#FF593F]">
                                Use this one
                                <FiArrowRight aria-hidden="true" className="size-3.5" />
                            </span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
