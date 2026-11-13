import { Suspense } from "react";
import type { Metadata } from "next";
import Image from "next/image";
import { connection } from "next/server";
import { notFound, redirect } from "next/navigation";
import { FiCheck, FiMinus } from "react-icons/fi";

import { LoyaltyCard } from "@/components/loyalty-card";
import { QrPoster } from "@/components/qr-poster";
import { Skeleton } from "@/components/ui/skeleton";
import { plans } from "@/lib/billing";
import { storedImage } from "@/lib/images";
import { planComparison, type Availability } from "@/lib/plan-features";
import { posterAtWidth } from "@/lib/poster-sizes";
import { qrSvg } from "@/lib/qr";
import { readRepeatVisits, repeatVisitSentence } from "@/lib/repeat-visits";
import { requestOrigin } from "@/lib/request-origin";
import {
    cardSheet,
    cover,
    directorySheet,
    EXAMPLE,
    examplesNeeded,
    offerSheet,
    posterSheet,
    priceSheet,
    printableName,
    reportSheet,
    SHEETS,
} from "@/lib/sales-pack";
import { createClient } from "@/utils/supabase/server";

import { PrintToolbar } from "./print-toolbar";

// The offline sales pack: six sheets to leave behind, built from a
// business's own live card, offers and report rather than from a
// mock-up. For a prospect, it is opened on the demo business
// (20270102090000_a_business_only_we_can_see.sql); for somebody already
// paying, it is their own figures, which is the renewal conversation.
//
// Words: lib/sales-pack.ts. Features: planComparison, the same list the
// features and billing pages read. Prices: lib/billing.ts. Nothing here
// is a second copy of something the product already says.

