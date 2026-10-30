import { Suspense } from "react";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { FiCheck } from "react-icons/fi";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
    CURRENT_SUBSCRIPTION_STATUSES,
    FOUNDING_MEMBER_LIMIT,
    FREE_LIVE_OFFER_LIMIT,
    TRIAL_DAYS,
    countFoundingMembers,
    planKeyForPriceId,
    plans,
    tierForPlan,
    type PlanKey,
} from "@/lib/billing";
import { planAdds } from "@/lib/plan-features";
import { PlanComparison } from "@/components/plan-comparison";
import { company } from "@/lib/legal";
import { createClient } from "@/utils/supabase/server";
import { changePlan, openBillingPortal, startCheckout } from "./actions";
import { SubmitButton } from "@/components/submit-button";

type PageProps = {
    params: Promise<{
        businessId: string;
    }>;
    searchParams: Promise<{
        checkout?: string;
        error?: string;
        changed?: string;
    }>;
};

type Subscription = {
    status: string;
    price_id: string | null;
    current_period_end: string | null;
    cancel_at_period_end: boolean;
    trial_end: string | null;
};

const errorMessages: Record<string, string> = {
    invalid_plan: "That plan isn't available. Please choose another.",
    already_subscribed:
        "This business already has a subscription. Manage it below.",
    founding_full:
        "All founding member places have now been taken. Pro is still available.",
    no_customer: "There's no billing account for this business yet.",
    no_subscription: "There's no subscription to change. Choose a plan below.",
};

const statusLabels: Record<string, string> = {
    trialing: "Free trial",
    active: "Active",
    past_due: "Payment overdue",
    unpaid: "Unpaid",
    paused: "Paused",
};

function formatDate(value: string | null) {
    return value
        ? new Date(value).toLocaleDateString("en-GB", {
              day: "numeric",
              month: "long",
              year: "numeric",
          })
        : null;
}

function LoadingState() {
    return (
        <div>
            <div className="mx-auto max-w-3xl">
                <Skeleton className="h-5 w-40 rounded-md" />
                <Skeleton className="mt-3 h-12 w-64 rounded-md" />
                <Skeleton className="mt-3 h-5 w-96 max-w-full rounded-md" />
                <Skeleton className="mt-10 h-64 w-full rounded-xl" />
            </div>
        </div>
    );
}

