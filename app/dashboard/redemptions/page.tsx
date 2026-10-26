import { Suspense } from "react";
import { connection } from "next/server";
import { redirect } from "next/navigation";

import {
    Alert,
    AlertDescription,
    AlertTitle,
} from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { createClient } from "@/utils/supabase/server";

import RedemptionList from "./redemption-list";
import { getWallet } from "./wallet";

function LoadingState() {
    return (
        <section
            role="status"
            aria-label="Loading your vouchers"
            className="mx-auto max-w-5xl space-y-6"
        >
            <Skeleton className="h-10 w-64" />
            <Skeleton className="h-5 w-80 max-w-full" />

            <div className="grid gap-4 sm:grid-cols-3">
                {[1, 2, 3].map((item) => (
                    <Skeleton
                        key={item}
                        className="h-24 rounded-2xl"
                    />
                ))}
            </div>

            <Skeleton className="h-80 rounded-3xl" />
            <Skeleton className="h-80 rounded-3xl" />
        </section>
    );
}

async function RedemptionsContent() {
    await connection();

    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login");
    }

    const { vouchers, error } = await getWallet(user.id);

    if (error) {
        return (
            <section className="mx-auto max-w-5xl space-y-6">
                <h1 className="text-3xl font-semibold tracking-tight">
                    My vouchers
                </h1>

                <Alert variant="destructive">
                    <AlertTitle>
                        We couldn’t load your vouchers
                    </AlertTitle>

                    <AlertDescription>
                        Please refresh the page and try again.
                    </AlertDescription>
                </Alert>
            </section>
        );
    }

    return (
        <RedemptionList
            redemptions={vouchers}
            today={new Date().toISOString().slice(0, 10)}
        />
    );
}

export default function CustomerRedemptionsPage() {
    return (
        <Suspense fallback={<LoadingState />}>
            <RedemptionsContent />
        </Suspense>
    );
}