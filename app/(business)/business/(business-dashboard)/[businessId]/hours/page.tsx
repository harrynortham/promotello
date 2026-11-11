import { Suspense } from "react";
import { connection } from "next/server";
import { notFound, redirect } from "next/navigation";

import { FormPageLoading } from "@/components/dashboard-skeletons";
import { hoursToValues, type HoursRow } from "@/lib/business-hours";
import { createClient } from "@/utils/supabase/server";
import HoursForm from "./hours-form";

type PageProps = {
    params: Promise<{
        businessId: string;
    }>;
    searchParams: Promise<{ from?: string }>;
};


// Just the opening hours, for the "Set your opening hours" setup step.
async function HoursContent({ params, searchParams }: PageProps) {
    await connection();

    const { businessId } = await params;
    // Back to Edit business when that's where they came from, otherwise the overview.
    const fromEdit = (await searchParams).from === "edit";
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login");
    }

    const [{ data: membership }, { data: business }, { data: hours }] = await Promise.all([
        supabase
            .from("business_members")
            .select("role")
            .eq("business_id", businessId)
            .eq("user_id", user.id)
            .single(),
        supabase.from("businesses").select("name").eq("id", businessId).single(),
        supabase
            .from("business_hours")
            .select("day_of_week, is_closed, opens_at, closes_at")
            .eq("business_id", businessId),
    ]);

    if (!membership || !["owner", "admin"].includes(membership.role) || !business) {
        notFound();
    }

    return (
        <HoursForm
            businessId={businessId}
            businessName={business.name}
            initialDays={hoursToValues((hours ?? []) as HoursRow[])}
            isFirstTime={!hours?.length}
            returnTo={fromEdit ? `/business/${businessId}/edit` : undefined}
        />
    );
}

export default function HoursPage({ params, searchParams }: PageProps) {
    return (
        <Suspense fallback={<FormPageLoading back fields={7} eyebrow={false} />}>
            <HoursContent params={params} searchParams={searchParams} />
        </Suspense>
    );
}
