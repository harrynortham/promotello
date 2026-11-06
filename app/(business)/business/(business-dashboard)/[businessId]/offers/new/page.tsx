import Link from "next/link";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
    FREE_LIVE_OFFER_LIMIT,
    businessHasPro,
    isLiveOffer,
    businessTier,
} from "@/lib/billing";
import { createClient } from "@/utils/supabase/server";
import NewOfferForm from "./new-offer-form";

type PageProps = {
    params: Promise<{
        businessId: string;
    }>;
    searchParams: Promise<{
        created?: string;
    }>;
};

async function NewOfferPageContent({ params, searchParams }: PageProps) {
    await connection();

    const [{ businessId }, { created }] = await Promise.all([params, searchParams]);
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login");
    }

    const { data: membership, error } = await supabase
        .from("business_members")
        .select("role")
        .eq("business_id", businessId)
        .eq("user_id", user.id)
        .maybeSingle();

    if (error || !membership) {
        redirect("/business/dashboard");
    }

    const allowedRoles = ["owner", "admin"];

    if (!allowedRoles.includes(membership.role)) {
        redirect(`/business/${businessId}/offers`);
    }

    if (!created && !(await businessHasPro(supabase, businessId))) {
        const { data: offers } = await supabase
            .from("offers")
            .select("approval_status, expires_at, plan_paused_at")
            .eq("business_id", businessId);

        const liveOffers = (offers ?? []).filter(isLiveOffer);

        if (liveOffers.length >= FREE_LIVE_OFFER_LIMIT) {
            // An offer waiting for approval already uses the slot, so say
            // that rather than talking about live offers expiring.
            const awaitingApproval = liveOffers.every(
                (offer) => offer.approval_status === "pending",
            );

            return (
                <OfferLimitReached
                    businessId={businessId}
                    awaitingApproval={awaitingApproval}
                />
            );
        }
    }

    // New offers default to the business's own category; the name and logo
    // are for the live preview card.
    const { data: business } = await supabase
        .from("businesses")
        .select("name, logo_url, cover_image_url, category_id")
        .eq("id", businessId)
        .maybeSingle();

    return (
        <NewOfferForm
            businessId={businessId}
            businessName={business?.name ?? "Your business"}
            businessLogoUrl={business?.logo_url ?? null}
            businessCoverUrl={business?.cover_image_url ?? null}
            defaultCategoryId={business?.category_id ?? null}
            canSchedule={(await businessTier(supabase, businessId).catch(() => "free")) === "growth"}
        />
    );
}

function OfferLimitReached({
    businessId,
    awaitingApproval,
}: {
    businessId: string;
    awaitingApproval: boolean;
}) {
    return (
        <div className="flex items-center justify-center text-[#17233B]">
            <Card className="w-full max-w-lg border-[#17233B]/10 text-center">
                <CardContent className="p-8 sm:p-10">
                    <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#FF593F]">
                        Free plan
                    </p>

                    <h1 className="mt-3 text-3xl font-semibold tracking-tight">
                        {awaitingApproval
                            ? "Your offer slot is in use"
                            : "You've reached your live offer limit"}
                    </h1>

                    <p className="mt-4 leading-7 text-[#17233B]/65">
                        {awaitingApproval
                            ? `The Free plan covers ${FREE_LIVE_OFFER_LIMIT} offer at a time, and the one waiting for approval already counts. Upgrade to Pro for unlimited offers, or delete that offer to write a different one.`
                            : `The Free plan includes ${FREE_LIVE_OFFER_LIMIT} live offer. Upgrade to Pro for unlimited offers, or wait for your current offer to expire.`}
                    </p>

                    <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                        <Button
                            size="lg"
                            render={<Link href={`/business/${businessId}/billing`} />}
                            nativeButton={false}
                            className="bg-[#FF593F] text-white hover:bg-[#FF593F]/90"
                        >
                            Upgrade to Pro
                        </Button>

                        <Button
                            size="lg"
                            render={<Link href={`/business/${businessId}/offers`} />}
                            nativeButton={false}
                            variant="outline"
                        >
                            Back to offers
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

function LoadingState() {
    return (
        <div>
            <div className="h-8 w-48 animate-pulse rounded-lg bg-slate-200" />
            <div className="mt-6 h-96 animate-pulse rounded-xl bg-slate-100" />
        </div>
    );
}

export default function NewOfferPage(props: PageProps) {
    return (
        <Suspense fallback={<LoadingState />}>
            <NewOfferPageContent {...props} />
        </Suspense>
    );
}