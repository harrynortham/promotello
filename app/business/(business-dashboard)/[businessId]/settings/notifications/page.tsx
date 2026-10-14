import { Suspense } from "react";
import { connection } from "next/server";
import { notFound, redirect } from "next/navigation";

import { Skeleton } from "@/components/ui/skeleton";
import { createClient } from "@/utils/supabase/server";
import NotificationSettingsForm from "./notification-settings-form";

type PageProps = {
    params: Promise<{
        businessId: string;
    }>;
};

function LoadingState() {
    return (
        <main className="min-h-screen bg-[#FFF8F0] px-6 py-16">
            <div className="mx-auto max-w-2xl">
                <Skeleton className="h-9 w-44 rounded-md" />

                <div className="mt-8">
                    <Skeleton className="h-5 w-40 rounded-md" />
                    <Skeleton className="mt-3 h-12 w-64 rounded-md" />
                    <Skeleton className="mt-3 h-5 w-96 max-w-full rounded-md" />
                </div>

                <div className="mt-10 rounded-xl border border-[#17233B]/10 bg-white p-6 sm:p-10">
                    <Skeleton className="h-7 w-56 rounded-md" />

                    <div className="mt-8 space-y-7">
                        {[1, 2, 3].map((item) => (
                            <div
                                key={item}
                                className="flex items-start justify-between gap-6"
                            >
                                <div className="space-y-3">
                                    <Skeleton className="h-5 w-56 rounded-md" />
                                    <Skeleton className="h-10 w-80 max-w-full rounded-md" />
                                </div>

                                <Skeleton className="h-6 w-11 rounded-full" />
                            </div>
                        ))}

                        <Skeleton className="h-10 w-40 rounded-md" />
                    </div>
                </div>
            </div>
        </main>
    );
}

async function NotificationSettingsContent({
    params,
}: PageProps) {
    await connection();

    const { businessId } = await params;
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
        .select("id, name")
        .eq("id", businessId)
        .single();

    if (!business) {
        notFound();
    }

    const { data: settings } = await supabase
        .from("business_notification_settings")
        .select(
            `
        daily_summary_enabled,
        offer_fully_claimed_enabled,
        low_inventory_enabled,
        low_inventory_threshold
      `,
        )
        .eq("business_id", businessId)
        .maybeSingle();

    return (
        <NotificationSettingsForm
            businessId={businessId}
            businessName={business.name}
            initialSettings={
                settings ?? {
                    daily_summary_enabled: false,
                    offer_fully_claimed_enabled: true,
                    low_inventory_enabled: true,
                    low_inventory_threshold: 10,
                }
            }
        />
    );
}

export default function NotificationSettingsPage({
    params,
}: PageProps) {
    return (
        <Suspense fallback={<LoadingState />}>
            <NotificationSettingsContent params={params} />
        </Suspense>
    );
}