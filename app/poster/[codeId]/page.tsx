import { Suspense } from "react";
import type { Metadata } from "next";
import { connection } from "next/server";
import { notFound, redirect } from "next/navigation";

import { qrLink, qrSvg } from "@/lib/qr";
import { requestOrigin } from "@/lib/request-origin";
import { createClient } from "@/utils/supabase/server";
import { QrPoster } from "@/components/qr-poster";
import { PrintToolbar } from "./print-toolbar";
import { posterSize, sheetSize } from "@/lib/poster-sizes";

export const metadata: Metadata = {
    title: "QR poster",
    robots: { index: false, follow: false },
};

type PageProps = {
    params: Promise<{ codeId: string }>;
    searchParams: Promise<{ size?: string }>;
};

function todayIso() {
    return new Date().toISOString().slice(0, 10);
}

async function Poster({ params, searchParams }: PageProps) {
    await connection();

    const [{ codeId }, { size: sizeParam }] = await Promise.all([params, searchParams]);
    const size = posterSize(sizeParam);
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
                id, code, label, offer_id, loyalty_program_id, business_id, poster_colour, poster_layout, poster_header, poster_accent,
                poster_eyebrow, poster_headline, poster_description,
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
            .select("title, discount, description")
            .eq("id", qr.offer_id)
            .eq("business_id", qr.business_id)
            .eq("approval_status", "approved")
            .gte("expires_at", todayIso())
            .is("plan_paused_at", null)
            .limit(1)
        : Promise.resolve({ data: [] as { title: string; discount: string; description: string }[] });

    // The card, when the code opens one. Its words are the poster's:
    // what it takes to fill, and what it is worth.
    const loyaltyQuery = qr.loyalty_program_id
        ? supabase
            .from("loyalty_programs")
            .select("stamps_required, reward, terms, card_colour, card_header, card_accent, stamp_icon")
            .eq("id", qr.loyalty_program_id)
            .eq("is_active", true)
            .is("closed_at", null)
            .maybeSingle()
        : Promise.resolve({ data: null });

    const [{ data: offers }, { data: loyalty }, origin] = await Promise.all([
        offerQuery,
        loyaltyQuery,
        requestOrigin(),
    ]);
    const offer = offers?.[0] ?? null;
    const link = qrLink(origin, qr.code);
    const svg = await qrSvg(link);
    const dims = size;
    const sheet = sheetSize(size);
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
                @page { size: ${dims.page}; margin: 0; }

                @media print {
                    html, body {
                        margin: 0;
                        padding: 0;
                        width: ${sheet.width};
                        height: ${sheet.height};
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
                codeId={qr.id}
                size={size.value}
                sizeHrefs={{
                    a4: `/poster/${qr.id}?size=a4`,
                    a5: `/poster/${qr.id}?size=a5`,
                    a5x2: `/poster/${qr.id}?size=a5x2`,
                }}
            />

            {/* Two copies share a landscape sheet, to be cut down the
                middle. On screen they sit side by side with the cut
                line between them; on paper the line is all that is
                added. */}
            <div
                className={`flex justify-center bg-[#E9E4DD] py-10 print:bg-white print:py-0 ${
                    dims.copies > 1 ? "print:flex" : "print:block"
                }`}
            >
                {Array.from({ length: dims.copies }, (_, copy) => (
                    <div
                        key={copy}
                        className={
                            copy > 0 ? "border-l border-dashed border-[#17233B]/30" : undefined
                        }
                    >
                    <QrPoster
                        width={dims.width}
                        height={dims.height}
                        fontSize={16 * dims.scale}
                        businessName={business?.name ?? ""}
                        place={place}
                        logoUrl={business?.logo_url}
                        offer={
                            offer ??
                            (loyalty
                                ? {
                                    discount: `Get ${loyalty.reward.charAt(0).toLowerCase() + loyalty.reward.slice(1)}`,
                                    description: loyalty.terms,
                                }
                                : null)
                        }
                        eyebrowFallback={loyalty ? `Collect ${loyalty.stamps_required} stamps` : null}
                        card={
                            loyalty
                                ? {
                                    stampsRequired: loyalty.stamps_required,
                                    reward: loyalty.reward,
                                    terms: loyalty.terms,
                                    colour: loyalty.card_colour,
                                    header: loyalty.card_header,
                                    accent: loyalty.card_accent,
                                    stampIcon: loyalty.stamp_icon,
                                }
                                : null
                        }
                        caption={
                            loyalty
                                ? "Join free on Promotello and collect a stamp every time you visit."
                                : null
                        }
                        qrMarkup={svg}
                        link={link}
                        colour={qr.poster_colour}
                        headerColour={qr.poster_header}
                        accentColour={qr.poster_accent}
                        layout={qr.poster_layout}
                        eyebrow={qr.poster_eyebrow}
                        headline={qr.poster_headline}
                        detail={qr.poster_description}
                        className="shadow-2xl print:shadow-none"
                    />
                    </div>
                ))}
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
