import { connection } from "next/server";
import { Suspense } from "react";

import {
    Alert,
    AlertDescription,
    AlertTitle,
} from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { createClient } from "@/utils/supabase/server";
import { resolveBillingAlert } from "./actions";

type BillingAlert = {
    id: string;
    type: "refund" | "dispute" | "early_fraud_warning";
    stripe_charge_id: string;
    stripe_subscription_id: string | null;
    amount: number;
    currency: string;
    reason: string | null;
    livemode: boolean;
    resolved_at: string | null;
    created_at: string;
    businesses: { name: string } | { name: string }[] | null;
};

const typeLabels: Record<BillingAlert["type"], string> = {
    refund: "Refund",
    dispute: "Dispute",
    early_fraud_warning: "Early fraud warning",
};

const typeClasses: Record<BillingAlert["type"], string> = {
    refund: "border-slate-200 bg-slate-100 text-slate-700",
    dispute: "border-red-200 bg-red-100 text-red-800",
    early_fraud_warning: "border-amber-200 bg-amber-100 text-amber-800",
};

const typeGuidance: Record<BillingAlert["type"], string> = {
    refund: "The subscription has been re-synced. Check whether the business should keep Pro.",
    dispute:
        "Respond with evidence in Stripe before the deadline, or accept the dispute.",
    early_fraud_warning:
        "The card issuer suspects fraud. Consider refunding the payment and cancelling the subscription in Stripe to avoid a dispute.",
};

function formatAmount(amount: number, currency: string) {
    return new Intl.NumberFormat("en-GB", {
        style: "currency",
        currency: currency.toUpperCase(),
    }).format(amount / 100);
}

function formatDate(value: string) {
    return new Intl.DateTimeFormat("en-GB", {
        dateStyle: "medium",
        timeStyle: "short",
    }).format(new Date(value));
}

function stripePaymentUrl(alert: BillingAlert) {
    const mode = alert.livemode ? "" : "test/";
    return `https://dashboard.stripe.com/${mode}payments/${alert.stripe_charge_id}`;
}

function LoadingState() {
    return (
        <div>
            <Skeleton className="h-9 w-36 rounded-md" />
            <Skeleton className="mt-8 h-12 w-64 rounded-md" />
            <div className="mt-10 space-y-4">
                {[1, 2, 3].map((item) => (
                    <Skeleton key={item} className="h-36 w-full rounded-xl" />
                ))}
            </div>
        </div>
    );
}

async function BillingAlertsContent() {
    await connection();

    const supabase = await createClient();

    const { data, error } = await supabase
        .from("billing_alerts")
        .select(
            `
        id,
        type,
        stripe_charge_id,
        stripe_subscription_id,
        amount,
        currency,
        reason,
        livemode,
        resolved_at,
        created_at,
        businesses (
          name
        )
      `,
        )
        .order("resolved_at", { ascending: false, nullsFirst: true })
        .order("created_at", { ascending: false })
        .limit(100);

    const alerts = (data ?? []) as BillingAlert[];
    const openCount = alerts.filter((alert) => !alert.resolved_at).length;

    return (
        <div>

            <header>
                <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                    Billing alerts
                </h1>

                <p className="mt-3 text-[#17233B]/65">
                    Refunds, disputes and fraud warnings on subscription
                    payments. {openCount} open.
                </p>
            </header>

            {error ? (
                <Alert variant="destructive" className="mt-8">
                    <AlertTitle>Unable to load billing alerts</AlertTitle>

                    <AlertDescription>
                        Please refresh the page and try again.
                    </AlertDescription>
                </Alert>
            ) : alerts.length === 0 ? (
                <Alert className="mt-10 border-[#17233B]/10 bg-white">
                    <AlertTitle>No billing alerts</AlertTitle>

                    <AlertDescription>
                        Refunds, disputes and fraud warnings will appear here.
                    </AlertDescription>
                </Alert>
            ) : (
                <section className="mt-10 space-y-4">
                    {alerts.map((alert) => {
                        const business = Array.isArray(alert.businesses)
                            ? alert.businesses[0]
                            : alert.businesses;

                        return (
                            <Card
                                key={alert.id}
                                className={`border-[#17233B]/10 ${alert.resolved_at ? "opacity-60" : ""}`}
                            >
                                <CardHeader>
                                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                        <div>
                                            <div className="flex flex-wrap items-center gap-2">
                                                <Badge
                                                    variant="outline"
                                                    className={typeClasses[alert.type]}
                                                >
                                                    {typeLabels[alert.type]}
                                                </Badge>

                                                {!alert.livemode && (
                                                    <Badge variant="outline">
                                                        Test mode
                                                    </Badge>
                                                )}

                                                {alert.resolved_at && (
                                                    <Badge variant="outline">
                                                        Resolved
                                                    </Badge>
                                                )}
                                            </div>

                                            <CardTitle className="mt-3 text-xl">
                                                {formatAmount(alert.amount, alert.currency)}
                                                {" · "}
                                                {business?.name ?? "Unknown business"}
                                            </CardTitle>

                                            {alert.reason && (
                                                <p className="mt-1 text-sm capitalize text-[#17233B]/60">
                                                    Reason: {alert.reason.replaceAll("_", " ")}
                                                </p>
                                            )}
                                        </div>

                                        <p className="text-sm text-[#17233B]/55">
                                            {formatDate(alert.created_at)}
                                        </p>
                                    </div>
                                </CardHeader>

                                <CardContent>
                                    <p className="text-sm leading-6 text-[#17233B]/70">
                                        {typeGuidance[alert.type]}
                                    </p>

                                    <div className="mt-5 flex flex-wrap gap-3">
                                        <Button
                                            render={
                                                <a
                                                    href={stripePaymentUrl(alert)}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                />
                                            }
                                            nativeButton={false}
                                            variant="outline"
                                            size="sm"
                                        >
                                            Open in Stripe
                                        </Button>

                                        {!alert.resolved_at && (
                                            <form action={resolveBillingAlert}>
                                                <input
                                                    type="hidden"
                                                    name="alertId"
                                                    value={alert.id}
                                                />
                                                <Button type="submit" size="sm">
                                                    Mark resolved
                                                </Button>
                                            </form>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </section>
            )}
        </div>
    );
}

export default function BillingAlertsPage() {
    return (
        <Suspense fallback={<LoadingState />}>
            <BillingAlertsContent />
        </Suspense>
    );
}
