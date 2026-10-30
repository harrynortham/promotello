import { Suspense } from "react";
import { connection } from "next/server";
import { notFound, redirect } from "next/navigation";

import { Skeleton } from "@/components/ui/skeleton";
import { createClient } from "@/utils/supabase/server";
import { BusinessImageForm } from "@/components/business-image-form";

type PageProps = {
    params: Promise<{
        businessId: string;
    }>;
    searchParams: Promise<{ from?: string }>;
};

function LoadingState() {
    return (
        <div>
            <Skeleton className="h-9 w-44 rounded-md" />
            <Skeleton className="mt-8 h-12 w-64 rounded-md" />
            <Skeleton className="mt-10 h-72 w-full rounded-xl" />
        </div>
    );
}

// Just the logo, for the "Add your logo" setup step. Everything else is on /edit.
async function LogoContent({ params, searchParams }: PageProps) {
    await connection();

    const { businessId } = await params;
    // Back to Edit business when that's where they came from, otherwise the overview.
    const fromEdit = (await searchParams).from === "edit";
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

    return (
        <BusinessImageForm
            kind="logo"
            businessId={businessId}
            businessName={business.name}
            imageUrl={business.logo_url}
            returnTo={fromEdit ? `/business/${businessId}/edit` : undefined}
        />
    );
}

export default function LogoPage({ params, searchParams }: PageProps) {
    return (
        <Suspense fallback={<LoadingState />}>
            <LogoContent params={params} searchParams={searchParams} />
        </Suspense>
    );
}