type PageProps = { params: Promise<{ businessId: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const robots = { index: false, follow: false };

    // Who is asking decides whether this renders at all, so it is never
    // prerendered — and the name becomes the PDF's file name.
    await connection();

    const { businessId } = await params;
    const supabase = await createClient();
    const { data: business } = await supabase
        .from("businesses")
        .select("name")
        .eq("id", businessId)
        .maybeSingle();

    return { title: { absolute: printableName(business?.name) }, robots };
}

function Loading() {
    return (
        <main className="mx-auto max-w-[21cm] space-y-6 px-6 py-10">
            <Skeleton className="h-8 w-64 rounded-lg" />
            <Skeleton className="h-96 rounded-2xl" />
        </main>
    );
}

function Sheet({
    number,
    businessName,
    children,
}: {
    number: number;
    businessName: string;
    children: React.ReactNode;
}) {
    const last = number === SHEETS.length;

    return (
        <section
            aria-label={SHEETS[number - 1]}
            className={`mx-auto mt-6 flex max-w-[21cm] flex-col rounded-2xl border border-[#17233B]/10 bg-white p-8 text-[#17233B] shadow-sm first:mt-0 print:mt-0 print:rounded-none print:border-0 print:p-0 print:shadow-none ${
                last ? "" : "print:break-after-page"
            }`}
        >
            <div className="flex-1">{children}</div>

            <footer className="mt-8 flex items-center justify-between border-t border-[#17233B]/10 pt-3 text-[0.7rem] text-[#17233B]/55">
                <span>{businessName} · Promotello</span>
                <span>
                    {number} of {SHEETS.length} · promotello.com
                </span>
            </footer>
        </section>
    );
}

function Eyebrow({ children }: { children: React.ReactNode }) {
    return (
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#FF593F]">
            {children}
        </p>
    );
}

function Step({ number, children }: { number: number; children: React.ReactNode }) {
    return (
        <li className="flex gap-3">
            <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[#FF593F] text-xs font-bold text-white">
                {number}
            </span>
            <span className="leading-6">{children}</span>
        </li>
    );
}

function Aside({ heading, body }: { heading: string; body: string }) {
    return (
        <div className="rounded-xl bg-[#FFF8F0] p-4">
            <h3 className="text-sm font-semibold">{heading}</h3>
            <p className="mt-1 text-sm leading-6 text-[#17233B]/75">{body}</p>
        </div>
    );
}

function Example({ children }: { children: React.ReactNode }) {
    return (
        <p className="mt-3 text-xs font-semibold uppercase tracking-[0.14em] text-[#17233B]/55">
            {children}
        </p>
    );
}

function Has({ value }: { value: Availability }) {
    if (value === true) {
        return (
            <>
                <FiCheck aria-hidden="true" className="mx-auto size-4 text-[#17233B]" />
                <span className="sr-only">Included</span>
            </>
        );
    }

    if (value === false) {
        return (
            <>
                <FiMinus aria-hidden="true" className="mx-auto size-4 text-[#17233B]/30" />
                <span className="sr-only">Not included</span>
            </>
        );
    }

    return <span className="text-sm font-semibold">{value}</span>;
}

// The report, or nothing: a refusal (an admin is not a member) and a
// failure read the same from here, and the sheet has an example to show
// either way.
async function readReport(
    supabase: Awaited<ReturnType<typeof createClient>>,
    businessId: string,
) {
    try {
        const { data } = await supabase.rpc("business_repeat_visits", {
            requested_business_id: businessId,
            months: 3,
        });

        return readRepeatVisits(data);
    } catch {
        return null;
    }
}

async function Pack({ params }: PageProps) {
    await connection();

    const { businessId } = await params;
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect(`/login?next=${encodeURIComponent(`/sales-pack/${businessId}`)}`);
    }

    // Us, or somebody who works there. A paying owner is never shown
    // the link to this (the dashboard shows it to admins only), but a
    // business that finds the address is reading about itself, which is
    // no secret.
    const [{ data: isAdmin }, { data: membership }] = await Promise.all([
        supabase.rpc("is_platform_admin"),
        supabase
            .from("business_members")
            .select("role")
            .eq("business_id", businessId)
            .eq("user_id", user.id)
            .maybeSingle(),
    ]);

    if (!isAdmin && !membership) {
        notFound();
    }

    const today = new Date().toISOString().slice(0, 10);

    const [{ data: business }, { data: program }, { data: offers }, report, origin] =
        await Promise.all([
            supabase
                .from("businesses")
                .select("name, slug, logo_url, description, category, demo_at")
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
                .from("offers")
                .select("title, description, discount, availability, terms")
                .eq("business_id", businessId)
                .eq("approval_status", "approved")
                .gte("expires_at", today)
                .is("plan_paused_at", null)
                .order("created_at", { ascending: false })
                .limit(2),
            // business_repeat_visits() is for the people who work
            // there: an admin reading somebody else's pack is refused,
            // and the sheet shows the example rather than an error.
            readReport(supabase, businessId),
            requestOrigin(),
        ]);

    if (!business) {
        notFound();
    }

    const offer = offers?.[0] ?? null;
    const visits = report && report.customers > 0 ? report : null;
    const example = examplesNeeded({
        hasCard: Boolean(program),
        hasOffer: Boolean(offer),
        hasReport: Boolean(visits),
    });

    // One live code on the pack, on the cover, pointing somewhere that
    // works in a stranger's hand. The demo business is invisible
    // without an admin signed in, so its sheet sends them to the tour
    // instead of to a page they cannot see.
    const seeItWorking =
        business.demo_at || !business.slug
            ? `${origin}/business/demo`
            : `${origin}/businesses/${business.slug}`;

    const qr = await qrSvg(seeItWorking);

    // Every code on the pack has to work in a stranger's hand, so the
    // card's one opens the card where there is a card, and the tour
    // where the business is the demo and invisible without us.
    const cardQr =
        program && !business.demo_at
            ? await qrSvg(`${origin}/loyalty/${program.id}`)
            : qr;

    const logo = storedImage(business.logo_url);

    return (
        <>
            {/* This is a leave-behind, not a sheet for the wall, so it
                has to come off a printer looking like the thing it is
                selling. Browsers drop every background when printing
                unless they are told not to — the box is unticked by
                default in Chrome's dialog — and without this the navy
                blocks, the coral and the card's own colours all come
                out white. Same rule as the QR poster
                (app/poster/[codeId]/page.tsx). */}
            <style>{`
                @media print {
                    html, body { background: #fff !important; }

                    body * {
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                }
            `}</style>

            <PrintToolbar backHref={`/business/${businessId}`} />

            <main className="px-6 py-10 print:p-0">
                {/* 1 — What this does */}
                <Sheet number={1} businessName={business.name}>
                    <header className="flex items-start justify-between gap-6">
                        <div className="flex items-start gap-4">
                            {logo ? (
                                <Image
                                    src={logo}
                                    alt=""
                                    width={64}
                                    height={64}
                                    className="size-16 rounded-xl object-cover"
                                />
                            ) : null}

                            <div>
                                <Eyebrow>{cover.eyebrow}</Eyebrow>
                                <h1 className="mt-1 text-4xl font-semibold tracking-tight">
                                    {business.name}
                                </h1>
                                <p className="mt-1 text-sm text-[#17233B]/65">
                                    {business.category}
                                </p>
                            </div>
                        </div>

                        <div className="shrink-0 text-center">
                            <div
                                className="size-28 [&_svg]:h-full [&_svg]:w-full"
                                dangerouslySetInnerHTML={{ __html: qr }}
                            />
                            <p className="mt-1 w-28 text-[0.65rem] leading-4 text-[#17233B]/65">
                                Scan to see it working
                            </p>
                        </div>
                    </header>

                    <p className="mt-8 text-2xl font-semibold leading-9 tracking-tight">
                        {cover.promise}
                    </p>

                    <div className="mt-8 space-y-6">
                        {cover.points.map((point) => (
                            <div key={point.heading}>
                                <h2 className="text-lg font-semibold">{point.heading}</h2>
                                <p className="mt-1 leading-7 text-[#17233B]/75">{point.body}</p>
                            </div>
                        ))}
                    </div>

                    <p className="mt-8 rounded-xl bg-[#17233B] px-5 py-4 font-medium text-white">
                        {cover.footer}
                    </p>
                </Sheet>

                {/* 2 — The directory */}
                <Sheet number={2} businessName={business.name}>
                    <Eyebrow>{SHEETS[1]}</Eyebrow>
                    <h2 className="mt-1 text-3xl font-semibold tracking-tight">
                        {directorySheet.heading}
                    </h2>
                    <p className="mt-2 leading-7 text-[#17233B]/75">{directorySheet.problem}</p>

                    <div className="mt-6 grid gap-5 sm:grid-cols-2 print:grid-cols-2">
                        {directorySheet.places.map((place) => (
                            <div key={place.heading} className="rounded-xl border border-[#17233B]/10 p-5">
                                <h3 className="font-semibold">{place.heading}</h3>
                                <p className="mt-1 text-sm leading-6 text-[#17233B]/75">
                                    {place.body}
                                </p>
                            </div>
                        ))}
                    </div>

                    {business.slug && !business.demo_at && (
                        <p className="mt-6 rounded-xl bg-[#FFF8F0] px-5 py-4 text-sm">
                            <span className="font-semibold">Your page: </span>
                            promotello.com/businesses/{business.slug}
                        </p>
                    )}

                    <h3 className="mt-8 text-lg font-semibold">And to get people to it</h3>
                    <ul className="mt-3 space-y-2 text-sm">
                        {directorySheet.extras.map((extra) => (
                            <li key={extra} className="flex gap-3 leading-6">
                                <FiCheck aria-hidden="true" className="mt-1 size-4 shrink-0 text-[#FF593F]" />
                                <span>{extra}</span>
                            </li>
                        ))}
                    </ul>
                </Sheet>

                {/* 3 — The poster */}
                <Sheet number={3} businessName={business.name}>
                    <Eyebrow>{SHEETS[2]}</Eyebrow>
                    <h2 className="mt-1 text-3xl font-semibold tracking-tight">
                        {posterSheet.heading}
                    </h2>
                    <p className="mt-2 leading-7 text-[#17233B]/75">{posterSheet.problem}</p>

                    <div className="mt-6 grid gap-8 sm:grid-cols-[1fr_auto] print:grid-cols-[1fr_auto]">
                        <ol className="space-y-3 text-sm">
                            {posterSheet.steps.map((step, index) => (
                                <Step key={step} number={index + 1}>
                                    {step}
                                </Step>
                            ))}
                        </ol>

                        <div className="w-[220px]">
                            {/* The real poster component, at a fifth of
                                A4: what they print is what is on this
                                sheet, drawn by the same code. */}
                            <QrPoster
                                {...posterAtWidth(220)}
                                businessName={business.name}
                                place={business.category}
                                logoUrl={business.logo_url}
                                qrMarkup={qr}
                                link={seeItWorking.replace(/^https?:\/\//, "")}
                                colour={program?.card_colour ?? "navy"}
                                headerColour={program?.card_header}
                                accentColour={program?.card_accent}
                                layout={program ? "stamp_card" : "classic"}
                                card={
                                    program
                                        ? {
                                              stampsRequired: program.stamps_required,
                                              reward: program.reward,
                                              terms: program.terms,
                                              colour: program.card_colour,
                                              header: program.card_header,
                                              accent: program.card_accent,
                                              stampIcon: program.stamp_icon,
                                          }
                                        : {
                                              stampsRequired: EXAMPLE.card.stampsRequired,
                                              reward: EXAMPLE.card.reward,
                                              terms: EXAMPLE.card.terms,
                                              colour: "charcoal",
                                              stampIcon: "coffee",
                                          }
                                }
                                className="shadow-sm"
                            />

                            <p className="mt-3 text-xs leading-5 text-[#17233B]/65">
                                {posterSheet.caption}
                            </p>
                        </div>
                    </div>

                    <div className="mt-8 grid gap-4 sm:grid-cols-3 print:grid-cols-3">
                        {posterSheet.asides.map((aside) => (
                            <Aside key={aside.heading} {...aside} />
                        ))}
                    </div>
                </Sheet>

                {/* 4 — The offers */}
                <Sheet number={4} businessName={business.name}>
                    <Eyebrow>{SHEETS[3]}</Eyebrow>
                    <h2 className="mt-1 text-3xl font-semibold tracking-tight">
                        {offerSheet.heading}
                    </h2>
                    <p className="mt-2 leading-7 text-[#17233B]/75">{offerSheet.problem}</p>

                    <div className="mt-6 grid gap-8 sm:grid-cols-[1fr_auto] print:grid-cols-[1fr_auto]">
                        <ol className="space-y-3 text-sm">
                            {offerSheet.steps.map((step, index) => (
                                <Step key={step} number={index + 1}>
                                    {step}
                                </Step>
                            ))}
                        </ol>

                        <div className="w-full max-w-xs">
                            <div className="rounded-2xl border border-[#17233B]/10 p-5">
                                <p className="text-2xl font-semibold tracking-tight text-[#FF593F]">
                                    {(offer ?? EXAMPLE.offer).discount}
                                </p>
                                <h3 className="mt-2 font-semibold leading-6">
                                    {(offer ?? EXAMPLE.offer).title}
                                </h3>
                                <p className="mt-2 text-sm leading-6 text-[#17233B]/75">
                                    {(offer ?? EXAMPLE.offer).description}
                                </p>
                                <dl className="mt-4 space-y-1 text-xs text-[#17233B]/65">
                                    <div>
                                        <dt className="inline font-semibold">When: </dt>
                                        <dd className="inline">{(offer ?? EXAMPLE.offer).availability}</dd>
                                    </div>
                                    <div>
                                        <dt className="inline font-semibold">Terms: </dt>
                                        <dd className="inline">{(offer ?? EXAMPLE.offer).terms}</dd>
                                    </div>
                                </dl>
                            </div>

                            {example.offer && <Example>{EXAMPLE.label}</Example>}
                        </div>
                    </div>

                    <div className="mt-8 grid gap-4 sm:grid-cols-2 print:grid-cols-2">
                        {offerSheet.asides.map((aside) => (
                            <Aside key={aside.heading} {...aside} />
                        ))}
                    </div>
                </Sheet>

                {/* 5 — The card */}
                <Sheet number={5} businessName={business.name}>
                    <Eyebrow>{SHEETS[4]}</Eyebrow>
                    <h2 className="mt-1 text-3xl font-semibold tracking-tight">
                        {cardSheet.heading}
                    </h2>
                    <p className="mt-2 leading-7 text-[#17233B]/75">{cardSheet.problem}</p>

                    <div className="mt-6 grid gap-8 sm:grid-cols-[1fr_auto] print:grid-cols-[1fr_auto]">
                        <ol className="space-y-3 text-sm">
                            {cardSheet.steps.map((step, index) => (
                                <Step key={step} number={index + 1}>
                                    {step}
                                </Step>
                            ))}
                        </ol>

                        <div className="w-full max-w-xs">
                            {program ? (
                                <LoyaltyCard
                                    businessName={business.name}
                                    logoUrl={business.logo_url}
                                    stampsRequired={program.stamps_required}
                                    reward={program.reward}
                                    stamps={Math.max(1, program.stamps_required - 2)}
                                    terms={program.terms}
                                    colour={program.card_colour}
                                    header={program.card_header}
                                    accent={program.card_accent}
                                    stampIcon={program.stamp_icon}
                                    qr={<span dangerouslySetInnerHTML={{ __html: cardQr }} />}
                                    scanTitle={cardSheet.scanTitle}
                                    scanHint={cardSheet.scanHint}
                                    qrSize="size-24"
                                    className="border-[#17233B]/10"
                                />
                            ) : (
                                <>
                                    <LoyaltyCard
                                        businessName={EXAMPLE.card.businessName}
                                        stampsRequired={EXAMPLE.card.stampsRequired}
                                        reward={EXAMPLE.card.reward}
                                        stamps={EXAMPLE.card.stamps}
                                        terms={EXAMPLE.card.terms}
                                        colour="charcoal"
                                        stampIcon="coffee"
                                        qr={<span dangerouslySetInnerHTML={{ __html: cardQr }} />}
                                        scanTitle={cardSheet.scanTitle}
                                        scanHint={cardSheet.scanHint}
                                        qrSize="size-24"
                                        className="border-[#17233B]/10"
                                    />
                                    <Example>{EXAMPLE.label}</Example>
                                </>
                            )}
                        </div>
                    </div>

                    <div className="mt-8 grid gap-4 sm:grid-cols-3 print:grid-cols-3">
                        {cardSheet.asides.map((aside) => (
                            <Aside key={aside.heading} {...aside} />
                        ))}
                    </div>
                </Sheet>

                {/* 6 — What you get */}
                <Sheet number={6} businessName={business.name}>
                    <Eyebrow>{SHEETS[5]}</Eyebrow>
                    <h2 className="mt-1 text-3xl font-semibold tracking-tight">
                        {priceSheet.heading}
                    </h2>
                    <p className="mt-2 leading-7 text-[#17233B]/75">{priceSheet.blurb}</p>

                    <table className="mt-6 w-full border-collapse text-sm">
                        <thead>
                            <tr className="border-b border-[#17233B]/15 text-left">
                                <th scope="col" className="py-2 font-semibold">
                                    Feature
                                </th>
                                <th scope="col" className="w-24 py-2 text-center font-semibold">
                                    Free
                                </th>
                                <th scope="col" className="w-24 py-2 text-center font-semibold">
                                    Pro
                                    <span className="block text-xs font-normal text-[#17233B]/65">
                                        {plans.pro_monthly.price}/mo
                                    </span>
                                </th>
                                <th scope="col" className="w-24 py-2 text-center font-semibold">
                                    Growth
                                    <span className="block text-xs font-normal text-[#17233B]/65">
                                        {plans.growth_monthly.price}/mo
                                    </span>
                                </th>
                            </tr>
                        </thead>

                        <tbody>
                            {planComparison.map((row) => (
                                <tr key={row.feature} className="border-b border-[#17233B]/10">
                                    <th scope="row" className="py-2 pr-4 text-left font-normal leading-6">
                                        {row.feature}
                                    </th>
                                    <td className="py-2 text-center">
                                        <Has value={row.free} />
                                    </td>
                                    <td className="py-2 text-center">
                                        <Has value={row.pro} />
                                    </td>
                                    <td className="py-2 text-center">
                                        <Has value={row.growth} />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    <p className="mt-4 text-xs text-[#17233B]/65">{priceSheet.note}</p>

                    <p className="mt-6 rounded-xl bg-[#FFF8F0] px-5 py-4 text-sm">
                        <span className="font-semibold">
                            {plans.pro_founding_monthly.name}, {plans.pro_founding_monthly.price} a{" "}
                            {plans.pro_founding_monthly.interval}:{" "}
                        </span>
                        {plans.pro_founding_monthly.note?.toLowerCase()} for the first fifty
                        businesses to join.
                    </p>
                </Sheet>

                {/* 7 — The numbers */}
                <Sheet number={7} businessName={business.name}>
                    <Eyebrow>{SHEETS[6]}</Eyebrow>
                    <h2 className="mt-1 text-3xl font-semibold tracking-tight">
                        {reportSheet.heading}
                    </h2>
                    <p className="mt-2 leading-7 text-[#17233B]/75">{reportSheet.blurb}</p>

                    <blockquote className="mt-6 rounded-2xl bg-[#17233B] px-6 py-5 text-xl font-semibold leading-8 text-white">
                        {visits ? repeatVisitSentence(visits) : EXAMPLE.report}
                    </blockquote>

                    {example.report && <Example>{EXAMPLE.label}</Example>}

                    {visits && visits.byMonth.length > 0 && (
                        <table className="mt-6 w-full border-collapse text-sm">
                            <thead>
                                <tr className="border-b border-[#17233B]/15 text-left">
                                    <th scope="col" className="py-2 font-semibold">
                                        Month
                                    </th>
                                    <th scope="col" className="py-2 text-right font-semibold">
                                        First visits
                                    </th>
                                    <th scope="col" className="py-2 text-right font-semibold">
                                        We sent
                                    </th>
                                    <th scope="col" className="py-2 text-right font-semibold">
                                        Came back
                                    </th>
                                </tr>
                            </thead>

                            <tbody>
                                {visits.byMonth.map((month) => (
                                    <tr key={month.month} className="border-b border-[#17233B]/10">
                                        <th scope="row" className="py-2 text-left font-normal">
                                            {new Date(month.month).toLocaleDateString("en-GB", {
                                                month: "long",
                                                year: "numeric",
                                                timeZone: "UTC",
                                            })}
                                        </th>
                                        <td className="py-2 text-right">{month.newCustomers}</td>
                                        <td className="py-2 text-right">{month.sent}</td>
                                        <td className="py-2 text-right">{month.returned}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}

                    <h3 className="mt-8 text-lg font-semibold">How it is counted</h3>
                    <ol className="mt-3 space-y-3 text-sm">
                        {reportSheet.how.map((step, index) => (
                            <Step key={step} number={index + 1}>
                                {step}
                            </Step>
                        ))}
                    </ol>

                    <p className="mt-6 text-sm leading-6 text-[#17233B]/75">
                        {reportSheet.caution}
                    </p>
                </Sheet>
            </main>
        </>
    );
}

export default function SalesPackPage(props: PageProps) {
    return (
        <Suspense fallback={<Loading />}>
            <Pack {...props} />
        </Suspense>
    );
}
