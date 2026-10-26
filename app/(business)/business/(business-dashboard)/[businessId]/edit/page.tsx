import { Suspense } from "react";
import { connection } from "next/server";
import { notFound, redirect } from "next/navigation";

import { Skeleton } from "@/components/ui/skeleton";
import { createClient } from "@/utils/supabase/server";
import { getCityOptions } from "@/lib/locations";
import EditBusinessForm from "./edit-business-form";

type PageProps = {
    params: Promise<{
        businessId: string;
    }>;
};

function LoadingState() {
    return (
        <div>
            <div className="mx-auto max-w-3xl">
                <Skeleton className="h-9 w-44 rounded-md" />

                <div className="mt-8">
                    <Skeleton className="h-5 w-40 rounded-md" />
                    <Skeleton className="mt-3 h-12 w-64 rounded-md" />
                    <Skeleton className="mt-3 h-5 w-96 max-w-full rounded-md" />
                </div>

                <div className="mt-10 rounded-xl border border-[#17233B]/10 bg-white p-6 sm:p-10">
                    <Skeleton className="h-7 w-56 rounded-md" />

                    <div className="mt-6 space-y-5">
                        <Skeleton className="h-24 w-24 rounded-xl" />
                        <Skeleton className="h-10 w-full rounded-md" />
                        <Skeleton className="h-10 w-full rounded-md" />
                        <Skeleton className="h-28 w-full rounded-md" />
                        <Skeleton className="h-10 w-full rounded-md" />
                        <Skeleton className="h-10 w-full rounded-md" />
                    </div>

                    <Skeleton className="my-8 h-px w-full" />

                    <Skeleton className="h-7 w-48 rounded-md" />

                    <div className="mt-6 space-y-4">
                        {[1, 2, 3, 4].map((item) => (
                            <Skeleton
                                key={item}
                                className="h-16 w-full rounded-xl"
                            />
                        ))}
                    </div>

                    <Skeleton className="mt-8 h-11 w-full rounded-md" />
                </div>
            </div>
        </div>
    );
}

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
        <Suspense fallback={<LoadingState />}>
            <EditBusinessContent params={params} />
        </Suspense>
    );
}