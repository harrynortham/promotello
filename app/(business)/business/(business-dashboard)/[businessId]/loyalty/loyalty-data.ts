import { notFound, redirect } from "next/navigation";

import { businessHasPro } from "@/lib/billing";
import { createClient } from "@/utils/supabase/server";

// Who is asking and what they are allowed to do, for the pages that
// build or change a loyalty card.
export async function loadLoyaltyEditor(businessId: string) {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login?next=/business/dashboard");
    }

    const { data: membership } = await supabase
        .from("business_members")
        .select("role")
        .eq("business_id", businessId)
        .eq("user_id", user.id)
        .maybeSingle();

    if (!membership) {
        notFound();
    }

    const [{ data: business }, hasPro] = await Promise.all([
        supabase
            .from("businesses")
            .select("name, logo_url")
            .eq("id", businessId)
            .maybeSingle(),
        businessHasPro(supabase, businessId),
    ]);

    return {
        supabase,
        canManage: ["owner", "admin"].includes(membership.role),
        businessName: business?.name ?? "Your business",
        businessLogoUrl: business?.logo_url ?? null,
        hasPro,
    };
}
