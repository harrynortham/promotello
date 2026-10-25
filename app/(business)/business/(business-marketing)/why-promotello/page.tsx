import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import {
    FiArrowRight,
    FiAward,
    FiBarChart2,
    FiCheck,
    FiGift,
    FiGrid,
    FiHeart,
    FiStar,
} from "react-icons/fi";

import { Button } from "@/components/ui/button";
import { PrintButton } from "./print-button";

// One-page overview for outreach emails: link it, or print it as a PDF.

export const metadata: Metadata = {
    title: "Why Promotello",
    description:
        "Turn first-time visitors into regulars with digital loyalty cards, QR posters, offers and follower emails. Free to start, set up in 15 minutes.",
};

const tools: { icon: ReactNode; title: string; body: string }[] = [
    {
        icon: <FiAward />,
        title: "Digital loyalty cards",
        body: "Stamp cards on your customers' phones. Staff stamp by scanning, so nobody can stamp themselves.",
    },
    {
        icon: <FiGrid />,
        title: "QR posters with scan counts",
        body: "Print a poster for your window or till. See how many people scan each one.",
    },
    {
        icon: <FiGift />,
        title: "Offers that bring people in",
        body: "Create a deal in a minute, cap how many can claim it, and redeem vouchers by scanning.",
    },
    {
        icon: <FiHeart />,
        title: "Followers and offer emails",
        body: "Customers follow you, and every new offer is emailed to them automatically.",
    },
    {
        icon: <FiStar />,
        title: "More Google reviews",
        body: "Customers who've just visited are asked to leave you a review.",
    },
    {
        icon: <FiBarChart2 />,
        title: "See what it's worth",
        body: "Views, claims, visits and stamps every month, compared with the month before.",
    },
];

const steps = [
    { title: "Sign up free", body: "Add your business, opening hours and logo." },
    { title: "Create an offer or loyalty card", body: "Pick from ideas or write your own." },
    { title: "Print your QR poster", body: "Put it up, and customers start following you." },
];

function Plan({
    name,
    price,
    note,
    features,
    highlight = false,
}: {
    name: string;
    price: string;
    note: string;
    features: string[];
    highlight?: boolean;
}) {
    return (
        <div
            className={`rounded-2xl border p-5 print:p-3 ${highlight ? "border-[#FF593F]/40 bg-white shadow-sm" : "border-[#17233B]/10 bg-white/60"}`}
        >
            <p className="text-sm font-semibold">{name}</p>
            <p className="mt-1">
                <span className="text-3xl font-semibold">{price}</span>{" "}
                <span className="text-sm text-[#17233B]/70">{note}</span>
            </p>
            <ul className="mt-4 space-y-2 text-sm print:mt-2 print:space-y-1 print:text-xs">
                {features.map((feature) => (
                    <li key={feature} className="flex gap-2">
                        <FiCheck aria-hidden="true" className="mt-0.5 shrink-0 text-[#FF593F]" />
                        {feature}
                    </li>
                ))}
            </ul>
        </div>
    );
}

export default function WhyPromotelloPage() {
    return (
        <main className="bg-[#FFF8F0] px-6 py-10 text-[#17233B] sm:py-16 print:bg-white print:p-0">
            <article className="mx-auto max-w-4xl print:max-w-none">
                <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
                    <p className="text-sm text-[#17233B]/70">A one-page overview you can share or print.</p>
                    <PrintButton />
                </div>

                <header className="mt-6 print:mt-0">
                    <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#FF593F]">
                        Promotello for independent businesses
                    </p>
                    <h1 className="mt-3 text-4xl font-semibold leading-tight tracking-tight sm:text-5xl print:text-3xl">
                        Turn first-time visitors into regulars.
                    </h1>
                    <p className="mt-4 max-w-2xl text-lg leading-8 text-[#17233B]/70 print:mt-2 print:text-sm print:leading-6">
                        Loyalty cards, QR posters, offers and follower emails in one simple app. It works
                        from day one with your own customers. No hardware, no contract, free to start.
                    </p>
                </header>

                <section className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 print:mt-4 print:grid-cols-3 print:gap-2">
                    {tools.map((tool) => (
                        <div key={tool.title} className="rounded-2xl border border-[#17233B]/10 bg-white p-5 print:break-inside-avoid print:rounded-xl print:p-3">
                            <span className="flex size-9 items-center justify-center rounded-full bg-[#FF593F]/10 text-[#FF593F] print:size-7">
                                {tool.icon}
                            </span>
                            <h2 className="mt-3 font-semibold print:mt-2 print:text-sm">{tool.title}</h2>
                            <p className="mt-1 text-sm leading-6 text-[#17233B]/65 print:text-xs print:leading-5">{tool.body}</p>
                        </div>
                    ))}
                </section>

                <section className="mt-10 print:mt-4 print:break-inside-avoid">
                    <h2 className="text-xl font-semibold">Up and running in 15 minutes</h2>
                    <ol className="mt-4 grid gap-4 sm:grid-cols-3 print:grid-cols-3">
                        {steps.map((step, index) => (
                            <li key={step.title} className="flex gap-3">
                                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#17233B] text-sm font-semibold text-white">
                                    {index + 1}
                                </span>
                                <span>
                                    <span className="block font-semibold">{step.title}</span>
                                    <span className="block text-sm text-[#17233B]/65">{step.body}</span>
                                </span>
                            </li>
                        ))}
                    </ol>
                </section>

                <section className="mt-10 print:mt-4 print:break-inside-avoid">
                    <h2 className="text-xl font-semibold">Simple pricing</h2>
                    <div className="mt-4 grid gap-4 sm:grid-cols-3 print:grid-cols-3">
                        <Plan
                            name="Free"
                            price="£0"
                            note="forever"
                            features={["Business profile in the Promotello directory", "1 live offer", "1 QR poster with scan counts", "Voucher codes, scan to redeem"]}
                        />
                        <Plan
                            name="Pro"
                            price="£24"
                            note="a month · 30-day free trial"
                            highlight
                            features={["Unlimited offers, live instantly", "Digital loyalty cards", "QR posters for every spot", "Followers emailed every new offer", "Google review prompts"]}
                        />
                        <Plan
                            name="Growth"
                            price="£39"
                            note="a month · 30-day free trial"
                            features={["Everything in Pro", "Welcome, birthday and win-back emails", "Quiet-hours offers on repeat", "Monthly value report", "Instagram story images for offers"]}
                        />
                    </div>
                    <p className="mt-3 text-sm text-[#17233B]/70">
                        Founding members: the first 50 businesses pay £19 a month for Pro, locked for life.
                    </p>
                </section>

                <section className="mt-10 flex flex-col gap-4 rounded-3xl bg-[#17233B] p-8 text-white sm:flex-row sm:items-center sm:justify-between print:mt-4 print:break-inside-avoid print:rounded-xl print:p-4">
                    <div>
                        <h2 className="text-2xl font-semibold">See it for yourself</h2>
                        <p className="mt-1 text-white/70">
                            Try the demo, or sign up free at promotello.com/business
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-3 print:hidden">
                        <Button render={<Link href="/business/demo" />} nativeButton={false} variant="outline" className="border-white/30 bg-transparent text-white hover:bg-white/10 hover:text-white">
                            Try the demo
                        </Button>
                        <Button render={<Link href="/business/register" />} nativeButton={false}>
                            Start free
                            <FiArrowRight aria-hidden="true" />
                        </Button>
                    </div>
                </section>
            </article>
        </main>
    );
}
