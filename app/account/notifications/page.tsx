import { Suspense } from "react";
import { connection } from "next/server";
import { redirect } from "next/navigation";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { createClient } from "@/utils/supabase/server";
import NotificationSettingsForm from "./notification-settings-form";

async function NotificationsContent() {
    await connection();

    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login");
    }

    const { data: settings, error } = await supabase
        .from("account_notification_settings")
        .select(
            `
                local_deals_enabled,
                product_updates_enabled,
                feedback_requests_enabled
            `,
        )
        .eq("user_id", user.id)
        .maybeSingle();

    if (error) {
        return (
            <section className="space-y-6">
                <div>
                    <h1 className="text-3xl font-semibold tracking-tight">
                        Notifications
                    </h1>

                    <p className="mt-3 text-muted-foreground">
                        Manage your personal email preferences.
                    </p>
                </div>

                <Alert variant="destructive">
                    <AlertTitle>
                        We couldn’t load your preferences
                    </AlertTitle>

                    <AlertDescription>
                        Please refresh the page and try again.
                    </AlertDescription>
                </Alert>
            </section>
        );
    }

    return (
        <NotificationSettingsForm
            email={user.email ?? ""}
            initialSettings={
                settings ?? {
                    local_deals_enabled: false,
                    product_updates_enabled: false,
                    feedback_requests_enabled: false,
                }
            }
        />
    );
}

function NotificationsLoading() {
    return (
        <section
            role="status"
            aria-label="Loading notification preferences"
            className="space-y-6"
        >
            <Skeleton className="h-10 w-56" />
            <Skeleton className="h-5 w-80 max-w-full" />
            <Skeleton className="h-96 rounded-2xl" />
            <Skeleton className="h-40 rounded-2xl" />
        </section>
    );
}

export default function NotificationsPage() {
    return (
        <Suspense fallback={<NotificationsLoading />}>
            <NotificationsContent />
        </Suspense>
    );
}