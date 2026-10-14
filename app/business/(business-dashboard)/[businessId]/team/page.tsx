import { Suspense } from "react";
import { connection } from "next/server";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import TeamManagement from "./team-management";

type PageProps = {
    params: Promise<{
        businessId: string;
    }>;
};

function LoadingState() {
    return (
        <main className="min-h-screen bg-[#FFF8F0] px-6 py-16">
            <div className="mx-auto max-w-4xl">
                <div className="h-10 w-64 animate-pulse rounded bg-[#17233B]/10" />
                <div className="mt-8 h-64 animate-pulse rounded-3xl bg-white" />
            </div>
        </main>
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