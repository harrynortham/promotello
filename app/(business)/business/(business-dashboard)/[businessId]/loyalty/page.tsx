import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { notFound, redirect } from "next/navigation";

import { LoyaltyStamps } from "@/components/loyalty-stamps";
import { SubmitButton } from "@/components/submit-button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { businessHasPro } from "@/lib/billing";
import { createClient } from "@/utils/supabase/server";
import { lookUpLoyaltyCard, saveLoyaltyProgram, setLoyaltyProgramActive } from "./actions";

type PageProps = {
    params: Promise<{ businessId: string }>;
    searchParams: Promise<{ error?: string; saved?: string }>;
};

type Program = {
    id: string;
    stamps_required: number;
    reward: string;
    terms: string | null;
    is_active: boolean;
};

const errorMessages: Record<string, string> = {
    invalid: "Choose between 3 and 20 stamps and describe the reward in 2 to 80 characters.",
    pro: "Loyalty cards are part of Pro. Upgrade to start a stamp card.",
    save: "We couldn't save the loyalty card. Please try again.",
    code: "That doesn't look like a card code. Codes are 10 letters and numbers.",
};

function weekAgo() {
    return new Date(Date.now() - 7 * 86_400_000).toISOString();
}

function LoadingState() {
    return (
        <div>
            <div>
                <Skeleton className="h-10 w-64 rounded-md" />
                <Skeleton className="mt-8 h-64 rounded-2xl" />
            </div>
        </div>
    );
}

function ProgramForm({
    businessId,
    program,
    submitLabel,
}: {
    businessId: string;
    program: Program | null;
    submitLabel: string;
}) {
    return (
        <form action={saveLoyaltyProgram} className="space-y-5">
            <input type="hidden" name="businessId" value={businessId} />
            {program && <input type="hidden" name="programId" value={program.id} />}

            <div className="grid gap-5 sm:grid-cols-[160px_1fr]">
                <div className="space-y-2">
                    <Label htmlFor="stamps-required">Stamps needed</Label>
                    <select
                        id="stamps-required"
                        name="stampsRequired"
                        defaultValue={program?.stamps_required ?? 8}
                        className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                    >
                        {Array.from({ length: 18 }, (_, index) => index + 3).map((count) => (
                            <option key={count} value={count}>
                                {count} stamps
                            </option>
                        ))}
                    </select>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="reward">Reward</Label>
                    <Input
                        id="reward"
                        name="reward"
                        required
                        minLength={2}
                        maxLength={80}
                        defaultValue={program?.reward}
                        placeholder="A free coffee of your choice"
                    />
                </div>
            </div>

            <div className="space-y-2">
                <Label htmlFor="terms">Terms (optional)</Label>
                <Textarea
                    id="terms"
                    name="terms"
                    maxLength={500}
                    rows={3}
                    defaultValue={program?.terms ?? ""}
                    placeholder="One stamp per visit when you spend £3 or more."
                />
            </div>

            <SubmitButton pendingLabel="Saving…" className="bg-[#FF593F] text-white hover:bg-[#FF593F]/90">
                {submitLabel}
            </SubmitButton>
        </form>
    );
}

