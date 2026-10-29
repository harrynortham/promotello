"use client";

import Link from "next/link";
import { useState } from "react";
import {
    FiArrowRight,
    FiBookOpen,
    FiSearch,
} from "react-icons/fi";

import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { company } from "@/lib/legal";

export type HelpGuide = {
    id: string;
    category: string;
    title: string;
    description: string;
    steps: string[];
    note?: string;
    link?: {
        label: string;
        href: string;
    };
};

type HelpCentreProps = {
    audience: string;
    title: string;
    description: string;
    searchPlaceholder: string;
    guides: HelpGuide[];
    contactHref: string;
    alternateHref: string;
    alternateLabel: string;
    gettingStartedHref?: string;
};

export default function HelpCentre({
    audience,
    title,
    description,
    searchPlaceholder,
    guides,
    contactHref,
    alternateHref,
    alternateLabel,
    gettingStartedHref,
}: HelpCentreProps) {
    const [search, setSearch] = useState("");
    const [category, setCategory] = useState("All topics");

    const categories = [
        "All topics",
        ...new Set(guides.map((guide) => guide.category)),
    ];

    const query = search.trim().toLowerCase();

    const filteredGuides = guides.filter((guide) => {
        const matchesCategory =
            category === "All topics" || guide.category === category;

        const searchableText = [
            guide.title,
            guide.description,
            guide.category,
            ...guide.steps,
            guide.note ?? "",
        ]
            .join(" ")
            .toLowerCase();

        return matchesCategory && (!query || searchableText.includes(query));
    });

    const visibleCategories = categories
        .filter((item) => item !== "All topics")
        .filter((item) =>
            filteredGuides.some((guide) => guide.category === item),
        );

    const hasFilters = Boolean(query) || category !== "All topics";

    function clearFilters() {
        setSearch("");
        setCategory("All topics");
    }

    return (
        <main className="bg-background text-foreground">
            <section className="border-b bg-[#FFF8F0]">
                <div className="mx-auto max-w-7xl px-6 py-14 sm:px-10 sm:py-20">
                    <div className="mx-auto max-w-3xl text-center">
                        <span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-[#FF593F]/10 text-[#FF593F]">
                            <FiBookOpen
                                aria-hidden="true"
                                className="size-6"
                            />
                        </span>

                        <p className="mt-5 text-xs font-semibold uppercase tracking-[0.18em] text-[#FF593F]">
                            {audience}
                        </p>

                        <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">
                            {title}
                        </h1>

                        <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-muted-foreground">
                            {description}
                        </p>

                        <div className="relative mx-auto mt-8 max-w-xl">
                            <Label htmlFor="help-search" className="sr-only">
                                Search help guides
                            </Label>

                            <FiSearch
                                aria-hidden="true"
                                className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground"
                            />

                            <Input
                                id="help-search"
                                type="search"
                                value={search}
                                onChange={(event) =>
                                    setSearch(event.target.value)
                                }
                                placeholder={searchPlaceholder}
                                className="h-12 bg-background pl-12"
                            />
                        </div>
                    </div>
                </div>
            </section>

            <div className="mx-auto max-w-7xl px-6 py-10 sm:px-10 sm:py-14">
                {gettingStartedHref && !hasFilters && (
                    <Card className="mb-8 rounded-2xl bg-muted/30 shadow-none">
                        <CardHeader>
                            <CardTitle>New to Promotello?</CardTitle>

                            <CardDescription className="leading-7">
                                Follow our getting started guide to prepare
                                your business and your first promotion.
                            </CardDescription>
                        </CardHeader>

                        <CardContent>
                            <Button
                                render={<Link href={gettingStartedHref} />}
                                nativeButton={false}
                                variant="outline"
                            >
                                Open the setup guide
                                <FiArrowRight aria-hidden="true" />
                            </Button>
                        </CardContent>
                    </Card>
                )}

                <nav
                    aria-label="Filter help topics"
                    className="flex flex-wrap gap-2"
                >
                    {categories.map((item) => (
                        <Button
                            key={item}
                            type="button"
                            variant={category === item ? "default" : "outline"}
                            size="sm"
                            aria-pressed={category === item}
                            onClick={() => setCategory(item)}
                        >
                            {item}
                        </Button>
                    ))}
                </nav>

                <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                    <p
                        role="status"
                        className="text-sm text-muted-foreground"
                    >
                        {filteredGuides.length} guide
                        {filteredGuides.length === 1 ? "" : "s"}
                        {hasFilters ? " found" : " available"}
                    </p>

                    {hasFilters && (
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={clearFilters}
                        >
                            Clear filters
                        </Button>
                    )}
                </div>

                {filteredGuides.length === 0 ? (
                    <Card className="mt-8 rounded-2xl border-dashed shadow-none">
                        <CardContent className="px-6 py-12 text-center">
                            <h2 className="text-xl font-semibold">
                                We couldn’t find a matching guide
                            </h2>

                            <p className="mt-3 leading-7 text-muted-foreground">
                                Try a shorter search, choose another topic,
                                or contact us for help.
                            </p>

                            <div className="mt-6 flex flex-wrap justify-center gap-3">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={clearFilters}
                                >
                                    Show all guides
                                </Button>

                                <Button
                                    render={<Link href={contactHref} />}
                                    nativeButton={false}
                                >
                                    Contact support
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="mt-10 space-y-12">
                        {visibleCategories.map((topic) => (
                            <section key={topic}>
                                <h2 className="text-2xl font-semibold tracking-tight">
                                    {topic}
                                </h2>

                                <div className="mt-5 space-y-3">
                                    {filteredGuides
                                        .filter(
                                            (guide) =>
                                                guide.category === topic,
                                        )
                                        .map((guide) => (
                                            <details
                                                key={guide.id}
                                                id={guide.id}
                                                className="group scroll-mt-28 rounded-2xl border bg-card text-card-foreground"
                                            >
                                                <summary className="flex cursor-pointer list-none items-start justify-between gap-5 rounded-2xl p-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:p-6 [&::-webkit-details-marker]:hidden">
                                                    <span>
                                                        <span className="block font-semibold leading-7">
                                                            {guide.title}
                                                        </span>

                                                        <span className="mt-1 block text-sm leading-6 text-muted-foreground">
                                                            {guide.description}
                                                        </span>
                                                    </span>

                                                    <span
                                                        aria-hidden="true"
                                                        className="mt-1 flex size-6 shrink-0 items-center justify-center rounded-full bg-muted"
                                                    >
                                                        <span className="group-open:hidden">
                                                            +
                                                        </span>
                                                        <span className="hidden group-open:inline">
                                                            −
                                                        </span>
                                                    </span>
                                                </summary>

                                                <div className="px-5 pb-6 sm:px-6">
                                                    <ol className="list-decimal space-y-3 pl-5 text-sm leading-7 text-muted-foreground">
                                                        {guide.steps.map(
                                                            (step, index) => (
                                                                <li
                                                                    key={index}
                                                                    className="pl-2"
                                                                >
                                                                    {step}
                                                                </li>
                                                            ),
                                                        )}
                                                    </ol>

                                                    {guide.note && (
                                                        <p className="mt-5 rounded-xl bg-muted/50 p-4 text-sm leading-7 text-muted-foreground">
                                                            {guide.note}
                                                        </p>
                                                    )}

                                                    {guide.link && (
                                                        <Button
                                                            render={
                                                                <Link
                                                                    href={
                                                                        guide
                                                                            .link
                                                                            .href
                                                                    }
                                                                />
                                                            }
                                                            nativeButton={false}
                                                            variant="outline"
                                                            size="sm"
                                                            className="mt-5"
                                                        >
                                                            {guide.link.label}
                                                            <FiArrowRight aria-hidden="true" />
                                                        </Button>
                                                    )}
                                                </div>
                                            </details>
                                        ))}
                                </div>
                            </section>
                        ))}
                    </div>
                )}

                <section className="mt-14 rounded-3xl bg-[#FFF4E8] px-6 py-10 text-center sm:px-10">
                    <h2 className="text-2xl font-semibold tracking-tight text-[#17233B] sm:text-3xl">
                        Still need a hand?
                    </h2>

                    <p className="mx-auto mt-3 max-w-xl leading-7 text-[#17233B]/70">
                        Tell us what you were trying to do and what happened.
                        Please don’t send passwords, payment details, or
                        redemption codes.
                    </p>

                    <Button
                        render={<Link href={contactHref} />}
                        nativeButton={false}
                        className="mt-6"
                    >
                        Contact support
                        <FiArrowRight aria-hidden="true" />
                    </Button>

                    <p className="mt-4 text-sm text-[#17233B]/70">
                        Or email{" "}
                        <a href={`mailto:${company.supportEmail}`} className="font-medium underline underline-offset-4">
                            {company.supportEmail}
                        </a>
                    </p>

                    <p className="mt-6 text-sm text-[#17233B]/65">
                        <Link
                            href={alternateHref}
                            className="font-medium underline underline-offset-4"
                        >
                            {alternateLabel}
                        </Link>
                    </p>
                </section>
            </div>
        </main>
    );
}