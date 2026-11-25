import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { notFound, redirect } from "next/navigation";
import { FiArrowRight } from "react-icons/fi";

import { LoyaltyCard } from "@/components/loyalty-card";
import { SubmitButton } from "@/components/submit-button";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { storedImage } from "@/lib/images";
import { absoluteUrl, siteName } from "@/lib/site";
import { businessPath } from "@/lib/slugs";
import { createClient } from "@/utils/supabase/server";
import { joinLoyaltyProgram } from "@/app/(customer-marketing)/businesses/[slug]/actions";

// The card on its own, before anybody holds it.
//
// Somebody arriving from a link in a bio has been promised stamps, and
// the business page answers with a directory listing: the offers, the
// hours, the map, and the card somewhere down the page. This is the
// card, full size, in the first screenful, with the one button that
// gets it.
//
// /loyalty/<id> is the other half of this and is deliberately separate:
// that is *your* card, it needs an account, and it carries the code
// staff scan. This one is nobody's yet.

type PageProps = {
    params: Promise<{ programId: string }>;
    searchParams?: Promise<{ loyalty?: string }>;
};

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function findProgram(programId: string) {
    if (!uuid.test(programId)) return null;

    const supabase = await createClient();

    // RLS serves an active card on an approved business and nothing
    // else, so a card that has been closed or a business that is not
    // public simply is not here.
    const { data } = await supabase
        .from("loyalty_programs")
        .select(
            `
                id, name, stamps_required, reward, terms,
                card_colour, card_header, card_accent, stamp_icon,
                businesses ( id, slug, name, logo_url )
            `,
        )
        .eq("id", programId)
        .eq("is_active", true)
        .is("closed_at", null)
        .maybeSingle();

    if (!data) return null;

    const business = Array.isArray(data.businesses) ? data.businesses[0] : data.businesses;

    return business ? { program: data, business } : null;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    await connection();

    const { programId } = await params;
    const found = await findProgram(programId);

    if (!found) return { title: "Card not found", robots: { index: false } };

    const reward = found.program.reward.charAt(0).toLowerCase() + found.program.reward.slice(1);

    return {
        // Not "Barbers's": plenty of these names end in an s, and the
        // possessive reads as a typo on half of them.
        title: { absolute: `Loyalty card at ${found.business.name} | ${siteName}` },
        description: `Collect ${found.program.stamps_required} stamps at ${found.business.name} and get ${reward}. Free to join, nothing to download.`,
        alternates: { canonical: absoluteUrl(businessPath(found.business)) },
        robots: { index: false, follow: true },
    };
}

export default function JoinCardPage({ params, searchParams }: PageProps) {
    return (
        <Suspense fallback={<Loading />}>
            <JoinCardContent params={params} searchParams={searchParams} />
        </Suspense>
    );
}

function Loading() {
    return (
        <main className="min-h-screen bg-[#FFF8F0] px-5 py-10">
            <div className="mx-auto w-full max-w-md" role="status" aria-label="Loading">
                <Skeleton className="mx-auto h-6 w-40" />
                <Skeleton className="mt-6 h-[26rem] rounded-2xl" />
                <Skeleton className="mt-6 h-12 rounded-lg" />
            </div>
        </main>
    );
}

async function JoinCardContent({ params, searchParams }: PageProps) {
    await connection();

    const { programId } = await params;
    const { loyalty: problem } = (await searchParams) ?? {};
    const found = await findProgram(programId);

    if (!found) notFound();

    const { program, business } = found;
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    // Already theirs: they wanted their card, not an offer of one.
    if (user) {
        const { data: held } = await supabase
            .from("loyalty_cards")
            .select("id")
            .eq("program_id", program.id)
            .eq("user_id", user.id)
            .maybeSingle();

        if (held) redirect(`/loyalty/${program.id}`);
    }

    const logo = storedImage(business.logo_url);
    // Back to the business page rather than here, and with ?join=1:
    // afterSignIn() reads that and finishes the join itself, so they
    // land on their own card instead of on this button again.
    const afterSignIn = encodeURIComponent(`${businessPath(business)}?join=1`);

    return (
        <main className="min-h-screen bg-[#FFF8F0] px-5 py-10 text-[#17233B]">
            <div className="mx-auto w-full max-w-md">
                <div className="flex items-center justify-center gap-3">
                    {logo ? (
                        <Image
                            src={logo}
                            alt=""
                            width={48}
                            height={48}
                            className="size-10 rounded-xl object-cover"
                        />
                    ) : (
                        <span className="flex size-10 items-center justify-center rounded-xl bg-white text-base font-semibold text-[#FF593F]">
                            {business.name.charAt(0).toUpperCase()}
                        </span>
                    )}
                    <p className="font-semibold">{business.name}</p>
                </div>

                {/* The card itself, the size it will be in their phone.
                    No code on it: nobody holds this one yet. */}
                <div className="mt-6">
                    <LoyaltyCard
                        businessName={business.name}
                        logoUrl={business.logo_url}
                        stampsRequired={program.stamps_required}
                        reward={program.reward}
                        stamps={0}
                        terms={program.terms}
                        colour={program.card_colour}
                        header={program.card_header}
                        accent={program.card_accent}
                        stampIcon={program.stamp_icon}
                        narrow
                        // Nobody holds this card yet, so there is no code
                        // on it. The panel stays and says what will be
                        // there, which is also the only explanation a
                        // first-timer needs of how a stamp happens.
                        qr={
                            <div
                                aria-hidden="true"
                                className="h-full w-full rounded-lg border-2 border-dashed border-[#17233B]/15"
                            />
                        }
                        scanTitle="Your code lands here"
                        scanHint="Staff scan it when you pay, and a stamp goes on."
                    />
                </div>

                {problem === "unavailable" && (
                    <p role="alert" className="mt-5 rounded-lg bg-white px-4 py-3 text-sm text-red-700">
                        This card isn&apos;t taking new members at the moment.
                    </p>
                )}

                <div className="mt-6">
                    {user ? (
                        <form action={joinLoyaltyProgram}>
                            <input type="hidden" name="programId" value={program.id} />
                            <input type="hidden" name="businessId" value={business.id} />
                            <SubmitButton pendingLabel="Joining…" className="h-12 w-full text-base">
                                Get my card
                            </SubmitButton>
                        </form>
                    ) : (
                        <div className="space-y-3">
                            <Button
                                render={<Link href={`/signup?next=${afterSignIn}`} />}
                                nativeButton={false}
                                className="h-12 w-full bg-[#FF593F] text-base text-white hover:bg-[#FF593F]/90"
                            >
                                Get my card
                                <FiArrowRight aria-hidden="true" />
                            </Button>

                            <p className="text-center text-sm text-[#17233B]/65">
                                Already on Promotello?{" "}
                                <Link
                                    href={`/login?next=${afterSignIn}`}
                                    className="font-medium underline underline-offset-4"
                                >
                                    Log in
                                </Link>
                            </p>
                        </div>
                    )}
                </div>

                <p className="mt-4 text-center text-sm text-[#17233B]/60">
                    Free to join. It lives on your phone, so there&apos;s nothing to download and
                    nothing to lose.
                </p>

                <p className="mt-8 text-center text-xs text-[#17233B]/50">
                    <Link href={businessPath(business)} className="hover:text-[#FF593F]">
                        See everything {business.name} is running
                    </Link>
                </p>
            </div>
        </main>
    );
}
