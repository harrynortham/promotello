import Link from "next/link";
import type { ReactNode } from "react";
import { FiArrowRight, FiCheck } from "react-icons/fi";

import { Button } from "@/components/ui/button";
import { plans } from "@/lib/billing";

// Building blocks shared by /business, /business/how-it-works and
// /business/features.

export function Eyebrow({ children }: { children: ReactNode }) {
    return <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#FF593F]">{children}</p>;
}

// Text on one side, a product visual on the other; alternate with `reverse`.
export function FeatureSection({
    id,
    eyebrow,
    title,
    body,
    points,
    visual,
    reverse = false,
    tinted = false,
}: {
    id?: string;
    eyebrow: string;
    title: string;
    body: string;
    points: string[];
    visual: ReactNode;
    reverse?: boolean;
    tinted?: boolean;
}) {
    return (
        <section id={id} className={`scroll-mt-24 ${tinted ? "border-y border-[#17233B]/5 bg-white" : ""}`}>
            <div className="mx-auto grid max-w-7xl items-center gap-12 px-6 py-20 sm:px-10 lg:grid-cols-2 lg:gap-16 lg:py-24">
                <div className={reverse ? "lg:order-2" : ""}>
                    <Eyebrow>{eyebrow}</Eyebrow>
                    <h2 className="mt-4 text-3xl font-semibold tracking-tight text-[#17233B] sm:text-4xl">{title}</h2>
                    <p className="mt-5 text-lg leading-8 text-[#17233B]/70">{body}</p>
                    <ul className="mt-6 space-y-3">
                        {points.map((point) => (
                            <li key={point} className="flex gap-3 text-[#17233B]/80">
                                <FiCheck aria-hidden="true" className="mt-1 shrink-0 text-[#FF593F]" />
                                {point}
                            </li>
                        ))}
                    </ul>
                </div>
                <div className={`flex min-w-0 justify-center ${reverse ? "lg:order-1" : ""}`}>{visual}</div>
            </div>
        </section>
    );
}

export function PrimaryActions({ dark = false }: { dark?: boolean }) {
    return (
        <div className="flex flex-wrap gap-3">
            <Button render={<Link href="/business/register" />} nativeButton={false} size="lg">
                Start free
                <FiArrowRight aria-hidden="true" />
            </Button>
            <Button
                render={<Link href="/business/demo" />}
                nativeButton={false}
                variant="outline"
                size="lg"
                className={dark ? "border-white/30 bg-transparent text-white hover:bg-white/10 hover:text-white" : ""}
            >
                Try the demo
            </Button>
        </div>
    );
}

export function FinalCta({ title = "Turn your next first-time visitor into a regular." }: { title?: string }) {
    return (
        <section className="mx-auto max-w-7xl px-6 pb-20 sm:px-10">
            <div className="relative overflow-hidden rounded-[2rem] bg-[#17233B] px-6 py-14 text-white sm:px-12 sm:py-20">
                <div aria-hidden="true" className="absolute -right-16 -top-16 hidden size-64 rounded-full bg-[#FF593F]/25 sm:block" />
                <div aria-hidden="true" className="absolute -bottom-24 -left-10 size-72 rounded-full border-[28px] border-white/5" />
                <div className="relative max-w-2xl">
                    <h2 className="text-3xl font-semibold tracking-tight sm:text-5xl">{title}</h2>
                    <p className="mt-5 text-lg leading-8 text-white/70">
                        Free to start, no card needed. Most businesses are set up in 15 minutes.
                    </p>
                    <div className="mt-8">
                        <PrimaryActions dark />
                    </div>
                </div>
            </div>
        </section>
    );
}

export const planSummaries = [
    {
        name: "Free",
        price: "£0",
        note: "forever",
        description: "Get listed and run your first offer.",
        features: ["Business profile in the directory", "1 live offer", "1 QR poster with scan counts", "Scan-to-redeem vouchers"],
    },
    {
        name: "Pro",
        price: plans.pro_monthly.price,
        note: "a month",
        description: "Everything to bring customers back.",
        features: ["Unlimited offers, live instantly", "Digital loyalty cards", "QR posters for every spot", "Followers emailed every new offer", "Google review prompts"],
        highlight: true,
    },
    {
        name: "Growth",
        price: plans.growth_monthly.price,
        note: "a month",
        description: "Marketing that runs without you.",
        features: ["Everything in Pro", "Welcome, birthday and win-back emails", "Quiet-hours offers", "Monthly value report"],
    },
];

export function PlansSummary() {
    return (
        <div className="grid gap-5 md:grid-cols-3">
            {planSummaries.map((plan) => (
                <div
                    key={plan.name}
                    className={`flex flex-col rounded-3xl border bg-white p-7 text-[#17233B] ${plan.highlight ? "border-[#FF593F]/40 shadow-lg" : "border-[#17233B]/10"}`}
                >
                    <p className="font-semibold">{plan.name}</p>
                    <p className="mt-2">
                        <span className="text-4xl font-semibold tracking-tight">{plan.price}</span>{" "}
                        <span className="text-sm text-[#17233B]/55">{plan.note}</span>
                    </p>
                    <p className="mt-2 text-sm text-[#17233B]/65">{plan.description}</p>
                    <ul className="mt-5 space-y-2 text-sm">
                        {plan.features.map((feature) => (
                            <li key={feature} className="flex gap-2">
                                <FiCheck aria-hidden="true" className="mt-0.5 shrink-0 text-[#FF593F]" />
                                {feature}
                            </li>
                        ))}
                    </ul>
                </div>
            ))}
        </div>
    );
}
