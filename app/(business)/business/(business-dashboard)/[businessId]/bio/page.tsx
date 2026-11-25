import { Suspense } from "react";
import { connection } from "next/server";
import { notFound, redirect } from "next/navigation";

import { FormPageLoading } from "@/components/dashboard-skeletons";
import { arrangement, noticeShowing } from "@/lib/bio-sections";
import { businessHasPro } from "@/lib/billing";
import { openingLabel, type HoursRow } from "@/lib/business-hours";
import { absoluteUrl } from "@/lib/site";
import { socialsOf } from "@/lib/social-links";
import { createClient } from "@/utils/supabase/server";
import { BioManager } from "./bio-manager";

type PageProps = { params: Promise<{ businessId: string }> };

export const metadata = { title: "Your bio link" };

// Arranging the page at /@theirhandle.
//
// Every row says what it will actually put on the page -- "2 offers",
// "Nothing yet" -- because a list of section names tells a business
// nothing about what their link looks like, and this is the only screen
// where the answer matters.

async function BioContent({ params }: PageProps) {
    await connection();

    const { businessId } = await params;
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) redirect("/login");

    const [
        { data: membership },
        { data: business },
        { data: handle },
        { data: sectionRows },
        { data: links },
        { data: offers },
        { data: cards },
        { data: hours },
        { data: photos },
        { data: tapRows },
        hasPro,
    ] = await Promise.all([
        supabase
            .from("business_members")
            .select("role")
            .eq("business_id", businessId)
            .eq("user_id", user.id)
            .single(),
        supabase
            .from("businesses")
            .select(
                `name, phone, whatsapp, website_url, menu_url, booking_url, google_review_url,
                 bio_notice, bio_notice_until,
                 instagram_url, facebook_url, x_url, youtube_url, linkedin_url, tiktok_url,
                 business_locations ( address_line_1, city, postal_code )`,
            )
            .eq("id", businessId)
            .single(),
        supabase
            .from("business_handles")
            .select("handle")
            .eq("business_id", businessId)
            .eq("is_current", true)
            .maybeSingle(),
        supabase
            .from("bio_sections")
            .select("kind, position, enabled")
            .eq("business_id", businessId)
            .order("position"),
        supabase
            .from("bio_links")
            .select("id, label, url")
            .eq("business_id", businessId)
            .order("position"),
        supabase
            .from("offers")
            .select("id")
            .eq("business_id", businessId)
            .eq("approval_status", "approved")
            .is("plan_paused_at", null),
        supabase
            .from("loyalty_programs")
            .select("id, stamps_required, reward")
            .eq("business_id", businessId)
            .eq("is_active", true)
            .is("closed_at", null)
            .limit(1),
        supabase
            .from("business_hours")
            .select("day_of_week, is_closed, opens_at, closes_at")
            .eq("business_id", businessId),
        supabase
            .from("business_photos")
            .select("id")
            .eq("business_id", businessId)
            .is("plan_paused_at", null),
        supabase.rpc("bio_tap_counts", { requested_business_id: businessId, since_days: 30 }),
        businessHasPro(supabase, businessId),
    ]);

    if (!membership || !["owner", "admin"].includes(membership.role) || !business) notFound();
    if (!handle) notFound();

    const card = cards?.[0] ?? null;
    const location = business.business_locations?.[0] ?? null;
    const hourRows = (hours ?? []) as HoursRow[];
    const offerCount = offers?.length ?? 0;
    const photoCount = photos?.length ?? 0;

    const dashboard = `/business/${businessId}`;
    const nothing = "Nothing yet — it stays hidden until there is";

    // What each row will show, in the words they would recognise, and
    // where the thing behind it is edited.
    // `empty` is what the page itself would do with this section: a
    // row with nothing behind it is not drawn out there, so the
    // preview must not draw it either or it is showing a different
    // page from the one they are arranging.
    const noticeNow = noticeShowing(business.bio_notice, business.bio_notice_until);

    const rows: Record<string, { note: string; edit?: string; locked?: string; empty?: boolean }> = {
        notice: {
            note: business.bio_notice?.trim() || "Nothing at the moment",
            empty: !noticeNow,
        },
        offers: {
            note: offerCount
                ? `${offerCount} live, newest 3 shown`
                : "No live offers — it stays hidden until there is one",
            edit: `${dashboard}/offers`,
            empty: offerCount === 0,
        },
        loyalty: {
            note: card ? `${card.stamps_required} stamps for ${card.reward.toLowerCase()}` : nothing,
            edit: `${dashboard}/loyalty`,
            locked: hasPro ? undefined : "A loyalty card comes with Pro",
            empty: !card,
        },
        links: {
            note: links?.length ? `${links.length} of your own` : "None yet — add one below",
            empty: !links?.length,
        },
        booking: {
            note: business.booking_url || nothing,
            edit: `${dashboard}/edit`,
            empty: !business.booking_url,
        },
        menu: {
            note: business.menu_url || nothing,
            edit: `${dashboard}/edit`,
            empty: !business.menu_url,
        },
        hours: {
            note: hourRows.length ? `Shows "${openingLabel(hourRows)}"` : nothing,
            edit: `${dashboard}/hours`,
            empty: hourRows.length === 0,
        },
        find_us: {
            note: location
                ? [location.address_line_1, location.city, location.postal_code]
                      .filter(Boolean)
                      .join(", ")
                : nothing,
            edit: `${dashboard}/address`,
            empty: !location,
        },
        call: {
            note: business.phone || nothing,
            edit: `${dashboard}/edit`,
            empty: !business.phone,
        },
        whatsapp: {
            note: business.whatsapp || "No number yet — add one below",
            empty: !business.whatsapp,
        },
        website: {
            note: business.website_url || nothing,
            edit: `${dashboard}/edit`,
            empty: !business.website_url,
        },
        review: {
            note: business.google_review_url || nothing,
            edit: `${dashboard}/qr`,
            empty: !business.google_review_url,
        },
        photos: {
            note: photoCount ? `${photoCount} photos, first 6 shown` : nothing,
            edit: `${dashboard}/photos`,
            empty: photoCount === 0,
        },
        socials: {
            note: socialsOf(business).length
                ? `${socialsOf(business).length} accounts`
                : nothing,
            edit: `${dashboard}/edit`,
            empty: socialsOf(business).length === 0,
        },
    };

    const taps: Record<string, number> = {};
    for (const row of tapRows ?? []) {
        taps[row.kind] = (taps[row.kind] ?? 0) + Number(row.taps ?? 0);
    }

    return (
        <div className="mx-auto max-w-6xl px-6 py-10 sm:px-10">
            <h1 className="text-2xl font-semibold tracking-tight">Your bio link</h1>
            <p className="mt-2 leading-7 text-[#17233B]/70">
                The one address to put in your Instagram bio. What people tap is counted, so you
                can see what they actually came for.
            </p>

            <div className="mt-8">
                <BioManager
                    businessId={businessId}
                    businessName={business.name}
                    bioUrl={absoluteUrl(`/@${handle.handle}`)}
                    initialSections={arrangement(sectionRows)}
                    rows={rows}
                    links={links ?? []}
                    notice={noticeNow ?? ""}
                    noticeUntil={business.bio_notice_until ?? ""}
                    whatsapp={business.whatsapp ?? ""}
                    taps={taps}
                />
            </div>
        </div>
    );
}

export default function BioPage({ params }: PageProps) {
    return (
        <Suspense fallback={<FormPageLoading back fields={8} eyebrow={false} />}>
            <BioContent params={params} />
        </Suspense>
    );
}
