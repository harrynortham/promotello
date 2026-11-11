import { Suspense } from "react";
import { connection } from "next/server";
import { notFound, redirect } from "next/navigation";

import { BusinessProfileLoading } from "@/components/dashboard-skeletons";
import { createClient } from "@/utils/supabase/server";
import { getCityOptions } from "@/lib/locations";
import EditBusinessForm from "./edit-business-form";

type PageProps = {
    params: Promise<{
        businessId: string;
    }>;
};

async function EditBusinessContent({ params }: PageProps) {
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
        .single();

    if (!membership || !["owner", "admin"].includes(membership.role)) {
        notFound();
    }

    const { data: isAdmin } = await supabase.rpc("is_platform_admin");
    const cities = await getCityOptions({ includeNotLive: isAdmin === true });

    return <EditBusinessForm businessId={businessId} cities={cities} />;
}

export default function EditBusinessPage({ params }: PageProps) {
    return (
        <Suspense fallback={<BusinessProfileLoading />}>
            <EditBusinessContent params={params} />
        </Suspense>
    );
}