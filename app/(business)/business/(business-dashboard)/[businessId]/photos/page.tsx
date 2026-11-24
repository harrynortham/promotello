import type { Metadata } from "next";
import { connection } from "next/server";
import { notFound } from "next/navigation";

import { PhotosManager } from "@/components/photos-manager";
import { PhotosHowItWorks } from "./how-it-works";
import { businessHasPro } from "@/lib/billing";
import { photoLimit, type BusinessPhoto } from "@/lib/business-photos";
import { createClient } from "@/utils/supabase/server";

export const metadata: Metadata = { title: "Photos", robots: { index: false } };

type PageProps = { params: Promise<{ businessId: string }> };

export default async function PhotosPage({ params }: PageProps) {
    await connection();

    const { businessId } = await params;
    const supabase = await createClient();

    const { data: business } = await supabase
        .from("businesses")
        .select("id, name")
        .eq("id", businessId)
        .maybeSingle();

    if (!business) notFound();

    // Their own, paused ones included: the dashboard has to show what
    // it is holding, not only what the plan is showing.
    const { data: photos } = await supabase
        .from("business_photos")
        .select("id, storage_path, caption, sort_order, plan_paused_at")
        .eq("business_id", businessId)
        .order("sort_order")
        .order("created_at");

    const hasPro = await businessHasPro(supabase, businessId).catch(() => false);

    return (
        <PhotosManager
            businessId={businessId}
            businessName={business.name}
            photos={(photos ?? []) as BusinessPhoto[]}
            limit={photoLimit(hasPro)}
            hasPro={hasPro}
            howItWorks={<PhotosHowItWorks />}
        />
    );
}
