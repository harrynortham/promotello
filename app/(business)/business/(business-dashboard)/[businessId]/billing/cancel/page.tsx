import Link from "next/link";
import type { Metadata } from "next";
import { connection } from "next/server";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { FiArrowLeft, FiCheck, FiX } from "react-icons/fi";

import { SubmitButton } from "@/components/submit-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PRO_SUBSCRIPTION_STATUSES, plans } from "@/lib/billing";
import { whatStops, whatSurvives, worthKeeping, type Consequence } from "@/lib/plan-loss";
import { loadStanding } from "@/lib/plan-standing";
import { readRepeatVisits, repeatVisitSentence } from "@/lib/repeat-visits";
import { createClient } from "@/utils/supabase/server";

import { changePlan, openBillingPortal } from "../actions";

export const metadata: Metadata = {
    title: "Before you cancel",
    robots: { index: false, follow: false },
};

type PageProps = { params: Promise<{ businessId: string }> };

function Loading() {
    return (
        <div className="space-y-4">
            <Skeleton className="h-10 w-72 rounded-lg" />
            <Skeleton className="h-64 rounded-xl" />
        </div>
    );
}

function Line({ consequence, kind }: { consequence: Consequence; kind: "stops" | "survives" }) {
    return (
        <li className="flex gap-3">
            <span
                className={`mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full ${
                    kind === "stops" ? "bg-[#FF593F]/10 text-[#FF593F]" : "bg-emerald-50 text-emerald-700"
                }`}
            >
                {kind === "stops" ? (
                    <FiX aria-hidden="true" className="size-3.5" />
                ) : (
                    <FiCheck aria-hidden="true" className="size-3.5" />
                )}
            </span>

            <span className="min-w-0">
                <span className="font-semibold">{consequence.heading}</span>
                <span className="mt-0.5 block text-sm leading-6 text-[#17233B]/75">
                    {consequence.body}
                </span>
            </span>
        </li>
    );
}

// What they are about to walk away from, before the Stripe portal takes
// over. We never reimplement cancelling — this stands in front of it,
// says what stops in their own numbers, and gets out of the way.
async function BeforeYouCancel({ params }: PageProps) {
    await connection();

    const { businessId } = await params;
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect(`/login?next=${encodeURIComponent(`/business/${businessId}/billing/cancel`)}`);
    }

    const { data: membership } = await supabase
        .from("business_members")
        .select("role")
        .eq("business_id", businessId)
        .eq("user_id", user.id)
        .maybeSingle();

    // The same people who can open the billing portal, and nobody else.
    if (!membership || !["owner", "admin"].includes(membership.role)) {
        notFound();
    }

    const { data: subscriptions } = await supabase
        .from("subscriptions")
        .select("tier, status, cancel_at_period_end, current_period_end")
        .eq("business_id", businessId)
        .in("status", PRO_SUBSCRIPTION_STATUSES);

    const subscription = subscriptions?.[0];

    // Nothing to cancel: there is no page to show somebody on Free.
    if (!subscription) {
        redirect(`/business/${businessId}/billing`);
    }

    const [standing, report] = await Promise.all([
        loadStanding(supabase, businessId, subscription.tier as "pro" | "growth"),
        supabase
            .rpc("business_repeat_visits", { requested_business_id: businessId, months: 3 })
            .then(({ data }) => readRepeatVisits(data)),
    ]);

    const keeping = worthKeeping(standing);
    const visits = report && report.customers > 0 ? report : null;
    const ends = subscription.current_period_end
        ? new Date(subscription.current_period_end).toLocaleDateString("en-GB", {
              day: "numeric",
              month: "long",
              year: "numeric",
          })
        : null;

    return (
        <div className="text-[#17233B]">
            <Button
                render={<Link href={`/business/${businessId}/billing`} />}
                nativeButton={false}
                variant="ghost"
                size="sm"
                className="-ml-2"
            >
                <FiArrowLeft aria-hidden="true" />
                Billing
            </Button>

            <header className="mt-4">
                <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                    Before you cancel
                </h1>

                {keeping && (
                    <p className="mt-3 max-w-2xl text-lg leading-8">
                        Right now, {keeping}
                    </p>
                )}

                {visits && (
                    <p className="mt-2 max-w-2xl text-[#17233B]/75">{repeatVisitSentence(visits)}</p>
                )}
            </header>

            <div className="mt-8 grid gap-6 lg:grid-cols-2">
                <Card className="border-[#FF593F]/20">
                    <CardContent>
                        <h2 className="text-lg font-semibold">
                            What stops {ends ? `on ${ends}` : "when it ends"}
                        </h2>

                        <ul className="mt-4 space-y-4">
                            {whatStops(standing).map((consequence) => (
                                <Line key={consequence.heading} consequence={consequence} kind="stops" />
                            ))}
                        </ul>
                    </CardContent>
                </Card>

                <Card className="border-[#17233B]/10">
                    <CardContent>
                        <h2 className="text-lg font-semibold">What doesn&apos;t</h2>

                        <ul className="mt-4 space-y-4">
                            {whatSurvives(standing).map((consequence) => (
                                <Line
                                    key={consequence.heading}
                                    consequence={consequence}
                                    kind="survives"
                                />
                            ))}
                        </ul>
                    </CardContent>
                </Card>
            </div>

            {/* Half a plan beats none, and Growth is the one people
                outgrow the need for first. */}
            {standing.tier === "growth" && (
                <Card className="mt-6 border-[#17233B]/10">
                    <CardContent className="flex flex-wrap items-center justify-between gap-4">
                        <div className="min-w-0">
                            <h2 className="font-semibold">
                                If it is the price, there is a smaller one
                            </h2>
                            <p className="mt-1 text-sm text-[#17233B]/75">
                                Pro is {plans.pro_monthly.price} a {plans.pro_monthly.interval}. You
                                keep your offers, your posters, your followers and the review
                                prompts; you lose the automations and the reports.
                            </p>
                        </div>

                        <form action={changePlan}>
                            <input type="hidden" name="businessId" value={businessId} />
                            <input type="hidden" name="plan" value="pro_monthly" />
                            <SubmitButton variant="outline" pendingLabel="Switching…">
                                Switch to Pro
                            </SubmitButton>
                        </form>
                    </CardContent>
                </Card>
            )}

            <div className="mt-8 flex flex-wrap items-center gap-3">
                <Button render={<Link href={`/business/${businessId}/billing`} />} nativeButton={false} size="lg">
                    Keep my plan
                </Button>

                <form action={openBillingPortal}>
                    <input type="hidden" name="businessId" value={businessId} />
                    <SubmitButton variant="outline" size="lg" pendingLabel="Opening…">
                        Continue to cancel
                    </SubmitButton>
                </form>
            </div>

            <p className="mt-4 max-w-2xl text-sm text-[#17233B]/65">
                Cancelling is done in the Stripe billing portal, and takes effect at the end of
                the period you have already paid for
                {ends ? `, on ${ends}` : ""}. Nothing is deleted, and you can come back whenever
                you like.
            </p>
        </div>
    );
}

export default function CancelPage(props: PageProps) {
    return (
        <Suspense fallback={<Loading />}>
            <BeforeYouCancel {...props} />
        </Suspense>
    );
}
