import { Suspense } from "react";
import type { Metadata } from "next";
import Image from "next/image";
import { connection } from "next/server";
import { notFound, redirect } from "next/navigation";

import { qrLink, qrSvg } from "@/lib/qr";
import { requestOrigin } from "@/lib/request-origin";
import { createClient } from "@/utils/supabase/server";
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
                id, code, label, offer_id, business_id,
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
                <article
                    className="relative flex flex-col overflow-hidden bg-[#FFF8F0] text-[#17233B] shadow-2xl print:shadow-none"
                    style={{ width: dims.width, height: dims.height, fontSize: `${16 * dims.scale}px` }}
                >
                    <header className="flex items-center gap-[1em] bg-[#17233B] px-[2.5em] py-[1.8em] text-white">
                        {business?.logo_url && (
                            <Image
                                src={business.logo_url}
                                alt=""
                                width={96}
                                height={96}
                                className="rounded-[0.8em] object-cover"
                                style={{ width: "4.2em", height: "4.2em" }}
                            />
                        )}
                        <div className="min-w-0">
                            <p className="truncate font-semibold" style={{ fontSize: "1.9em", lineHeight: 1.1 }}>
                                {business?.name}
                            </p>
                            {place && <p className="mt-[0.2em] text-white/70" style={{ fontSize: "1.05em" }}>{place}</p>}
                        </div>
                    </header>

                    <div className="flex flex-1 flex-col items-center justify-center px-[2.5em] py-[1.5em] text-center">
                        <p className="rounded-full bg-[#FF593F] px-[1em] py-[0.35em] font-semibold uppercase tracking-[0.12em] text-white" style={{ fontSize: "0.95em" }}>
                            {offer ? "Exclusive offer" : "Scan for offers"}
                        </p>

                        <h1 className="mt-[0.5em] font-semibold tracking-tight" style={{ fontSize: offer ? "5.4em" : "3.8em", lineHeight: 1 }}>
                            {offer ? offer.discount : `See what's on at ${business?.name}`}
                        </h1>

                        {offer && (
                            <p className="mt-[0.5em] max-w-[24em] text-[#17233B]/75" style={{ fontSize: "1.45em", lineHeight: 1.3 }}>
                                {offer.title}
                            </p>
                        )}

                        <div
                            className="mt-[1.6em] rounded-[1.4em] bg-white p-[1em] shadow-[0_0.4em_1.6em_rgba(23,35,59,0.12)] [&>svg]:h-full [&>svg]:w-full"
                            style={{ width: "23em", height: "23em" }}
                            dangerouslySetInnerHTML={{ __html: svg }}
                        />

                        <p className="mt-[1em] font-semibold" style={{ fontSize: "1.5em" }}>
                            Point your phone camera here
                        </p>
                        <p className="mt-[0.3em] text-[#17233B]/70" style={{ fontSize: "1.05em" }}>
                            Claim it free on Promotello, then show your code when you pay.
                        </p>
                    </div>

                    <footer className="flex items-center justify-between border-t border-[#17233B]/10 px-[2.5em] py-[1.2em]">
                        <Image
                            src="/brand/promotello-horizontal-primary.svg"
                            alt="Promotello"
                            width={180}
                            height={48}
                            style={{ width: "9em", height: "auto" }}
                        />
                        <p className="text-[#17233B]/70" style={{ fontSize: "0.95em" }}>
                            {link.replace(/^https?:\/\//, "")}
                        </p>
                    </footer>
                </article>
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
