import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { notFound, redirect } from "next/navigation";
import { FiGift, FiHeart, FiRefreshCw } from "react-icons/fi";

import { SubmitButton } from "@/components/submit-button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { automationDetails, type AutomationKind } from "@/lib/automations";
import { businessTier } from "@/lib/billing";
import { createClient } from "@/utils/supabase/server";
import { saveAutomation } from "./actions";

type PageProps = {
    params: Promise<{ businessId: string }>;
    searchParams: Promise<{ error?: string; saved?: string }>;
};

type Automation = {
    kind: AutomationKind;
    enabled: boolean;
    reward: string;
    valid_days: number;
    inactive_days: number;
};

const errorMessages: Record<string, string> = {
    invalid: "Describe the reward in 3 to 120 characters, and choose how long it lasts (7 to 90 days).",
    save: "We couldn't save that. Automations need the Growth plan, and only owners and admins can change them.",
};

function thirtyDaysAgo() {
    return new Date(Date.now() - 30 * 86_400_000).toISOString();
}

const icons: Record<AutomationKind, typeof FiHeart> = {
    welcome: FiHeart,
    birthday: FiGift,
    winback: FiRefreshCw,
};

function AutomationCard({
    businessId,
    kind,
    automation,
    stats,
    canUse,
    saved,
}: {
    businessId: string;
    kind: AutomationKind;
    automation: Automation | undefined;
    stats: { issued: number; used: number };
    canUse: boolean;
    saved: boolean;
}) {
    const details = automationDetails[kind];
    const Icon = icons[kind];
    const enabled = automation?.enabled ?? false;

    return (
        <Card id={kind} className="scroll-mt-28 border-[#17233B]/10">
            <CardHeader>
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#FF593F]/10 text-[#FF593F]">
                            <Icon aria-hidden="true" />
                        </span>
                        <div>
                            <CardTitle>{details.title}</CardTitle>
                            <p className="mt-1 text-sm text-[#17233B]/65">{details.description}</p>
                        </div>
                    </div>
                    <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${enabled ? "bg-emerald-100 text-emerald-800" : "bg-[#17233B]/5 text-[#17233B]/70"}`}
                    >
                        {enabled ? "On" : "Off"}
                    </span>
                </div>
            </CardHeader>

            <CardContent>
                {saved && (
                    <p className="mb-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-900">Saved.</p>
                )}

                <form action={saveAutomation} className="space-y-4">
                    <input type="hidden" name="businessId" value={businessId} />
                    <input type="hidden" name="kind" value={kind} />

                    <div className="space-y-2">
                        <Label htmlFor={`${kind}-reward`}>Reward</Label>
                        <Input
                            id={`${kind}-reward`}
                            name="reward"
                            required
                            minLength={3}
                            maxLength={120}
                            defaultValue={automation?.reward ?? details.defaultReward}
                            disabled={!canUse}
                        />
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                            <Label htmlFor={`${kind}-valid`}>Valid for (days)</Label>
                            <Input
                                id={`${kind}-valid`}
                                name="validDays"
                                type="number"
                                min={7}
                                max={90}
                                defaultValue={automation?.valid_days ?? 30}
                                disabled={!canUse}
                            />
                        </div>

                        {kind === "winback" && (
                            <div className="space-y-2">
                                <Label htmlFor="winback-inactive">After no visit for (days)</Label>
                                <Input
                                    id="winback-inactive"
                                    name="inactiveDays"
                                    type="number"
                                    min={30}
                                    max={365}
                                    defaultValue={automation?.inactive_days ?? 60}
                                    disabled={!canUse}
                                />
                            </div>
                        )}
                    </div>

                    <label className="flex items-center gap-3 text-sm font-medium">
                        <input
                            type="checkbox"
                            name="enabled"
                            defaultChecked={enabled}
                            disabled={!canUse}
                            className="size-4 accent-[#FF593F]"
                        />
                        Send this automatically
                    </label>

                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <p className="text-sm text-[#17233B]/70">
                            Last 30 days: {stats.issued} sent · {stats.used} used
                        </p>
                        <SubmitButton pendingLabel="Saving…" variant="outline">
                            Save
                        </SubmitButton>
                    </div>
                </form>
            </CardContent>
        </Card>
    );
}

async function AutomationsContent({ params, searchParams }: PageProps) {
    await connection();

    const [{ businessId }, { error, saved }] = await Promise.all([params, searchParams]);
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login");
    }

    const { data: membership } = await supabase
        .from("business_members")
        .select("role")
        .eq("business_id", businessId)
        .eq("user_id", user.id)
        .maybeSingle();

    if (!membership) {
        notFound();
    }

    const since = thirtyDaysAgo();

    const [tier, { data: automations }, { data: vouchers }] = await Promise.all([
        businessTier(supabase, businessId).catch(() => "free" as const),
        supabase
            .from("business_automations")
            .select("kind, enabled, reward, valid_days, inactive_days")
            .eq("business_id", businessId),
        supabase
            .from("reward_vouchers")
            .select("kind, used_at")
            .eq("business_id", businessId)
            .gte("created_at", since),
    ]);

    const canUse = tier === "growth" && ["owner", "admin"].includes(membership.role);
    const byKind = new Map((automations as Automation[] | null)?.map((row) => [row.kind, row]));
    const statsFor = (kind: AutomationKind) => {
        const rows = (vouchers ?? []).filter((row) => row.kind === kind);
        return { issued: rows.length, used: rows.filter((row) => row.used_at).length };
    };

    return (
        <div className="space-y-8 text-[#17233B]">
            <header>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#FF593F]">Growth</p>
                <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Automations</h1>
                <p className="mt-3 max-w-2xl text-[#17233B]/65">
                    Emails that go to your followers automatically, each with a personal reward they can use
                    once. Staff redeem them by scanning, like any voucher.
                </p>
            </header>

            {tier !== "growth" && (
                <Alert className="border-[#FF593F]/30 bg-[#FF593F]/5">
                    <AlertTitle>Automations are part of Growth</AlertTitle>
                    <AlertDescription>
                        <p>Upgrade to send welcome, birthday and win-back rewards without lifting a finger.</p>
                        <Button
                            render={<Link href={`/business/${businessId}/billing`} />}
                            nativeButton={false}
                            size="sm"
                            className="mt-3"
                        >
                            See Growth
                        </Button>
                    </AlertDescription>
                </Alert>
            )}

            {error && errorMessages[error] && (
                <Alert variant="destructive">
                    <AlertTitle>Not saved</AlertTitle>
                    <AlertDescription>{errorMessages[error]}</AlertDescription>
                </Alert>
            )}

            <div className="space-y-6">
                {(["welcome", "birthday", "winback"] as const).map((kind) => (
                    <AutomationCard
                        key={kind}
                        businessId={businessId}
                        kind={kind}
                        automation={byKind.get(kind)}
                        stats={statsFor(kind)}
                        canUse={canUse}
                        saved={saved === kind}
                    />
                ))}
            </div>

            <p className="text-sm text-[#17233B]/70">
                Only followers who&apos;ve agreed to your emails get these, and every email has an unsubscribe
                link. Rewards are checked once a day, in the morning.
            </p>
        </div>
    );
}

export default function AutomationsPage(props: PageProps) {
    return (
        <Suspense
            fallback={
                <div className="space-y-6">
                    <Skeleton className="h-10 w-64" />
                    <Skeleton className="h-64 rounded-2xl" />
                </div>
            }
        >
            <AutomationsContent {...props} />
        </Suspense>
    );
}
