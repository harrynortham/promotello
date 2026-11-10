"use client";

import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { FiCheck, FiExternalLink } from "react-icons/fi";

import { BusinessPagePreview, type PagePreview } from "@/components/business-page-preview";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { setupProgress, type SetupStep, type SetupStepId } from "@/lib/setup-steps";

// The one screen setting a business up ever uses: a heading that stays
// put, the steps across the top, the step itself, and the page being
// built beside it.
//
// Naming a new business is the first thing that happens in it, before a
// page exists to show — so the steps are there but not clickable, and
// the preview has a name in it and nothing else. Everything after that
// is the same screen with a business behind it.
export function SetupShell({
    eyebrow,
    heading,
    blurb,
    steps,
    active,
    onGo,
    page,
    pageHref,
    finishLater,
    stepTitle,
    stepBlurb,
    children,
}: {
    eyebrow: string;
    heading: string;
    blurb: string;
    steps: SetupStep[];
    active: SetupStepId | null;
    // Given once the steps can be jumped between, which needs a business.
    onGo?: (step: SetupStepId) => void;
    page: PagePreview;
    pageHref?: string | null;
    finishLater?: { href: string; label: string };
    stepTitle?: string;
    stepBlurb?: string;
    children: ReactNode;
}) {
    const progress = setupProgress(steps);

    return (
        <main className="min-h-dvh bg-[#FFF8F0] text-[#17233B]">
            <header className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-6 py-6">
                <Link href="/business/dashboard" aria-label="Promotello home" className="inline-flex">
                    <Image
                        src="/brand/promotello-horizontal-primary.svg"
                        alt="Promotello"
                        width={150}
                        height={40}
                        priority
                    />
                </Link>

                {finishLater && (
                    <Button render={<Link href={finishLater.href} />} nativeButton={false} variant="ghost" size="sm">
                        {finishLater.label}
                    </Button>
                )}
            </header>

            <div className="mx-auto grid w-full max-w-6xl gap-8 px-6 pb-16 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start lg:gap-x-14 lg:gap-y-8">
                <div className="min-w-0 lg:col-start-1 lg:row-start-1">
                    <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#FF593F]">{eyebrow}</p>

                    {/* The heading belongs to the journey, not the step:
                        it stays put while the card below changes. */}
                    <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">{heading}</h1>

                    <p className="mt-3 max-w-xl leading-7 text-[#17233B]/65">{blurb}</p>

                    <div className="mt-8">
                        <div className="flex items-center justify-between gap-4 text-sm">
                            <p className="font-medium">
                                {progress.done} of {progress.total} done
                            </p>

                            {active && <p className="text-[#17233B]/60">{steps.find((step) => step.id === active)?.nav}</p>}
                        </div>

                        <Progress
                            value={progress.percent}
                            aria-label={`Setup ${progress.percent}% complete`}
                            className="mt-3"
                        />

                        <ol className="mt-5 flex flex-wrap gap-x-2 gap-y-2">
                            {steps.map((item) => {
                                const isActive = item.id === active;
                                const className = `flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition ${isActive
                                    ? "border-[#FF593F] bg-[#FF593F] text-white"
                                    : item.done
                                        ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                                        : "border-[#17233B]/15 bg-white text-[#17233B]/70"
                                    }`;

                                return (
                                    <li key={item.id}>
                                        {onGo ? (
                                            <button
                                                type="button"
                                                onClick={() => onGo(item.id)}
                                                aria-current={isActive ? "step" : undefined}
                                                className={`${className} cursor-pointer hover:border-[#17233B]/30`}
                                            >
                                                {item.done && <FiCheck aria-hidden="true" className="size-3.5" />}
                                                {item.nav}
                                            </button>
                                        ) : (
                                            <span className={className}>{item.nav}</span>
                                        )}
                                    </li>
                                );
                            })}
                        </ol>
                    </div>
                </div>

                {/* On a phone this sits between the heading and the step,
                    so the page they are building is the first thing they
                    see and the step is what they scroll to. */}
                <aside className="mx-auto w-full max-w-sm lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:mx-0 lg:max-w-none lg:sticky lg:top-8 lg:self-start">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#17233B]/50">
                        Your page so far
                    </p>

                    <BusinessPagePreview page={page} className="mt-4" />

                    <p className="mt-4 text-xs leading-6 text-[#17233B]/60">
                        {page.description && page.logoUrl && page.coverImageUrl
                            ? "This is what customers see when they find you."
                            : "It fills in as you go. Nothing is public until you send it to us."}
                    </p>

                    {pageHref && (
                        <Button
                            render={<Link href={pageHref} target="_blank" rel="noreferrer" />}
                            nativeButton={false}
                            variant="ghost"
                            size="sm"
                            className="mt-2 -ml-2.5"
                        >
                            See the full page
                            <FiExternalLink aria-hidden="true" />
                        </Button>
                    )}
                </aside>

                <div className="min-w-0 lg:col-start-1 lg:row-start-2">
                    {stepTitle && (
                        <div className="mb-5">
                            <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">{stepTitle}</h2>
                            {stepBlurb && <p className="mt-2 max-w-xl leading-7 text-[#17233B]/65">{stepBlurb}</p>}
                        </div>
                    )}

                    {children}
                </div>
            </div>
        </main>
    );
}
