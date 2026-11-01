import { Suspense } from "react";
import type { Metadata } from "next";
import { connection } from "next/server";
import { notFound, redirect } from "next/navigation";

import { qrLink, qrSvg } from "@/lib/qr";
import { requestOrigin } from "@/lib/request-origin";
import { createClient } from "@/utils/supabase/server";
import { QrPoster } from "@/components/qr-poster";
import { PrintToolbar } from "./print-toolbar";

export const metadata: Metadata = {
    title: "QR poster",
    robots: { index: false, follow: false },
};

type PageProps = {
    params: Promise<{ codeId: string }>;
    searchParams: Promise<{ size?: string }>;
};

const sizes = {
    a4: { width: "210mm", height: "297mm", scale: 1 },
    a5: { width: "148mm", height: "210mm", scale: 0.705 },
};

function todayIso() {
    return new Date().toISOString().slice(0, 10);
}

async function Poster({ params, searchParams }: PageProps) {
    await connection();

    const [{ codeId }, { size: sizeParam }] = await Promise.all([params, searchParams]);
    const size = sizeParam === "a5" ? "a5" : "a4";
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login?next=/business/dashboard");
    }

    // RLS only returns codes for businesses this user belongs to.
    const { data: qr } = await supabase
        .from("qr_codes")
        .select(
            `
                id, code, label, offer_id, business_id, poster_colour, poster_eyebrow, poster_headline,
                businesses ( name, logo_url, category, business_locations ( region, city ) )
            `,
        )
        .eq("id", codeId)
        .maybeSingle();

    if (!qr) {
        notFound();
    }

    const business = Array.isArray(qr.businesses) ? qr.businesses[0] : qr.businesses;
    const location = Array.isArray(business?.business_locations)
        ? business.business_locations[0]
        : business?.business_locations;

    // Headline offer: the one the code points at, otherwise the newest live one.
    let offerQuery = supabase
        .from("offers")
        .select("title, discount")
        .eq("business_id", qr.business_id)
        .eq("approval_status", "approved")
        .gte("expires_at", todayIso())
        .is("plan_paused_at", null)
        .order("created_at", { ascending: false })
        .limit(1);

    if (qr.offer_id) {
        offerQuery = offerQuery.eq("id", qr.offer_id);
    }

    const [{ data: offers }, origin] = await Promise.all([offerQuery, requestOrigin()]);
    const offer = offers?.[0] ?? null;
    const link = qrLink(origin, qr.code);
    const svg = await qrSvg(link);
    const dims = sizes[size];
    const place = location?.region || location?.city;

    return (
        <>
            <style>{`@page { size: ${size.toUpperCase()} portrait; margin: 0; } @media print { html, body { background: #fff !important; } }`}</style>

            <PrintToolbar
                backHref={`/business/${qr.business_id}/qr`}
                size={size}
                sizeHrefs={{ a4: `/poster/${qr.id}?size=a4`, a5: `/poster/${qr.id}?size=a5` }}
            />

            <div className="flex justify-center bg-[#E9E4DD] py-10 print:block print:bg-white print:py-0">
                <QrPoster
                    width={dims.width}
                    height={dims.height}
                    fontSize={16 * dims.scale}
                    businessName={business?.name ?? ""}
                    place={place}
                    logoUrl={business?.logo_url}
                    offer={offer}
                    qrMarkup={svg}
                    link={link}
                    colour={qr.poster_colour}
                    eyebrow={qr.poster_eyebrow}
                    headline={qr.poster_headline}
                    className="shadow-2xl print:shadow-none"
                />
            </div>
        </>
    );
}

export default function PosterPage(props: PageProps) {
    return (
        <Suspense fallback={<div className="min-h-screen bg-[#E9E4DD]" />}>
            <Poster {...props} />
        </Suspense>
    );
}
