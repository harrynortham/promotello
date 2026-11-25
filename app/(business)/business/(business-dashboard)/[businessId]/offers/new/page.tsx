import Link from "next/link";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { Button } from "@/components/ui/button";
import { NewOfferLoading } from "@/components/dashboard-skeletons";
import { Card, CardContent } from "@/components/ui/card";
import {
    FREE_LIVE_OFFER_LIMIT,
    businessHasPro,
    isLiveOffer,
    businessTier,
} from "@/lib/billing";
import { readStarter } from "@/lib/starter";
import { qrTarget, todayInUk } from "@/lib/qr-target";
import { createAdminClient } from "@/utils/supabase/admin";
import { createClient } from "@/utils/supabase/server";
import NewOfferForm from "./new-offer-form";

type PageProps = {
    params: Promise<{
        businessId: string;
    }>;
    searchParams: Promise<{
        created?: string;
        // Arrived from "Use this offer" on the dashboard.
        from?: string;
    }>;
};

async function NewOfferPageContent({ params, searchParams }: PageProps) {
    await connection();

    const [{ businessId }, { created, from }] = await Promise.all([params, searchParams]);
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
        .select("name, logo_url, category_id, categories ( slug, parent:parent_id ( slug ) )")
        .eq("id", businessId)
        .maybeSingle();

    // The trade the offers to start from are picked for. A business
    // filed under a subcategory is still a food and drink business, so
    // the parent's slug is the one that matches: templatesFor() lists by
    // the six top-level trades.
    const filedUnder = Array.isArray(business?.categories)
        ? business?.categories[0]
        : business?.categories;
    const parent = Array.isArray(filedUnder?.parent) ? filedUnder?.parent[0] : filedUnder?.parent;
    const categorySlug = parent?.slug ?? filedUnder?.slug ?? null;

    // The Free plan includes one poster. If it is already spent, the
    // screen after this offer must not tell them to put it on a poster —
    // they cannot. What they can do is point the poster they have at this
    // offer instead, which costs nothing and needs no reprint, so the
    // screen offers that and mentions Pro second.
    const spentPoster = await (async () => {
        if (await businessHasPro(supabase, businessId)) {
            return null;
        }

        const { data: codes } = await supabase
            .from("qr_codes")
            .select(`
                id,
                archived_at,
                former_target,
                offers ( title, approval_status, expires_at, plan_paused_at ),
                loyalty_programs ( name, is_active, closed_at )
            `)
            .eq("business_id", businessId)
            .is("archived_at", null)
            .limit(1);

        const code = (codes ?? [])[0];

        if (!code) {
            return null;
        }

        // PostgREST gives an embedded row either way round depending on
        // the join, the same as the QR page allows for.
        const one = <T,>(value: T | T[] | null | undefined): T | null =>
            Array.isArray(value) ? value[0] ?? null : value ?? null;

        const target = qrTarget(
            {
                former_target: code.former_target,
                offers: one(code.offers),
                loyalty_programs: one(code.loyalty_programs),
            },
            todayInUk(),
            false,
        );

        return { codeId: code.id as string, pointsAt: target.name };
    })();

    // Whether anybody actually follows them. The screen after submitting
    // used to promise "your followers are getting an email about it" to
    // a business that signed up an hour ago and has none — the one
    // moment it should be describing what will really happen.
    //
    // Counted with the admin client, because the only select policy on
    // business_followers is user_id = auth.uid(): a person can see who
    // they follow, and a business cannot see who follows it. Asking
    // through the owner's own client answers 1 when they follow
    // themselves and 0 otherwise, whatever the real number is. Same
    // reason lib/closing-notices.ts and the admin business page use it.
    const { count: followers } = await createAdminClient()
        .from("business_followers")
        .select("user_id", { count: "exact", head: true })
        .eq("business_id", businessId);

    // The line from their preview email, where they followed the button
    // that offers it. Only the title: the type decides what the offer
    // promises, and guessing that from a sentence would put a promise on
    // their page that they never made (docs/LAUNCH-FUNNEL.md).
    const suggestedTitle = from === "email"
        ? (await readStarter(supabase, businessId)).offer
        : null;

    return (
        <NewOfferForm
            businessId={businessId}
            businessName={business?.name ?? "Your business"}
            businessLogoUrl={business?.logo_url ?? null}
            defaultCategoryId={business?.category_id ?? null}
            categorySlug={categorySlug}
            suggestedTitle={suggestedTitle}
            followers={followers ?? 0}
            spentPoster={spentPoster}
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

export default function NewOfferPage(props: PageProps) {
    return (
        <Suspense fallback={<NewOfferLoading />}>
            <NewOfferPageContent {...props} />
        </Suspense>
    );
}