async function BillingContent({ params, searchParams }: PageProps) {
    await connection();

    const { businessId } = await params;
    const { checkout, error, changed } = await searchParams;
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login");
    }

    const { data: membership } = await supabase
        .from("business_members")
        .select("role, businesses ( name )")
        .eq("business_id", businessId)
        .eq("user_id", user.id)
        .maybeSingle();

    if (!membership || !["owner", "admin"].includes(membership.role)) {
        redirect(`/business/${businessId}`);
    }

    const business = Array.isArray(membership.businesses)
        ? membership.businesses[0]
        : membership.businesses;

    const [{ data: subscriptions }, { data: customer }] = await Promise.all([
        supabase
            .from("subscriptions")
            .select(
                "status, price_id, current_period_end, cancel_at_period_end, trial_end",
            )
            .eq("business_id", businessId)
            .order("created_at", { ascending: false }),
        supabase
            .from("billing_customers")
            .select("stripe_customer_id")
            .eq("business_id", businessId)
            .maybeSingle(),
    ]);

    const current = (subscriptions as Subscription[] | null)?.find((item) =>
        CURRENT_SUBSCRIPTION_STATUSES.includes(item.status),
    );
    const trialEligible = !subscriptions?.length;

    return (
        <div className="text-[#17233B]">
            <div className="mx-auto max-w-3xl">
                <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#FF593F]">
                        Business settings
                    </p>

                    <h1 className="mt-3 text-4xl font-semibold tracking-tight">
                        Billing
                    </h1>

                    <p className="mt-3 text-[#17233B]/65">
                        Manage the Promotello subscription for {business?.name}.
                    </p>
                </div>

                {error && errorMessages[error] && (
                    <Alert variant="destructive" className="mt-8">
                        <AlertTitle>Something went wrong</AlertTitle>
                        <AlertDescription>{errorMessages[error]}</AlertDescription>
                    </Alert>
                )}

                {checkout === "success" && !current && (
                    <Alert className="mt-8">
                        <AlertTitle>Finishing your sign-up</AlertTitle>
                        <AlertDescription>
                            Stripe has confirmed your details. Your plan will
                            appear here in a few seconds. Refresh the page if it
                            doesn&apos;t.
                        </AlertDescription>
                    </Alert>
                )}

                {changed && (
                    <Alert className="mt-8 border-emerald-200 bg-emerald-50 text-emerald-900">
                        <AlertTitle>Plan changed</AlertTitle>
                        <AlertDescription>
                            You&apos;re moving to {plans[changed as PlanKey]?.name ?? "your new plan"}. Stripe
                            adjusts your next invoice for the difference. It can take a few seconds to show here.
                        </AlertDescription>
                    </Alert>
                )}

                {checkout === "cancelled" && (
                    <Alert className="mt-8">
                        <AlertTitle>Checkout cancelled</AlertTitle>
                        <AlertDescription>
                            You haven&apos;t been charged. Choose a plan whenever
                            you&apos;re ready.
                        </AlertDescription>
                    </Alert>
                )}

                {current ? (
                    <CurrentPlan
                        businessId={businessId}
                        subscription={current}
                    />
                ) : (
                    <PlanOptions
                        businessId={businessId}
                        trialEligible={trialEligible}
                    />
                )}

                {!current && customer && (
                    <form action={openBillingPortal} className="mt-6">
                        <input type="hidden" name="businessId" value={businessId} />
                        <SubmitButton variant="outline" pendingLabel="Opening…">
                            View past invoices
                        </SubmitButton>
                    </form>
                )}
            </div>
        </div>
    );
}

async function CurrentPlan({
    businessId,
    subscription,
}: {
    businessId: string;
    subscription: Subscription;
}) {
    const planKey = await planKeyForPriceId(subscription.price_id);
    const plan = planKey ? plans[planKey] : null;
    const periodEnd = formatDate(subscription.current_period_end);
    const trialEnd = formatDate(subscription.trial_end);

    let detail: string | null = null;

    if (subscription.cancel_at_period_end && periodEnd) {
        detail = `Cancels on ${periodEnd}. You keep access until then.`;
    } else if (subscription.status === "trialing" && trialEnd) {
        detail = `Your free trial ends on ${trialEnd}, when your first payment is taken.`;
    } else if (subscription.status === "active" && periodEnd) {
        detail = `Renews on ${periodEnd}.`;
    } else if (["past_due", "unpaid"].includes(subscription.status)) {
        detail = "Your last payment failed. Update your card to keep your plan.";
    }

    return (
        <>
        <Card className="mt-10 border-[#17233B]/10">
            <CardHeader>
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <CardTitle>{plan?.name ?? "Current plan"}</CardTitle>
                    <Badge variant="outline">
                        {statusLabels[subscription.status] ?? subscription.status}
                    </Badge>
                </div>
            </CardHeader>

            <CardContent className="space-y-6">
                {plan && (
                    <p className="text-3xl font-semibold">
                        {plan.price}
                        <span className="text-base font-normal text-[#17233B]/70">
                            {" "}
                            / {plan.interval}
                        </span>
                    </p>
                )}

                {detail && <p className="text-[#17233B]/70">{detail}</p>}

                {!subscription.cancel_at_period_end && (
                    <ChangePlan businessId={businessId} currentPlan={planKey} />
                )}

                <form action={openBillingPortal}>
                    <input type="hidden" name="businessId" value={businessId} />
                    <SubmitButton
                        pendingLabel="Opening…"
                        className="bg-[#FF593F] text-white hover:bg-[#FF593F]/90"
                    >
                        Manage billing
                    </SubmitButton>
                </form>

                <p className="text-sm text-[#17233B]/70">
                    Update your card, download invoices or cancel in the
                    secure Stripe billing portal. Questions about a payment?
                    Email{" "}
                    <a href={`mailto:${company.supportEmail}`} className="underline underline-offset-4">
                        {company.supportEmail}
                    </a>
                    , or read our{" "}
                    <Link href="/legal/refunds" className="underline underline-offset-4">
                        refund and cancellation policy
                    </Link>
                    .
                </p>
            </CardContent>
        </Card>

        {planKey && <ComparePlans current={tierForPlan(planKey)} />}
        </>
    );
}

