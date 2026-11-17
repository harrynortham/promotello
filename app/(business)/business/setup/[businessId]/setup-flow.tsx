"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { FiArrowRight, FiCheck } from "react-icons/fi";

import type { PagePreview } from "@/components/business-page-preview";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { SetupShell } from "../setup-shell";
import type { DayValues } from "@/lib/business-hours";
import type { CityOption } from "@/lib/locations";
import {
    firstUnfinished,
    isSetupStepId,
    setupFinished,
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
    type BusinessLocation,
} from "./steps";
import { trackStep } from "./track";

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
    starterOffer,
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
    // The offer from their preview email, where there is one and they have
    // not written their own yet.
    starterOffer: string | null;
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

    const finished = setupFinished(live);
    const active = requested ?? firstUnfinished(live);

    // The page goes to us when it has the three things that make a
    // listing, and nobody presses anything to make that happen
    // (20270123090000_the_queue_fills_itself.sql). A hand-off nobody is
    // told about is worse than the button it replaced, so the step that
    // completes the set says so — once, as it happens, rather than on
    // every screen afterwards.
    const ready = live.every((step) => !step.blocksReview || step.done);
    const wasReady = useRef(ready);
    const [justQueued, setJustQueued] = useState(false);

    useEffect(() => {
        if (ready && !wasReady.current) {
            setJustQueued(true);
        }

        wasReady.current = ready;
    }, [ready]);

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

    // Which step somebody is looking at. A step that is opened and left is
    // the only kind of giving up that leaves no other trace: nothing is
    // saved, so nothing else would ever know it happened.
    const viewed = useRef<SetupStepId | null>(null);

    useEffect(() => {
        if (!active || viewed.current === active) {
            return;
        }

        viewed.current = active;
        trackStep(businessId, active, "step_viewed");
    }, [businessId, active]);

    return (
        <SetupShell
            eyebrow={justClaimed ? `${businessName} is yours` : `Setting up ${businessName}`}
            heading={
                finished
                    ? `That's everything${firstName ? `, ${firstName}` : ""}.`
                    : `Let's finish your page${firstName ? `, ${firstName}` : ""}.`
            }
            blurb={
                finished
                    ? "Your page is with us and your first offer is in. Everything else lives in your dashboard."
                    : "A few quick things and it's ready for customers. You can watch it take shape as you go."
            }
            steps={live}
            active={finished ? null : active}
            onGo={go}
            page={draft}
            pageHref={businessSlug ? `/businesses/${businessSlug}` : null}
            isLive={isLive}
            finishLater={{
                href: `/business/${businessId}`,
                label: finished ? "Go to your dashboard" : "Finish later",
            }}
            stepTitle={finished ? undefined : step?.title}
            stepBlurb={finished ? undefined : step?.blurb}
        >
            {(justQueued || justSent) && !finished && (
                <Alert className="mb-6 border-emerald-200 bg-emerald-50 text-emerald-900">
                    <AlertTitle>
                        {isLive ? `${businessName} is live` : `${businessName} is with us`}
                    </AlertTitle>
                    <AlertDescription>
                        {isLive
                            ? "Customers browsing the directory can find you now."
                            : "That is everything we need. We check every page — usually the same day — and we'll email you when it goes live."}{" "}
                        There is still a little below, and none of it holds that up.
                    </AlertDescription>
                </Alert>
            )}

            {finished ? (
                <FinishedCard businessId={businessId} businessSlug={businessSlug} isLive={isLive} />
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
                    ours={ours}
                    onDone={() => completed("cover")}
                    onSkip={() => skip("cover")}
                />
            ) : step?.id === "offer" ? (
                <OfferStep businessId={businessId} starterOffer={starterOffer} />
            ) : null}
        </SetupShell>
    );
}

// A page we built and they finished goes live the moment they send it
// (straight-live). Telling that business we will email it when the page is
// approved describes a wait that already happened, and the first thing it
// does is make them wait for nothing.
function FinishedCard({
    businessId,
    businessSlug,
    isLive,
}: {
    businessId: string;
    businessSlug: string | null;
    isLive: boolean;
}) {
    return (
        <div className="rounded-2xl border border-[#17233B]/10 bg-white p-6 shadow-sm sm:p-8">
            <span className="flex size-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
                <FiCheck aria-hidden="true" className="size-6" />
            </span>

            <h2 className="mt-5 text-xl font-semibold">
                {isLive ? "Your page is live" : "Nothing left to do"}
            </h2>

            <p className="mt-3 leading-7 text-[#17233B]/65">
                {isLive
                    ? "Customers browsing the directory can find you now. We check your offer before it joins the page — usually the same day — and we'll email you when it does."
                    : "We'll email you the moment your page is approved."}{" "}
                Your dashboard is where your posters, your stamp card and your customers live.
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
