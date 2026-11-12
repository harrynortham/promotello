import { Suspense } from "react";
import type { Metadata } from "next";
import { connection } from "next/server";
import { notFound, redirect } from "next/navigation";

import { qrLink, qrSvg } from "@/lib/qr";
import { requestOrigin } from "@/lib/request-origin";
import { createClient } from "@/utils/supabase/server";
import { QrPoster } from "@/components/qr-poster";
import { PrintToolbar } from "./print-toolbar";
import { copiesOn, isLandscape, posterSize, sheetSize } from "@/lib/poster-sizes";

// Saving a poster as a PDF names the file after the page, so a static
// title gave every poster a business ever printed the same name and a
// dialog asking to overwrite the last one. The title says which poster
// this is: the business, the spot it is for, and the paper.
export async function generateMetadata({ params, searchParams }: PageProps): Promise<Metadata> {
    const robots = { index: false, follow: false };
    const [{ codeId }, { size: sizeParam }] = await Promise.all([params, searchParams]);

    // Who is asking decides what this says, so it is never prerendered.
    // Without this the title is worked out while the shell is being
    // built, and the Supabase client reading a token's expiry is
    // Date.now() during a prerender, which Next refuses.
    await connection();

    const supabase = await createClient();

    // RLS: only this code's own team sees it, and a stranger gets the
    // plain title rather than a business's name.
    const { data: code } = await supabase
        .from("qr_codes")
        .select("code, label, businesses ( name )")
        .eq("id", codeId)
        .maybeSingle();

    // absolute: the site's " | Promotello" suffix would be in the
    // filename too, and a browser has to mangle the pipe.
    if (!code) {
        return { title: { absolute: "QR poster" }, robots };
    }

    const business = Array.isArray(code.businesses) ? code.businesses[0] : code.businesses;
    const paper = posterSize(sizeParam).label;

    // Dashes and brackets only: a browser builds the filename out of
    // this, and a slash or a colon is a filename it has to mangle.
    const title = [business?.name, "QR poster", code.label]
        .filter(Boolean)
        .join(" - ")
        .replace(/[\\/:*?"<>|]+/g, " ")
        .replace(/\s+/g, " ")
        .trim();

    // The code on the end, as the downloaded image carries it: two
    // spots can be called the same thing, and a business saving its
    // second Till poster shouldn't be asked to overwrite its first.
    return { title: { absolute: `${title} (${paper}) - ${code.code}` }, robots };
}

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
    const copies = copiesOn(size);
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
                posterId={qr.id}
            />

            {/* Copies tile the sheet and are cut apart: two A5s down the
                middle, four table cards into quarters, three till
                strips across. On screen they sit in that grid with the
                cut lines between them; on paper the lines are all that
                is added. */}
            <div className="flex justify-center bg-[#E9E4DD] py-10 print:bg-white print:py-0">
                <div
                    className="grid"
                    style={{ gridTemplateColumns: `repeat(${dims.across}, max-content)` }}
                >
                {Array.from({ length: copies }, (_, copy) => (
                    <div
                        key={copy}
                        className={`${copy % dims.across > 0 ? "border-l border-dashed border-[#17233B]/30" : ""} ${
                            copy >= dims.across ? "border-t border-dashed border-[#17233B]/30" : ""
                        }`}
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
                        landscape={isLandscape(size)}
                        className="shadow-2xl print:shadow-none"
                    />
                    </div>
                ))}
                </div>
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
