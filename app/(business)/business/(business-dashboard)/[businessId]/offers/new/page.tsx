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
};

async function NewOfferPageContent({ params }: PageProps) {
    await connection();

    const { businessId } = await params;
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

    if (!(await businessHasPro(supabase, businessId))) {
        const { data: offers } = await supabase
            .from("offers")
            .select("approval_status, expires_at, plan_paused_at")
            .eq("business_id", businessId);

        const liveOffers = (offers ?? []).filter(isLiveOffer).length;

        if (liveOffers >= FREE_LIVE_OFFER_LIMIT) {
            return <OfferLimitReached businessId={businessId} />;
        }
    }

    // New offers default to the business's own category.
    const { data: business } = await supabase
        .from("businesses")
        .select("category_id")
        .eq("id", businessId)
        .maybeSingle();

    return (
        <NewOfferForm
            businessId={businessId}
            defaultCategoryId={business?.category_id ?? null}
            canSchedule={(await businessTier(supabase, businessId).catch(() => "free")) === "growth"}
        />
    );
}

function OfferLimitReached({ businessId }: { businessId: string }) {
    return (
        <div className="flex items-center justify-center text-[#17233B]">
            <Card className="w-full max-w-lg border-[#17233B]/10 text-center">
                <CardContent className="p-8 sm:p-10">
                    <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#FF593F]">
                        Free plan
                    </p>

                    <h1 className="mt-3 text-3xl font-semibold tracking-tight">
                        You&apos;ve reached your live offer limit
                    </h1>

                    <p className="mt-4 leading-7 text-[#17233B]/65">
                        The Free plan includes {FREE_LIVE_OFFER_LIMIT} live
                        offer. Upgrade to Pro for unlimited offers, or wait for
                        your current offer to expire.
                    </p>

                    <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                        <Button
                            render={<Link href={`/business/${businessId}/billing`} />}
                            nativeButton={false}
                            className="bg-[#FF593F] text-white hover:bg-[#FF593F]/90"
                        >
                            Upgrade to Pro
                        </Button>

                        <Button
                            render={<Link href={`/business/${businessId}/offers`} />}
                            nativeButton={false}
                            variant="outline"
                        >
                            Back to promotions
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

function LoadingState() {
    return (
        <div className="mx-auto max-w-3xl">
            <div className="h-8 w-48 animate-pulse rounded bg-slate-200" />
            <div className="mt-6 h-96 animate-pulse rounded-2xl bg-slate-100" />
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