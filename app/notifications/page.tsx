import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { redirect } from "next/navigation";

import { AppFooter } from "@/components/site/footers";
import { CustomerAppHeader } from "@/components/site/headers";
import { Skeleton } from "@/components/ui/skeleton";
import { createClient } from "@/utils/supabase/server";
import { NotificationList, type NotificationRow } from "./notification-list";

// One list per person, whichever side of the site they came from: a
// customer who also runs a shop has one of these, not two.
//
// It is neither the customer area nor the business dashboard, so it
// takes the shell /account uses — the same header, the same footer —
// without the settings navigation, which belongs to /account alone.

export const metadata: Metadata = {
    title: "Notifications",
    robots: { index: false, follow: false },
};

// A screenful at a time. More is a press of a button, not a page.
const PAGE_SIZE = 30;

function NotificationsLoading() {
    return (
        <div role="status" aria-label="Loading your notifications" className="space-y-3">
            {[1, 2, 3, 4].map((row) => (
                <Skeleton key={row} className="h-24 rounded-xl" />
            ))}
        </div>
    );
}

async function Notifications() {
    await connection();

    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login?next=/notifications");
    }

    // RLS answers "whose": this is already only theirs.
    const [{ data: rows }, { count: businessCount }] = await Promise.all([
        supabase
            .from("notifications")
            .select("id, title, body, href, read_at, created_at, businesses ( name )")
            .order("created_at", { ascending: false })
            // One more than we will show, so "Show more" knows.
            .limit(PAGE_SIZE * 4),
        supabase.from("business_members").select("business_id", { count: "exact", head: true }),
    ]);

    const notifications: NotificationRow[] = (rows ?? []).map((row) => {
        const business = Array.isArray(row.businesses) ? row.businesses[0] : row.businesses;

        return {
            id: row.id,
            title: row.title,
            body: row.body,
            href: row.href,
            readAt: row.read_at,
            createdAt: row.created_at,
            businessName: business?.name ?? null,
        };
    });

    return (
        <NotificationList
            notifications={notifications}
            // Which business a row is about only helps somebody with
            // more than one.
            showBusinessNames={(businessCount ?? 0) > 1}
            pageSize={PAGE_SIZE}
        />
    );
}

export default function NotificationsPage() {
    return (
        <div className="flex min-h-dvh flex-col bg-[#FFF8F0] text-[#17233B]">
            <CustomerAppHeader />

            <div className="flex-1 px-6 py-8 sm:px-10 lg:py-12">
                <div className="mx-auto max-w-3xl">
                    <h1 className="text-3xl font-semibold tracking-tight">Notifications</h1>

                    <p className="mt-3 max-w-2xl text-[#17233B]/65">
                        What has happened with your offers, your vouchers and the
                        businesses you follow. We email you as well &mdash;{" "}
                        <Link
                            href="/account/notifications"
                            className="font-medium text-[#17233B] underline underline-offset-4 hover:text-[#FF593F]"
                        >
                            choose which emails you get
                        </Link>
                        .
                    </p>

                    <div className="mt-8">
                        <Suspense fallback={<NotificationsLoading />}>
                            <Notifications />
                        </Suspense>
                    </div>
                </div>
            </div>

            <AppFooter variant="customer" />
        </div>
    );
}
