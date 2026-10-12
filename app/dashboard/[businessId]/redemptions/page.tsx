import { Suspense } from "react";
import { connection } from "next/server";
import { redirect, notFound } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import RedemptionList from "./redemption-list";

type PageProps = {
    params: Promise<{
        businessId: string;
    }>;
};

type Redemption = {
    id: string;
    redemption_code: string;
    redeemed_at: string | null;
    created_at: string;
    offers:
    | {
        title: string;
        business_id: string;
    }
    | {
        title: string;
        business_id: string;
    }[]
    | null;
};

function LoadingState() {
    return (
        <main className="min-h-screen bg-[#FFF8F0] px-6 py-16">
            <div className="mx-auto max-w-4xl">
                <div className="h-10 w-72 animate-pulse rounded bg-[#17233B]/10" />
                <div className="mt-8 h-48 animate-pulse rounded-3xl bg-white" />
            </div>
        </main>
    );
}

async function RedemptionsContent({ params }: PageProps) {
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
        .select("business_id, role")
        .eq("business_id", businessId)
        .eq("user_id", user.id)
        .single();

    if (!membership) {
        notFound();
    }

    const { data: redemptions, error } = await supabase
        .from("offer_redemptions")
        .select(
            `
        id,
        redemption_code,
        redeemed_at,
        created_at,
        offers!inner (
          title,
          business_id
        )
      `,
        )
        .eq("offers.business_id", businessId)
        .order("created_at", { ascending: false });

    if (error) {
        return (
            <main className="min-h-screen bg-[#FFF8F0] px-6 py-16">
                <div className="mx-auto max-w-4xl rounded-3xl bg-white p-8">
                    <p className="text-red-700">
                        We couldn’t load the redemption records.
                    </p>
                </div>
            </main>
        );
    }

    return (
        <RedemptionList
            businessId={businessId}
            initialRedemptions={(redemptions ?? []) as Redemption[]}
        />
    );
}

export default function RedemptionsPage({ params }: PageProps) {
    return (
        <Suspense fallback={<LoadingState />}>
            <RedemptionsContent params={params} />
        </Suspense>
    );
}