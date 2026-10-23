import { Suspense } from "react";
import { connection } from "next/server";

import { businessTier } from "@/lib/billing";
import { createClient } from "@/utils/supabase/server";
import EditOfferForm from "./edit-offer-form";

type PageProps = {
    params: Promise<{
        businessId: string;
        offerId: string;
    }>;
};

function LoadingState() {
    return (
        <main className="min-h-screen bg-[#FFF8F0] px-6 py-16">
            <div className="mx-auto max-w-2xl">
                <div className="h-10 w-64 animate-pulse rounded bg-[#17233B]/10" />
                <div className="mt-8 h-[700px] animate-pulse rounded-3xl bg-white" />
            </div>
        </main>
    );
}

async function EditOfferContent({ params }: PageProps) {
    await connection();

    const { businessId, offerId } = await params;
    const tier = await businessTier(await createClient(), businessId).catch(() => "free");

    return (
        <EditOfferForm
            businessId={businessId}
            offerId={offerId}
            canSchedule={tier === "growth"}
        />
    );
}

export default function EditOfferPage({ params }: PageProps) {
    return (
        <Suspense fallback={<LoadingState />}>
            <EditOfferContent params={params} />
        </Suspense>
    );
}