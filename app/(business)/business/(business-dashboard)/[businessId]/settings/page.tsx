import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { notFound, redirect } from "next/navigation";
import { FiArrowRight, FiBell } from "react-icons/fi";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CardStackLoading } from "@/components/dashboard-skeletons";
import { CURRENT_SUBSCRIPTION_STATUSES } from "@/lib/billing";
import { createClient } from "@/utils/supabase/server";
import { CloseBusiness } from "./close-business";

type PageProps = {
    params: Promise<{ businessId: string }>;
    searchParams: Promise<{ error?: string }>;
};

const errorMessages: Record<string, string> = {
    name: "That didn't match the business name. Nothing has changed.",
    owner: "Only an owner can close a business.",
    already: "That business is already closed.",
    billing: "We couldn't cancel the subscription, so nothing was closed. Please try again, or cancel it on the Billing page first.",
    close: "We couldn't close that business. Please try again.",
};


async function SettingsContent({ params, searchParams }: PageProps) {
    await connection();

    const [{ businessId }, { error }] = await Promise.all([params, searchParams]);
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

    if (!membership || !["owner", "admin"].includes(membership.role)) {
        redirect(`/business/${businessId}`);
    }

    const { data: business } = await supabase
        .from("businesses")
        .select("id, name, closed_at")
        .eq("id", businessId)
        .single();

    if (!business) {
        notFound();
    }

    const isOwner = membership.role === "owner";

    const [{ data: members }, { data: subscription }] = await Promise.all([
        supabase.rpc("get_business_team_members", { requested_business_id: businessId }),
        supabase
            .from("subscriptions")
            .select("status")
            .eq("business_id", businessId)
            .in("status", CURRENT_SUBSCRIPTION_STATUSES)
            .maybeSingle(),
    ]);

    const teammates = ((members ?? []) as { user_id: string; email: string }[])
        .filter((member) => member.user_id !== user.id)
        .map((member) => member.email);

    return (
        <div>
            <h1 className="text-3xl font-semibold tracking-tight">Settings</h1>

            <p className="mt-3 max-w-2xl text-[#17233B]/65">
                Who hears from us when a customer claims something, and what happens to
                {" "}{business.name} if you ever stop. Worth a minute now, so the right
                person is the one being told.
            </p>

            {error && errorMessages[error] && (
                <Alert variant="destructive" className="mt-8">
                    <AlertTitle>Something went wrong</AlertTitle>
                    <AlertDescription>{errorMessages[error]}</AlertDescription>
                </Alert>
            )}

            <Card className="mt-8 rounded-xl border-[#17233B]/10">
                <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex gap-4">
                        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#FF593F]/10 text-[#FF593F]">
                            <FiBell aria-hidden="true" className="size-5" />
                        </span>

                        <div>
                            <h2 className="font-semibold">Notifications</h2>
                            <p className="mt-1 text-sm leading-6 text-[#17233B]/70">
                                Your daily summary, and alerts when an offer is fully claimed
                                or running low.
                            </p>
                        </div>
                    </div>

                    <Button
                        render={<Link href={`/business/${businessId}/settings/notifications`} />}
                        nativeButton={false}
                        variant="outline"
                        className="shrink-0"
                    >
                        Change
                        <FiArrowRight aria-hidden="true" />
                    </Button>
                </CardContent>
            </Card>

            {/* Only an owner, and only for this one business: running several
                means closing one must never read as closing the account. */}
            {isOwner && !business.closed_at && (
                <section className="mt-10 rounded-xl border border-[#FF593F]/30 bg-white p-6">
                    <h2 className="text-lg font-semibold">Close this business</h2>

                    <p className="mt-2 max-w-2xl text-sm leading-6 text-[#17233B]/70">
                        Takes {business.name} off Promotello: it leaves the directory, its
                        offers stop showing and nobody new can join its loyalty card.
                        Nothing is deleted, customers keep what they have collected, and
                        you can reopen it whenever you like. Anything else you run is
                        untouched.
                    </p>

                    <div className="mt-5">
                        <CloseBusiness
                            businessId={businessId}
                            businessName={business.name}
                            teammates={teammates}
                            hasSubscription={Boolean(subscription)}
                        />
                    </div>
                </section>
            )}
        </div>
    );
}

export default function BusinessSettingsPage(props: PageProps) {
    return (
        <Suspense fallback={<CardStackLoading cards={2} eyebrow={false} action={false} />}>
            <SettingsContent {...props} />
        </Suspense>
    );
}
