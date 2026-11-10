import { Suspense } from "react";
import { connection } from "next/server";
import { notFound, redirect } from "next/navigation";

import { Skeleton } from "@/components/ui/skeleton";
import { createClient } from "@/utils/supabase/server";
import DescriptionForm from "./description-form";

type PageProps = {
    params: Promise<{
        businessId: string;
    }>;
};

function LoadingState() {
    return (
        <div>
            <Skeleton className="h-9 w-44 rounded-lg" />
            <Skeleton className="mt-8 h-12 w-72 rounded-lg" />
            <Skeleton className="mt-10 h-72 w-full rounded-xl" />
        </div>
    );
}

// Just the description, for the "Describe your business" setup step. The
// business profile page can change everything at once, which is the wrong
// shape for someone working down a list: they came to write two sentences,
// and a page of tabs and fields asks them to decide nine other things
// first.
async function DescriptionContent({ params }: PageProps) {
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
        supabase.from("businesses").select("name, description").eq("id", businessId).single(),
    ]);

    if (!membership || !["owner", "admin"].includes(membership.role) || !business) {
        notFound();
    }

    return (
        <DescriptionForm
            businessId={businessId}
            businessName={business.name}
            initialDescription={business.description ?? ""}
            isFirstTime={!business.description?.trim()}
        />
    );
}

export default function DescriptionPage({ params }: PageProps) {
    return (
        <Suspense fallback={<LoadingState />}>
            <DescriptionContent params={params} />
        </Suspense>
    );
}
