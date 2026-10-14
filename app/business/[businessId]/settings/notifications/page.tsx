import { Suspense } from "react";
import { connection } from "next/server";
import { notFound, redirect } from "next/navigation";

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
                <div className="h-[500px] animate-pulse rounded-3xl bg-white" />
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