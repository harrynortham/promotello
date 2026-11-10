import { Suspense } from "react";
import { connection } from "next/server";
import { notFound, redirect } from "next/navigation";

import { Skeleton } from "@/components/ui/skeleton";
import { getCityOptions } from "@/lib/locations";
import { createClient } from "@/utils/supabase/server";
import AddressForm from "./address-form";

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
            <Skeleton className="mt-10 h-96 w-full rounded-xl" />
        </div>
    );
}

// Just the address, for the "Add your address" setup step — the same
// reason the hours and the logo have pages of their own. It also fills a
// hole: the full profile page can only change a location that already
// exists, so a business without one had nowhere to add it.
async function AddressContent({ params }: PageProps) {
    await connection();

    const { businessId } = await params;
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login");
    }

    const [{ data: membership }, { data: business }, { data: location }, { data: isAdmin }] =
        await Promise.all([
            supabase
                .from("business_members")
                .select("role")
                .eq("business_id", businessId)
                .eq("user_id", user.id)
                .single(),
            supabase.from("businesses").select("name").eq("id", businessId).single(),
            supabase
                .from("business_locations")
                .select("id, name, address_line_1, address_line_2, city, region, postal_code")
                .eq("business_id", businessId)
                .order("created_at", { ascending: true })
                .limit(1)
                .maybeSingle(),
            supabase.rpc("is_platform_admin"),
        ]);

    if (!membership || !["owner", "admin"].includes(membership.role) || !business) {
        notFound();
    }

    // A platform admin builds previews in cities that aren't live yet.
    const cities = await getCityOptions({ includeNotLive: isAdmin === true });

    return (
        <AddressForm
            businessId={businessId}
            businessName={business.name}
            cities={cities}
            location={location}
        />
    );
}

export default function AddressPage({ params }: PageProps) {
    return (
        <Suspense fallback={<LoadingState />}>
            <AddressContent params={params} />
        </Suspense>
    );
}
