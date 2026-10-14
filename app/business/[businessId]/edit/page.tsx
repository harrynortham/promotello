import { Suspense } from "react";
import { connection } from "next/server";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import EditBusinessForm from "./edit-business-form";

type PageProps = {
    params: Promise<{
        businessId: string;
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

    return <EditBusinessForm businessId={businessId} />;
}

export default function EditBusinessPage({ params }: PageProps) {
    return (
        <Suspense fallback={<LoadingState />}>
            <EditBusinessContent params={params} />
        </Suspense>
    );
}