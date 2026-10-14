import { Suspense } from "react";
import { connection } from "next/server";
import { redirect } from "next/navigation";

import { createClient } from "@/utils/supabase/server";
import RedemptionList from "./redemption-list";
import { Skeleton } from "@/components/ui/skeleton";

function LoadingState() {
    return (
        <main className="min-h-screen px-6 py-6">
            <div className="mx-auto max-w-4xl">
                <Skeleton className="h-10 w-64 rounded-md" />

                <div className="mt-8 space-y-5">
                    <Skeleton className="h-56 w-full rounded-xl" />
                    <Skeleton className="h-56 w-full rounded-xl" />
                </div>
            </div>
        </main>
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

    const { data: redemptions, error } = await supabase
        .from("offer_redemptions")
        .select(
            `
        id,
        redemption_code,
        redeemed_at,
        used_at,
        offers (
          slug,
          title,
          discount,
          businesses (
            name
          )
        )
      `,
        )
        .eq("user_id", user.id)
        .order("redeemed_at", { ascending: false });

    if (error) {
        return (
            <main className="px-6 py-6 text-[#17233B]">
                <div className="mx-auto max-w-4xl rounded-3xl bg-white p-8">
                    <h1 className="text-2xl font-semibold">
                        My redemptions
                    </h1>

                    <p className="mt-4 text-red-600">
                        We couldn’t load your redemptions. Please try again.
                    </p>
                </div>
            </main>
        );
    }

    return <RedemptionList redemptions={redemptions ?? []} />;
}

export default function CustomerRedemptionsPage() {
    return (
        <Suspense fallback={<LoadingState />}>
            <RedemptionsContent />
        </Suspense>
    );
}