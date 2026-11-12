import { notFound, redirect } from "next/navigation";

import { businessHasPro } from "@/lib/billing";
import { qrSvg } from "@/lib/qr";
import { requestOrigin } from "@/lib/request-origin";
import { createClient } from "@/utils/supabase/server";

// Everything the poster designer needs, loaded the same way wherever it
// is shown: inline on the QR page for a business making its first code,
// and on /qr/new for one that already has some.
export async function loadDesigner(businessId: string) {
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

    const today = new Date().toISOString().slice(0, 10);

    const [{ data: offers }, { data: business }, { data: loyalty }, { count: codeCount }, hasPro, origin] = await Promise.all([
        supabase
            .from("offers")
            .select("id, title, discount, description, approval_status")
            .eq("business_id", businessId)
            .in("approval_status", ["approved", "pending"])
            .gte("expires_at", today)
            .is("plan_paused_at", null)
            .order("created_at", { ascending: false }),
        supabase
            .from("businesses")
            .select("name, slug, logo_url, approval_status, business_locations ( region, city )")
            .eq("id", businessId)
            .maybeSingle(),
        supabase
            .from("loyalty_programs")
            .select("id, name, stamps_required, reward, terms, card_colour, card_header, card_accent, stamp_icon")
            .eq("business_id", businessId)
            .eq("is_active", true)
            .is("closed_at", null)
            .maybeSingle(),
        supabase
            .from("qr_codes")
            .select("id", { count: "exact", head: true })
            .eq("business_id", businessId)
            .is("archived_at", null),
        businessHasPro(supabase, businessId),
        requestOrigin(),
    ]);

    const location = Array.isArray(business?.business_locations)
        ? business.business_locations[0]
        : business?.business_locations;

    const previewLink = business?.slug ? `${origin}/businesses/${business.slug}` : origin;

    return {
        canManage: ["owner", "admin"].includes(membership.role),
        businessName: business?.name ?? "Your business",
        place: location?.region || location?.city,
        logoUrl: business?.logo_url,
        offers: offers ?? [],
        // The card being handed out: a poster by the till is the
        // strongest thing a business has for it.
        loyalty: loyalty ?? null,
        // A code can only be made once the business is live.
        isLive: business?.approval_status === "approved",
        codeCount: codeCount ?? 0,
        atFreeLimit: !hasPro && (codeCount ?? 0) >= 1,
        previewLink,
        previewSvg: await qrSvg(previewLink),
    };
}
