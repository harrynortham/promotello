import { Suspense } from "react";
import { connection } from "next/server";
import { notFound, redirect } from "next/navigation";

import { Skeleton } from "@/components/ui/skeleton";
import { createClient } from "@/utils/supabase/server";
import TeamManagement from "./team-management";

type PageProps = {
    params: Promise<{
        businessId: string;
    }>;
};

function LoadingState() {
    return (
        <div>
            <div className="mx-auto max-w-4xl">
                <Skeleton className="h-9 w-44 rounded-md" />

                <div className="mt-8">
                    <Skeleton className="h-5 w-40 rounded-md" />
                    <Skeleton className="mt-3 h-12 w-72 rounded-md" />
                    <Skeleton className="mt-3 h-5 w-96 max-w-full rounded-md" />
                </div>

                <div className="mt-10 space-y-8">
                    <div className="rounded-xl border border-[#17233B]/10 bg-white p-6 sm:p-8">
                        <Skeleton className="h-7 w-56 rounded-md" />

                        <div className="mt-6 space-y-5">
                            <Skeleton className="h-10 w-full rounded-md" />
                            <Skeleton className="h-10 w-full rounded-md" />
                            <Skeleton className="h-10 w-40 rounded-md" />
                        </div>
                    </div>

                    <div className="rounded-xl border border-[#17233B]/10 bg-white p-6 sm:p-8">
                        <Skeleton className="h-7 w-48 rounded-md" />

                        <div className="mt-6 space-y-4">
                            {[1, 2, 3].map((item) => (
                                <div
                                    key={item}
                                    className="flex items-center justify-between gap-4 border-b border-[#17233B]/10 pb-4"
                                >
                                    <div className="space-y-2">
                                        <Skeleton className="h-5 w-48 rounded-md" />
                                        <Skeleton className="h-5 w-20 rounded-full" />
                                    </div>

                                    <Skeleton className="h-9 w-28 rounded-md" />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

async function TeamContent({ params }: PageProps) {
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
        .select("role, businesses (id, name)")
        .eq("business_id", businessId)
        .eq("user_id", user.id)
        .single();

    if (!membership || membership.role !== "owner") {
        notFound();
    }

    const { data: members } = await supabase.rpc(
        "get_business_team_members",
        {
            requested_business_id: businessId,
        },
    );

    const { data: isPlatformAdmin } = await supabase.rpc("is_platform_admin");

    const { data: invitations } = await supabase
        .from("business_invitations")
        .select("id, email, role, expires_at, accepted_at, created_at")
        .eq("business_id", businessId)
        .order("created_at", { ascending: false });

    const business = Array.isArray(membership.businesses)
        ? membership.businesses[0]
        : membership.businesses;

    return (
        <TeamManagement
            businessId={businessId}
            businessName={business?.name ?? "Business"}
            suggestHandOver={isPlatformAdmin === true}
            initialMembers={members ?? []}
            initialInvitations={invitations ?? []}
        />
    );
}

export default function TeamPage({ params }: PageProps) {
    return (
        <Suspense fallback={<LoadingState />}>
            <TeamContent params={params} />
        </Suspense>
    );
}