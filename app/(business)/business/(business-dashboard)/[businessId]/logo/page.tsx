import { Suspense } from "react";
import { connection } from "next/server";
import { notFound, redirect } from "next/navigation";

import { Skeleton } from "@/components/ui/skeleton";
import { createClient } from "@/utils/supabase/server";
import LogoForm from "./logo-form";

type PageProps = {
    params: Promise<{
        businessId: string;
    }>;
};

function LoadingState() {
    return (
        <div className="mx-auto max-w-xl">
            <Skeleton className="h-9 w-44 rounded-md" />
            <Skeleton className="mt-8 h-12 w-64 rounded-md" />
            <Skeleton className="mt-10 h-72 w-full rounded-xl" />
        </div>
    );
}

// Just the logo, for the "Add your logo" setup step. Everything else is on /edit.
async function LogoContent({ params }: PageProps) {
    await connection();

    const { businessId } = await params;
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login");
    }

    const [{ data: membership }, { data: business }] = await Promise.all([
        supabase
            .from("business_members")
            .select("role")
            .eq("business_id", businessId)
            .eq("user_id", user.id)
            .single(),
        supabase
            .from("businesses")
            .select("name, logo_url")
            .eq("id", businessId)
            .single(),
    ]);

    if (!membership || !["owner", "admin"].includes(membership.role) || !business) {
        notFound();
    }

    return <LogoForm businessId={businessId} businessName={business.name} logoUrl={business.logo_url} />;
}

export default function LogoPage({ params }: PageProps) {
    return (
        <Suspense fallback={<LoadingState />}>
            <LogoContent params={params} />
        </Suspense>
    );
}
