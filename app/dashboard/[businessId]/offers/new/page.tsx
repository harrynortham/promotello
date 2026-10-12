import { connection } from "next/server";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { createClient } from "@/utils/supabase/server";
import NewOfferForm from "./new-offer-form";

type PageProps = {
    params: Promise<{
        businessId: string;
    }>;
};

async function NewOfferPageContent({ params }: PageProps) {
    await connection();

    const { businessId } = await params;
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login");
    }

    const { data: membership, error } = await supabase
        .from("business_members")
        .select("role")
        .eq("business_id", businessId)
        .eq("user_id", user.id)
        .maybeSingle();

    if (error || !membership) {
        redirect("/dashboard");
    }

    const allowedRoles = ["owner", "admin"];

    if (!allowedRoles.includes(membership.role)) {
        redirect(`/dashboard/${businessId}/offers`);
    }

    return <NewOfferForm businessId={businessId} />;
}

function LoadingState() {
    return (
        <main className="mx-auto max-w-3xl px-6 py-12">
            <div className="h-8 w-48 animate-pulse rounded bg-slate-200" />
            <div className="mt-6 h-96 animate-pulse rounded-2xl bg-slate-100" />
        </main>
    );
}

export default function NewOfferPage(props: PageProps) {
    return (
        <Suspense fallback={<LoadingState />}>
            <NewOfferPageContent {...props} />
        </Suspense>
    );
}