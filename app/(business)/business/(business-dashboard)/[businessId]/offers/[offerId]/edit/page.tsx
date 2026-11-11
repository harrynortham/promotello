import { Suspense } from "react";
import { connection } from "next/server";

import { EditOfferLoading } from "@/components/dashboard-skeletons";
import { businessTier } from "@/lib/billing";
import { createClient } from "@/utils/supabase/server";
import EditOfferForm from "./edit-offer-form";

type PageProps = {
    params: Promise<{
        businessId: string;
        offerId: string;
    }>;
};

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
        <Suspense fallback={<EditOfferLoading />}>
            <EditOfferContent params={params} />
        </Suspense>
    );
}