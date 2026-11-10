"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { FiArrowRight, FiCheck, FiExternalLink } from "react-icons/fi";

import { BusinessPagePreview, type PagePreview } from "@/components/business-page-preview";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import type { DayValues } from "@/lib/business-hours";
import type { CityOption } from "@/lib/locations";
import {
    firstUnfinished,
    isSetupStepId,
    missingBeforeReview,
    setupFinished,
    setupProgress,
    type SetupStep,
    type SetupStepId,
} from "@/lib/setup-steps";
import {
    AddressStep,
    CoverStep,
    DescriptionStep,
    HoursStep,
    LogoStep,
    OfferStep,
    ReviewStep,
    type BusinessLocation,
} from "./steps";

export type SetupDraft = PagePreview;

export function SetupFlow({
    businessId,
    businessName,
    businessSlug,
    firstName,
    steps,
    startAt,
    justClaimed,
    justSent,
    cities,
    page,
    location,
    days,
    isLive,
    ours,
}: {
    businessId: string;
    businessName: string;
    businessSlug: string | null;
    firstName: string | null;
    steps: SetupStep[];
    startAt: SetupStepId | null;
    justClaimed: boolean;
    justSent: boolean;
    cities: CityOption[];
    page: PagePreview;
    location: BusinessLocation | null;
    days: DayValues[];
    isLive: boolean;
    // The page was written by us, not by them: the steps that arrive
    // prefilled say so.
    ours: boolean;
}) {
    const router = useRouter();

    // What the page looks like as they fill it in. It starts as whatever
    // is saved — for a page we built, that is already most of it.
    const [draft, setDraft] = useState<SetupDraft>(page);
    const [done, setDone] = useState<SetupStepId[]>(steps.filter((step) => step.done).map((step) => step.id));

    // Which step they are on lives in the address bar, not in here: the
    // send goes through the server and comes back with ?step=offer, and
    // state inside this component would sit through that. It also means
    // Back works, and a reload keeps their place.
    const params = useSearchParams();
    const asked = params.get("step");
    const requested = isSetupStepId(asked) ? asked : startAt;

    // What the server says, plus anything finished since it last spoke:
    // the local list is an addition to the truth, not a replacement for it.
    const live = useMemo(
        () => steps.map((step) => ({ ...step, done: step.done || done.includes(step.id) })),
        [steps, done],
    );

    const progress = setupProgress(live);
    const finished = setupFinished(live);
    const active = requested ?? firstUnfinished(live);

    // The next thing still missing, starting after the one they are on —
    // so finishing step three offers step four, not the one they left for
    // later. Anything skipped comes back round at the end.
    function nextAfter(step: SetupStepId, list: SetupStep[]) {
        const order = list.map((item) => item.id);
        const after = order.slice(order.indexOf(step) + 1);

        return (
            after.find((id) => !list.find((item) => item.id === id)?.done) ??
            list.find((item) => !item.done)?.id ??
            null
        );
    }

    function go(step: SetupStepId | null) {
        // Replace rather than push: Back should leave the flow, not walk
        // them backwards through every step they finished.
        router.replace(step ? `/business/setup/${businessId}?step=${step}` : `/business/setup/${businessId}`, {
            scroll: false,
        });
    }

    function completed(step: SetupStepId) {
        setDone((current) => (current.includes(step) ? current : [...current, step]));

        // The dashboard, the preview and the public page all read the same
        // rows, so they should hear about this too. Moving to the next step
        // is a navigation, which re-reads them.
        go(nextAfter(step, live.map((item) => (item.id === step ? { ...item, done: true } : item))));
        router.refresh();
    }

    // Leaving something for later is not doing it: it moves on, and leaves
    // this one missing.
    function skip(step: SetupStepId) {
        go(nextAfter(step, live));
    }

    const step = live.find((item) => item.id === active) ?? null;

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

                <Button render={<Link href={`/business/${businessId}`} />} nativeButton={false} variant="ghost" size="sm">
                    {finished ? "Go to your dashboard" : "Finish later"}
                </Button>
            </header>

            <div className="mx-auto grid w-full max-w-6xl gap-8 px-6 pb-16 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start lg:gap-x-14 lg:gap-y-8">
                <div className="min-w-0 lg:col-start-1 lg:row-start-1">
                    <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#FF593F]">
                        {justClaimed ? `${businessName} is yours` : `Setting up ${businessName}`}
                    </p>

                    {/* The heading belongs to the journey, not the step:
                        it stays put while the card below changes. */}
                    <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
                        {finished
                            ? `That's everything${firstName ? `, ${firstName}` : ""}.`
                            : `Let's finish your page${firstName ? `, ${firstName}` : ""}.`}
                    </h1>

                    <p className="mt-3 max-w-xl leading-7 text-[#17233B]/65">
                        {finished
                            ? "Your page is with us and your first offer is in. Everything else lives in your dashboard."
                            : "A few quick things and it's ready for customers. You can watch it take shape as you go."}
                    </p>

                    <div className="mt-8">
                        <div className="flex items-center justify-between gap-4 text-sm">
                            <p className="font-medium">
                                {progress.done} of {progress.total} done
                            </p>

                            {!finished && step && (
                                <p className="text-[#17233B]/60">{step.nav}</p>
                            )}
                        </div>

                        <Progress value={progress.percent} aria-label={`Setup ${progress.percent}% complete`} className="mt-3" />

                        <ol className="mt-5 flex flex-wrap gap-x-2 gap-y-2">
                            {live.map((item) => {
                                const isActive = item.id === active;

                                return (
                                    <li key={item.id}>
                                        <button
                                            type="button"
                                            onClick={() => go(item.id)}
                                            aria-current={isActive ? "step" : undefined}
                                            className={`flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition ${isActive
                                                ? "border-[#FF593F] bg-[#FF593F] text-white"
                                                : item.done
                                                    ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                                                    : "border-[#17233B]/15 bg-white text-[#17233B]/70 hover:border-[#17233B]/30"
                                                }`}
                                        >
                                            {item.done && <FiCheck aria-hidden="true" className="size-3.5" />}
                                            {item.nav}
                                        </button>
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

                    <BusinessPagePreview page={draft} className="mt-4" />

                    <p className="mt-4 text-xs leading-6 text-[#17233B]/60">
                        {draft.description && draft.logoUrl && draft.coverImageUrl
                            ? "This is what customers see when they find you."
                            : "It fills in as you go. Nothing is public until you send it to us."}
                    </p>

                    {businessSlug && (
                        <Button
                            render={<Link href={`/businesses/${businessSlug}`} target="_blank" rel="noreferrer" />}
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
                    <div>
                        {!finished && step && (
                            <div className="mb-5">
                                <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">{step.title}</h2>
                                <p className="mt-2 max-w-xl leading-7 text-[#17233B]/65">{step.blurb}</p>
                            </div>
                        )}

                        {finished ? (
                            <FinishedCard businessId={businessId} businessSlug={businessSlug} />
                        ) : step?.id === "logo" ? (
                            <LogoStep
                                businessId={businessId}
                                businessName={businessName}
                                draft={draft}
                                setDraft={setDraft}
                                ours={ours}
                                onDone={() => completed("logo")}
                                onSkip={() => skip("logo")}
                            />
                        ) : step?.id === "description" ? (
                            <DescriptionStep
                                businessId={businessId}
                                draft={draft}
                                setDraft={setDraft}
                                ours={ours}
                                onDone={() => completed("description")}
                            />
                        ) : step?.id === "address" ? (
                            <AddressStep
                                businessId={businessId}
                                cities={cities}
                                location={location}
                                setDraft={setDraft}
                                ours={ours}
                                onDone={() => completed("address")}
                            />
                        ) : step?.id === "hours" ? (
                            <HoursStep businessId={businessId} days={days} onDone={() => completed("hours")} />
                        ) : step?.id === "cover" ? (
                            <CoverStep
                                businessId={businessId}
                                businessName={businessName}
                                draft={draft}
                                setDraft={setDraft}
                                onDone={() => completed("cover")}
                                onSkip={() => skip("cover")}
                            />
                        ) : step?.id === "review" ? (
                            <ReviewStep
                                businessId={businessId}
                                businessName={businessName}
                                businessSlug={businessSlug}
                                missing={missingBeforeReview(live)}
                                sent={step.done || justSent}
                                isLive={isLive}
                                onGo={(id) => go(id)}
                            />
                        ) : step?.id === "offer" ? (
                            <OfferStep businessId={businessId} />
                        ) : null}
                    </div>
                </div>

                {/* On a phone the page they are building comes first: under
                    a long step like the opening hours, nobody scrolls past
                    the form to find it. */}
            </div>
        </main>
    );
}

function FinishedCard({ businessId, businessSlug }: { businessId: string; businessSlug: string | null }) {
    return (
        <div className="rounded-2xl border border-[#17233B]/10 bg-white p-6 shadow-sm sm:p-8">
            <span className="flex size-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
                <FiCheck aria-hidden="true" className="size-6" />
            </span>

            <h2 className="mt-5 text-xl font-semibold">Nothing left to do</h2>

            <p className="mt-3 leading-7 text-[#17233B]/65">
                We&apos;ll email you the moment your page is approved. In the meantime your
                dashboard is where your posters, your stamp card and your customers live.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
                <Button render={<Link href={`/business/${businessId}`} />} nativeButton={false} size="lg">
                    Go to your dashboard
                    <FiArrowRight aria-hidden="true" />
                </Button>

                {businessSlug && (
                    <Button
                        render={<Link href={`/businesses/${businessSlug}`} target="_blank" rel="noreferrer" />}
                        nativeButton={false}
                        variant="outline"
                        size="lg"
                    >
                        See your page
                    </Button>
                )}
            </div>
        </div>
    );
}
