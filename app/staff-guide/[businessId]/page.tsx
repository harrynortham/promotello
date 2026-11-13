import { Suspense } from "react";
import type { Metadata } from "next";
import Image from "next/image";
import { connection } from "next/server";
import { notFound, redirect } from "next/navigation";

import { storedImage } from "@/lib/images";
import { qrSvg } from "@/lib/qr";
import { requestOrigin } from "@/lib/request-origin";
import { createClient } from "@/utils/supabase/server";

import { PrintToolbar } from "./print-toolbar";

// The page for the wall behind the till.
//
// Everything else in the product is for the owner, on a laptop, with
// time. This is for whoever is on the counter at four on a Saturday
// with a queue: what to do when somebody holds out a phone, and what
// the three or four messages they will ever see actually mean.
//
// One sheet of A4, printed once and stuck up. It takes the business's
// own card so the person reading it knows what they are promising,
// and a QR that opens the till tools on their own phone.

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const robots = { index: false, follow: false };

    // Who is asking decides what this says, so it is never prerendered
    // — and the name goes in the filename when it is saved as a PDF.
    await connection();

    const { businessId } = await params;
    const supabase = await createClient();
    const { data: business } = await supabase
        .from("businesses")
        .select("name")
        .eq("id", businessId)
        .maybeSingle();

    if (!business) {
        return { title: { absolute: "At the till" }, robots };
    }

    const name = business.name.replace(/[\\/:*?"<>|]+/g, " ").replace(/\s+/g, " ").trim();

    return { title: { absolute: `${name} - At the till` }, robots };
}

type PageProps = { params: Promise<{ businessId: string }> };

function Step({ number, children }: { number: number; children: React.ReactNode }) {
    return (
        <li className="flex gap-3">
            <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[#FF593F] text-xs font-bold text-white print:bg-white print:text-[#17233B] print:outline print:outline-1 print:outline-[#17233B]">
                {number}
            </span>
            <span className="leading-6">{children}</span>
        </li>
    );
}

function Says({ heading, children }: { heading: string; children: React.ReactNode }) {
    return (
        <li className="leading-6">
            <span className="font-semibold">{heading}</span> — {children}
        </li>
    );
}

async function Guide({ params }: PageProps) {
    await connection();

    const { businessId } = await params;
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect(`/login?next=${encodeURIComponent(`/staff-guide/${businessId}`)}`);
    }

    // Whoever prints this works here. A member is enough: this is the
    // page for the people who never see the dashboard.
    const { data: membership } = await supabase
        .from("business_members")
        .select("role")
        .eq("business_id", businessId)
        .eq("user_id", user.id)
        .maybeSingle();

    if (!membership) {
        notFound();
    }

    const [{ data: business }, { data: card }, origin] = await Promise.all([
        supabase.from("businesses").select("name, logo_url").eq("id", businessId).maybeSingle(),
        supabase
            .from("loyalty_programs")
            .select("name, stamps_required, reward")
            .eq("business_id", businessId)
            .eq("is_active", true)
            .is("closed_at", null)
            .maybeSingle(),
        requestOrigin(),
    ]);

    // Opens the till tools on the phone in their apron pocket: the
    // scanner, the code box, and everything they have been stamped.
    const qr = await qrSvg(`${origin}/business/${businessId}/loyalty`);
    const reward = card?.reward?.trim()
        ? card.reward.trim().charAt(0).toLowerCase() + card.reward.trim().slice(1)
        : null;

    return (
        <>
            <PrintToolbar backHref={`/business/${businessId}/loyalty`} />

            <div className="mx-auto max-w-[21cm] px-6 py-10 print:p-0">
                <article className="rounded-2xl border border-[#17233B]/10 bg-white p-8 text-[#17233B] shadow-sm print:rounded-none print:border-0 print:p-0 print:shadow-none">
                    <header className="flex items-start justify-between gap-6 border-b border-[#17233B]/10 pb-6">
                        <div className="flex items-center gap-4">
                            {storedImage(business?.logo_url) ? (
                                <Image
                                    src={storedImage(business!.logo_url)!}
                                    alt=""
                                    width={56}
                                    height={56}
                                    className="size-14 rounded-xl object-cover"
                                />
                            ) : null}

                            <div>
                                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#FF593F]">
                                    At the till
                                </p>
                                <h1 className="mt-1 text-3xl font-semibold tracking-tight">
                                    {business?.name ?? "Your business"}
                                </h1>
                                <p className="mt-1 text-sm text-[#17233B]/65">
                                    What to do when a customer holds out their phone.
                                </p>
                            </div>
                        </div>

                        <div className="shrink-0 text-center">
                            <div
                                className="size-24 [&_svg]:h-full [&_svg]:w-full"
                                dangerouslySetInnerHTML={{ __html: qr }}
                            />
                            <p className="mt-1 w-24 text-[0.65rem] leading-4 text-[#17233B]/65">
                                Scan to open the till tools
                            </p>
                        </div>
                    </header>

                    <div className="mt-6 grid gap-6 sm:grid-cols-2 print:grid-cols-2">
                        <section aria-labelledby="voucher-heading">
                            <h2 id="voucher-heading" className="text-lg font-semibold">
                                A voucher
                            </h2>
                            <p className="mt-1 text-sm text-[#17233B]/65">
                                A discount they claimed on Promotello. One voucher, used once.
                            </p>

                            <ol className="mt-3 space-y-2.5 text-sm">
                                <Step number={1}>
                                    Scan the QR code on their phone with your camera, or type the
                                    code into <span className="font-semibold">Redemptions</span>.
                                </Step>
                                <Step number={2}>
                                    Check the discount and what it covers — it is on the screen,
                                    in the words the offer was written in.
                                </Step>
                                <Step number={3}>
                                    Give them the discount, then press{" "}
                                    <span className="font-semibold">Mark as used</span>.
                                </Step>
                            </ol>

                            <h3 className="mt-5 text-sm font-semibold">If the screen says</h3>
                            <ul className="mt-2 space-y-2 text-sm text-[#17233B]/80">
                                <Says heading="Already used">
                                    It has been used before, and the date is on the screen. Don&apos;t
                                    give the discount again.
                                </Says>
                                <Says heading="Not valid right now">
                                    The offer only runs at certain times. Ask them to come back then.
                                </Says>
                                <Says heading="This offer has ended">
                                    It is past the end date. You can still accept it if you want to —
                                    it is your call.
                                </Says>
                            </ul>
                        </section>

                        <section aria-labelledby="loyalty-heading">
                            <h2 id="loyalty-heading" className="text-lg font-semibold">
                                A loyalty card
                            </h2>
                            <p className="mt-1 text-sm text-[#17233B]/65">
                                {reward
                                    ? `Ours is ${card!.stamps_required} stamps for ${reward}.`
                                    : "A stamp card they keep on their phone."}
                            </p>

                            <ol className="mt-3 space-y-2.5 text-sm">
                                <Step number={1}>
                                    Scan the QR code on their card, or type the 10-character code
                                    under it.
                                </Step>
                                <Step number={2}>
                                    Press <span className="font-semibold">Add a stamp</span>. One
                                    stamp per visit, however much they spend.
                                </Step>
                                <Step number={3}>
                                    When the card is full it says{" "}
                                    <span className="font-semibold">Reward ready</span>. Hand the
                                    reward over, then press{" "}
                                    <span className="font-semibold">Redeem reward</span>.
                                </Step>
                            </ol>

                            <h3 className="mt-5 text-sm font-semibold">If the screen says</h3>
                            <ul className="mt-2 space-y-2 text-sm text-[#17233B]/80">
                                <Says heading="Stamped in the last 10 minutes">
                                    It is already on — this looks like the same visit scanned twice.
                                </Says>
                                <Says heading="This card is full">
                                    It is one we no longer hand out. It takes no more stamps:
                                    redeem the reward, and their stamps go on our current card.
                                </Says>
                                <Says heading="This card is finished">
                                    They have claimed it and it was the last one. The screen points
                                    at the card they are collecting on now.
                                </Says>
                                <Says heading="You can't stamp your own card">
                                    Ask a colleague to do it.
                                </Says>
                            </ul>
                        </section>
                    </div>

                    <footer className="mt-6 border-t border-[#17233B]/10 pt-4 text-sm text-[#17233B]/65">
                        <p>
                            <span className="font-semibold text-[#17233B]">You need your own login.</span>{" "}
                            Ask whoever runs the business to invite you from Team — then everything
                            you stamp is yours, and nobody has to share a password.
                        </p>
                        <p className="mt-2">
                            Stuck with a customer in front of you? Accept it, make a note of the
                            code, and sort it out afterwards at promotello.co.uk/business/help.
                        </p>
                    </footer>
                </article>
            </div>
        </>
    );
}

export default function StaffGuidePage(props: PageProps) {
    return (
        <main className="min-h-dvh bg-[#FFF8F0] print:bg-white">
            <Suspense fallback={<div className="h-dvh animate-pulse bg-white/50" />}>
                <Guide {...props} />
            </Suspense>
        </main>
    );
}
