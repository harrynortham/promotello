import { Suspense } from "react";
import type { Metadata } from "next";
import { connection } from "next/server";
import { notFound, redirect } from "next/navigation";

import { Skeleton } from "@/components/ui/skeleton";
import { hoursToValues, type HoursRow } from "@/lib/business-hours";
import { getCityOptions } from "@/lib/locations";
import { isSetupStepId, setupSteps, type SetupState } from "@/lib/setup-steps";
import { createClient } from "@/utils/supabase/server";
import { SetupFlow } from "./setup-flow";

export const metadata: Metadata = {
    title: "Finish your page",
    robots: { index: false, follow: false },
};

type PageProps = {
    params: Promise<{ businessId: string }>;
    searchParams: Promise<{ step?: string; welcome?: string; sent?: string }>;
};

function LoadingState() {
    return (
        <main className="min-h-dvh bg-[#FFF8F0] px-6 py-10">
            <div className="mx-auto grid w-full max-w-6xl gap-10 lg:grid-cols-[minmax(0,1fr)_22rem]">
                <div className="space-y-6">
                    <Skeleton className="h-4 w-40 rounded-full" />
                    <Skeleton className="h-10 w-80 max-w-full rounded-lg" />
                    <Skeleton className="h-80 w-full rounded-2xl" />
                </div>
                <Skeleton className="hidden h-96 w-full rounded-2xl lg:block" />
            </div>
        </main>
    );
}

// Setting a page up, one thing at a time, beside a picture of the page it
// is becoming. The dashboard has the same list on a card, but a list is
// not a journey: somebody who has just claimed a page we built them is
// here to finish it, and this is the one screen that only does that.
async function SetupContent({ params, searchParams }: PageProps) {
    await connection();

    const { businessId } = await params;
    const search = await searchParams;
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect(`/login?next=${encodeURIComponent(`/business/setup/${businessId}`)}`);
    }

    const [{ data: membership }, { data: business }] = await Promise.all([
        supabase
            .from("business_members")
            .select("role")
            .eq("business_id", businessId)
            .eq("user_id", user.id)
            .single(),
        supabase
            .from("businesses")
            .select(
                "name, slug, category, description, logo_url, cover_image_url, approval_status, review_requested_at, closed_at, created_by",
            )
            .eq("id", businessId)
            .single(),
    ]);

    if (!membership || !["owner", "admin"].includes(membership.role) || !business) {
        notFound();
    }

    // A closed business has nothing to set up; the dashboard is where it
    // is reopened.
    if (business.closed_at) {
        redirect(`/business/${businessId}`);
    }

    const createdBy = business.created_by;

    const [{ data: location }, { data: hours }, { count: offerCount }, { count: creatorIsMember }, { data: isAdmin }] =
        await Promise.all([
        supabase
            .from("business_locations")
            .select("id, address_line_1, address_line_2, city, region, postal_code")
            .eq("business_id", businessId)
            .order("created_at", { ascending: true })
            .limit(1)
            .maybeSingle(),
        supabase
            .from("business_hours")
            .select("day_of_week, is_closed, opens_at, closes_at")
            .eq("business_id", businessId)
            .order("day_of_week", { ascending: true }),
        supabase
            .from("offers")
            .select("id", { count: "exact", head: true })
            .eq("business_id", businessId),
        supabase
            .from("business_members")
            .select("business_id", { count: "exact", head: true })
            .eq("business_id", businessId)
            .eq("user_id", createdBy ?? "00000000-0000-0000-0000-000000000000"),
        supabase.rpc("is_platform_admin"),
    ]);

    const ours = Boolean(createdBy) && !creatorIsMember;

    const { data: topOffer } = await supabase
        .from("offers")
        .select("discount, title")
        .eq("business_id", businessId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

    const state: SetupState = {
        hasLogo: Boolean(business.logo_url),
        hasDescription: Boolean(business.description?.trim()),
        hasAddress: Boolean(location),
        hasHours: Boolean(hours?.length),
        hasCover: Boolean(business.cover_image_url),
        sentForReview: Boolean(business.review_requested_at) || business.approval_status === "approved",
        hasOffer: Boolean(offerCount),
    };

    // Platform admins build pages in cities that aren't live yet.
    const cities = await getCityOptions({ includeNotLive: isAdmin === true });

    const fullName = typeof user.user_metadata?.full_name === "string" ? user.user_metadata.full_name : "";

    return (
        <SetupFlow
            businessId={businessId}
            businessName={business.name}
            businessSlug={business.slug}
            firstName={fullName.trim().split(/\s+/)[0] || null}
            steps={setupSteps(state)}
            startAt={isSetupStepId(search.step) ? search.step : null}
            justClaimed={search.welcome === "1"}
            justSent={search.sent === "1"}
            cities={cities}
            page={{
                name: business.name,
                category: business.category,
                area: location?.region ?? null,
                city: location?.city ?? null,
                description: business.description,
                logoUrl: business.logo_url,
                coverImageUrl: business.cover_image_url,
                offer: topOffer ? (topOffer.discount ?? topOffer.title) : null,
            }}
            location={location ?? null}
            days={hoursToValues((hours ?? []) as HoursRow[])}
            isLive={business.approval_status === "approved"}
            ours={ours}
        />
    );
}

export default function SetupPage({ params, searchParams }: PageProps) {
    return (
        <Suspense fallback={<LoadingState />}>
            <SetupContent params={params} searchParams={searchParams} />
        </Suspense>
    );
}
