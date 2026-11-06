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
    a4: { width: "210mm", height: "297mm", scale: 1, page: "A4" },
    a5: { width: "148mm", height: "210mm", scale: 0.705, page: "A5" },
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

    // The offer the code opens, if it opens one. A code pointed at the
    // business page carries the business's own words instead, which is
    // what its preview showed when it was made — and it can't go stale
    // behind a window when the offer it borrowed ends.
    const offerQuery = qr.offer_id
        ? supabase
            .from("offers")
            .select("title, discount")
            .eq("id", qr.offer_id)
            .eq("business_id", qr.business_id)
            .eq("approval_status", "approved")
            .gte("expires_at", todayIso())
            .is("plan_paused_at", null)
            .limit(1)
        : Promise.resolve({ data: [] as { title: string; discount: string }[] });

    const [{ data: offers }, origin] = await Promise.all([offerQuery, requestOrigin()]);
    const offer = offers?.[0] ?? null;
    const link = qrLink(origin, qr.code);
    const svg = await qrSvg(link);
    const dims = sizes[size];
    const place = location?.region || location?.city;

    return (
        <>
            {/* Printing is the whole point of this page, so the print
                rules are not an afterthought:

                - print-color-adjust keeps the navy band, the coral pill
                  and the cream paper. Without it the browser drops every
                  background and the poster comes out white.
                - The page box is the poster exactly, with no margin of
                  its own, so nothing is scaled to fit or pushed onto a
                  second sheet.
                - The body's default margin would make the poster wider
                  than the printable area, which is what makes a browser
                  shrink the whole thing. */}
            <style>{`
                @page { size: ${dims.page} portrait; margin: 0; }

                @media print {
                    html, body {
                        margin: 0;
                        padding: 0;
                        width: ${dims.width};
                        height: ${dims.height};
                        background: #fff !important;
                    }

                    body * {
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                }
            `}</style>

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