async function LoyaltyContent({ params, searchParams }: PageProps) {
    await connection();

    const [{ businessId }, { error, saved }] = await Promise.all([params, searchParams]);
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login?next=/business/dashboard");
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

    const canManage = ["owner", "admin"].includes(membership.role);

    const [{ data: programs }, hasPro] = await Promise.all([
        supabase
            .from("loyalty_programs")
            .select("id, stamps_required, reward, terms, is_active")
            .eq("business_id", businessId)
            .order("is_active", { ascending: false })
            .order("created_at", { ascending: false })
            .limit(1),
        businessHasPro(supabase, businessId),
    ]);

    const program = (programs?.[0] ?? null) as Program | null;

    let stats = { members: 0, stampsThisWeek: 0, rewards: 0 };

    if (program) {
        const { data: cards } = await supabase
            .from("loyalty_cards")
            .select("id, rewards_redeemed")
            .eq("program_id", program.id);

        const cardIds = (cards ?? []).map((card) => card.id);
        const { count } = cardIds.length
            ? await supabase
                .from("loyalty_events")
                .select("id", { count: "exact", head: true })
                .in("card_id", cardIds)
                .eq("kind", "stamp")
                .gte("created_at", weekAgo())
            : { count: 0 };

        stats = {
            members: cardIds.length,
            stampsThisWeek: count ?? 0,
            rewards: (cards ?? []).reduce((sum, card) => sum + card.rewards_redeemed, 0),
        };
    }

    return (
        <div className="text-[#17233B]">
            <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#FF593F]">
                    Loyalty card
                </p>
                <h1 className="mt-3 text-4xl font-semibold tracking-tight">
                    Reward your regulars
                </h1>
                <p className="mt-3 max-w-2xl text-[#17233B]/65">
                    A digital stamp card customers keep on their phone. Staff
                    scan the customer&apos;s card to add a stamp, so nobody can
                    stamp their own.
                </p>

                {error && errorMessages[error] && (
                    <Alert variant="destructive" className="mt-8">
                        <AlertTitle>Something went wrong</AlertTitle>
                        <AlertDescription>{errorMessages[error]}</AlertDescription>
                    </Alert>
                )}

                {saved && !error && (
                    <Alert className="mt-8 border-emerald-200 bg-emerald-50 text-emerald-900">
                        <AlertTitle>Loyalty card saved</AlertTitle>
                        <AlertDescription>Customers can join it from your business page.</AlertDescription>
                    </Alert>
                )}

                {!program ? (
                    hasPro ? (
                        canManage ? (
                            <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_320px]">
                                <Card className="border-[#17233B]/10">
                                    <CardHeader>
                                        <CardTitle>Set up your stamp card</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <ProgramForm businessId={businessId} program={null} submitLabel="Start loyalty card" />
                                    </CardContent>
                                </Card>

                                <Card className="h-fit border-[#17233B]/10 bg-[#17233B] text-white">
                                    <CardContent className="p-6">
                                        <p className="text-sm text-white/70">Customers see</p>
                                        <p className="mt-2 text-xl font-semibold">Collect 8 stamps, get your reward</p>
                                        <div className="mt-5">
                                            <LoyaltyStamps stamps={3} required={8} size="sm" />
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        ) : (
                            <p className="mt-8 text-[#17233B]/65">Ask a business owner or admin to set up the loyalty card.</p>
                        )
                    ) : (
                        <Card className="mt-8 border-[#FF593F]/30">
                            <CardContent className="flex flex-col gap-6 p-8 sm:flex-row sm:items-center sm:justify-between">
                                <div>
                                    <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#FF593F]">Pro feature</p>
                                    <h2 className="mt-2 text-2xl font-semibold">Turn first visits into regulars</h2>
                                    <p className="mt-2 max-w-lg text-[#17233B]/65">
                                        Digital stamp cards are included in Pro, with a 30-day free trial.
                                    </p>
                                    <div className="mt-5">
                                        <LoyaltyStamps stamps={5} required={8} size="sm" />
                                    </div>
                                </div>
                                <Button
                                    render={<Link href={`/business/${businessId}/billing`} />}
                                    nativeButton={false}
                                    size="lg"
                                    className="shrink-0 bg-[#FF593F] text-white hover:bg-[#FF593F]/90"
                                >
                                    Start free trial
                                </Button>
                            </CardContent>
                        </Card>
                    )
                ) : (
                    <>
                        <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_340px]">
                            <Card className="border-[#17233B]/10">
                                <CardHeader>
                                    <CardTitle>Stamp a customer&apos;s card</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-sm leading-6 text-[#17233B]/65">
                                        Scan the QR code on the customer&apos;s card with your phone
                                        camera, or type the code shown under it.
                                    </p>

                                    <form action={lookUpLoyaltyCard} className="mt-5 flex gap-2">
                                        <input type="hidden" name="businessId" value={businessId} />
                                        <Input
                                            name="code"
                                            required
                                            placeholder="e.g. 4F8A2C91D0"
                                            aria-label="Card code"
                                            className="font-mono uppercase"
                                            autoComplete="off"
                                        />
                                        <SubmitButton pendingLabel="Finding…">Find card</SubmitButton>
                                    </form>

                                    <dl className="mt-8 grid grid-cols-3 gap-3 text-center">
                                        {[
                                            ["Members", stats.members],
                                            ["Stamps this week", stats.stampsThisWeek],
                                            ["Rewards given", stats.rewards],
                                        ].map(([label, value]) => (
                                            <div key={label} className="rounded-xl bg-[#FFF8F0] px-3 py-4">
                                                <dt className="text-xs text-[#17233B]/70">{label}</dt>
                                                <dd className="mt-1 text-2xl font-semibold">{value}</dd>
                                            </div>
                                        ))}
                                    </dl>
                                </CardContent>
                            </Card>

                            <Card className="h-fit border-[#17233B]/10 bg-[#17233B] text-white">
                                <CardContent className="p-6">
                                    <p className="text-sm text-white/70">
                                        {program.is_active ? "Live on your business page" : "Paused"}
                                    </p>
                                    <p className="mt-2 text-xl font-semibold">
                                        Collect {program.stamps_required} stamps, get {program.reward.charAt(0).toLowerCase() + program.reward.slice(1)}
                                    </p>
                                    <div className="mt-5">
                                        <LoyaltyStamps stamps={Math.min(3, program.stamps_required - 1)} required={program.stamps_required} size="sm" />
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {canManage && (
                            <Card className="mt-6 border-[#17233B]/10">
                                <CardHeader>
                                    <div className="flex flex-wrap items-center justify-between gap-3">
                                        <CardTitle>Card settings</CardTitle>
                                        <form action={setLoyaltyProgramActive}>
                                            <input type="hidden" name="businessId" value={businessId} />
                                            <input type="hidden" name="programId" value={program.id} />
                                            <input type="hidden" name="active" value={String(!program.is_active)} />
                                            <Button type="submit" variant="outline" size="sm">
                                                {program.is_active ? "Pause loyalty card" : "Resume loyalty card"}
                                            </Button>
                                        </form>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <ProgramForm businessId={businessId} program={program} submitLabel="Save changes" />
                                    <p className="mt-4 text-xs text-[#17233B]/70">
                                        Changing the number of stamps applies to everyone&apos;s card straight away.
                                    </p>
                                </CardContent>
                            </Card>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}

export default function LoyaltyPage(props: PageProps) {
    return (
        <Suspense fallback={<LoadingState />}>
            <LoyaltyContent {...props} />
        </Suspense>
    );
}