function PlusList({ items }: { items: string[] }) {
    return (
        <ul className="space-y-2.5 text-sm">
            {items.map((item) => (
                <li key={item} className="flex gap-2.5">
                    <FiCheck aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-[#FF593F]" />
                    <span>{item}</span>
                </li>
            ))}
        </ul>
    );
}

function ComparePlans({ current }: { current: "free" | "pro" | "growth" }) {
    return (
        <section className="mt-12">
            <h2 className="text-xl font-semibold">Compare plans</h2>
            <p className="mt-2 text-sm text-[#17233B]/65">Everything each plan includes, side by side.</p>
            <div className="mt-5 overflow-x-auto rounded-2xl border border-[#17233B]/10 bg-white">
                <PlanComparison highlight={current === "growth" ? "growth" : "pro"} current={current} />
            </div>
        </section>
    );
}

function ChangePlan({ businessId, currentPlan }: { businessId: string; currentPlan: PlanKey | null }) {
    const isGrowth = currentPlan?.startsWith("growth") ?? false;
    const choices: PlanKey[] = isGrowth
        ? ["pro_monthly", "pro_yearly", currentPlan === "growth_monthly" ? "growth_yearly" : "growth_monthly"]
        : ["growth_monthly", "growth_yearly"];

    return (
        <div className="rounded-xl border border-[#17233B]/10 p-4">
            <p className="font-semibold">{isGrowth ? "Change plan" : "Upgrade to Growth"}</p>
            {!isGrowth && (
                <div className="mt-3">
                    <p className="mb-2 text-sm text-[#17233B]/65">Everything in Pro, plus:</p>
                    <PlusList items={planAdds("growth")} />
                </div>
            )}
            {currentPlan === "pro_founding_monthly" && (
                <p className="mt-2 text-sm text-amber-800">
                    Switching gives up your founding member price, and it can&apos;t be got back.
                </p>
            )}
            <div className="mt-4 flex flex-wrap gap-2">
                {choices.map((key) => (
                    <form key={key} action={changePlan}>
                        <input type="hidden" name="businessId" value={businessId} />
                        <input type="hidden" name="plan" value={key} />
                        <SubmitButton variant="outline" pendingLabel="Switching…">
                            {plans[key].name} · {plans[key].price}/{plans[key].interval}
                        </SubmitButton>
                    </form>
                ))}
            </div>
        </div>
    );
}

function CheckoutButton({
    businessId,
    plan,
    primary,
    children,
}: {
    businessId: string;
    plan: PlanKey;
    primary?: boolean;
    children: React.ReactNode;
}) {
    return (
        <form action={startCheckout}>
            <input type="hidden" name="businessId" value={businessId} />
            <input type="hidden" name="plan" value={plan} />
            <SubmitButton
                pendingLabel="Redirecting…"
                variant={primary ? "default" : "outline"}
                className={primary ? "h-11 w-full text-base" : "w-full"}
            >
                {children}
            </SubmitButton>
        </form>
    );
}

// Pro and Growth side by side: the price, what each adds, and the buttons.
async function PlanOptions({
    businessId,
    trialEligible,
}: {
    businessId: string;
    trialEligible: boolean;
}) {
    const foundingLeft = Math.max(
        FOUNDING_MEMBER_LIMIT - (await countFoundingMembers()),
        0,
    );
    const proMonthly: PlanKey = foundingLeft > 0 ? "pro_founding_monthly" : "pro_monthly";
    const start = trialEligible ? "Start free trial" : "Choose";

    const cards: {
        tier: "pro" | "growth";
        name: string;
        tagline: string;
        monthly: PlanKey;
        yearly: PlanKey;
        plusLabel: string;
    }[] = [
        {
            tier: "pro",
            name: "Pro",
            tagline: "Bring customers back with a loyalty card, followers and review prompts.",
            monthly: proMonthly,
            yearly: "pro_yearly",
            plusLabel: "Everything in Free, plus:",
        },
        {
            tier: "growth",
            name: "Growth",
            tagline: "Everything in Pro, with marketing that runs itself.",
            monthly: "growth_monthly",
            yearly: "growth_yearly",
            plusLabel: "Everything in Pro, plus:",
        },
    ];

    return (
        <div className="mt-10">
            <h2 className="text-xl font-semibold">Choose a plan</h2>

            <p className="mt-2 text-[#17233B]/65">
                You&apos;re on the Free plan: your business page and{" "}
                {FREE_LIVE_OFFER_LIMIT} live offer.{" "}
                {trialEligible
                    ? `Pro and Growth start with a ${TRIAL_DAYS}-day free trial. We'll ask for a card, but won't charge it until the trial ends, and you can cancel any time.`
                    : "Pick a plan to reactivate your subscription."}
            </p>

            <div className="mt-6 grid gap-5 md:grid-cols-2">
                {cards.map((card) => {
                    const monthly = plans[card.monthly];
                    const yearly = plans[card.yearly];
                    const isFounding = card.monthly === "pro_founding_monthly";

                    return (
                        <Card
                            key={card.tier}
                            className={`flex flex-col ${isFounding ? "border-2 border-[#FF593F]" : "border-[#17233B]/10"}`}
                        >
                            <CardHeader>
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <CardTitle className="text-2xl">{card.name}</CardTitle>
                                    {isFounding && (
                                        <Badge variant="outline" className="border-[#FF593F]/30 bg-[#FF593F]/10 text-[#FF593F]">
                                            Founding price
                                        </Badge>
                                    )}
                                </div>
                                <p className="text-sm text-[#17233B]/65">{card.tagline}</p>
                            </CardHeader>

                            <CardContent className="flex flex-1 flex-col gap-5">
                                <div>
                                    <p className="text-4xl font-semibold tracking-tight">
                                        {monthly.price}
                                        <span className="text-base font-normal text-[#17233B]/70"> / month</span>
                                    </p>
                                    {isFounding ? (
                                        <p className="mt-1 text-sm text-[#17233B]/70">
                                            Locked for life. Usually {plans.pro_monthly.price}.{" "}
                                            {foundingLeft} of {FOUNDING_MEMBER_LIMIT} founding places left.
                                        </p>
                                    ) : (
                                        <p className="mt-1 text-sm text-[#17233B]/70">
                                            Or {yearly.price} a year, {yearly.note?.toLowerCase()}.
                                        </p>
                                    )}
                                </div>

                                <div>
                                    <p className="mb-3 text-sm font-medium">{card.plusLabel}</p>
                                    <PlusList items={planAdds(card.tier)} />
                                </div>

                                <div className="mt-auto space-y-2 pt-2">
                                    <CheckoutButton businessId={businessId} plan={card.monthly} primary>
                                        {start} · {monthly.price}/month
                                    </CheckoutButton>
                                    <CheckoutButton businessId={businessId} plan={card.yearly}>
                                        {trialEligible ? "Or start yearly" : "Or choose yearly"} · {yearly.price}/year
                                    </CheckoutButton>
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            <ComparePlans current="free" />
        </div>
    );
}

export default function BillingPage({ params, searchParams }: PageProps) {
    return (
        <Suspense fallback={<LoadingState />}>
            <BillingContent params={params} searchParams={searchParams} />
        </Suspense>
    );
}
