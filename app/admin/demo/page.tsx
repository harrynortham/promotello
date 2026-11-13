import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { FiExternalLink } from "react-icons/fi";

import { SubmitButton } from "@/components/submit-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { createClient } from "@/utils/supabase/server";

import { buildDemoBusiness } from "./actions";

export const metadata = { title: "The demo business" };

// One real business, for selling with
// (20270102090000_a_business_only_we_can_see.sql).
//
// Approved, stocked with offers, a card, twelve holders and three
// months of visits, so a prospect can scan a code and watch a stamp
// land rather than look at a mock-up. Invisible to everybody but
// platform admins and its own members, which is why the walk-through
// below only works while you are signed in — which is also the proof
// that nobody else can see it.

function Loading() {
    return (
        <div className="space-y-4">
            <Skeleton className="h-10 w-72 rounded-lg" />
            <Skeleton className="h-40 rounded-xl" />
        </div>
    );
}

type Step = { label: string; href: string; detail: string };

async function Demo() {
    await connection();

    const supabase = await createClient();

    const { data: business } = await supabase
        .from("businesses")
        .select("id, name, slug, demo_at")
        .not("demo_at", "is", null)
        .is("closed_at", null)
        .order("created_at")
        .limit(1)
        .maybeSingle();

    let steps: Step[] = [];

    if (business) {
        const [{ data: offer }, { data: program }] = await Promise.all([
            supabase
                .from("offers")
                .select("slug")
                .eq("business_id", business.id)
                .eq("approval_status", "approved")
                .order("created_at")
                .limit(1)
                .maybeSingle(),
            supabase
                .from("loyalty_programs")
                .select("id")
                .eq("business_id", business.id)
                .eq("is_active", true)
                .is("closed_at", null)
                .maybeSingle(),
        ]);

        // The card furthest along is the one to show: one stamp from
        // its reward is the moment worth demonstrating.
        const { data: card } = program
            ? await supabase
                  .from("loyalty_cards")
                  .select("guest_name, guest_token, card_code, stamps")
                  .eq("program_id", program.id)
                  .not("guest_token", "is", null)
                  .order("stamps", { ascending: false })
                  .limit(1)
                  .maybeSingle()
            : { data: null };

        steps = [
            {
                label: "Their page",
                href: `/businesses/${business.slug ?? business.id}`,
                detail: "What somebody finds in the directory: photos, hours, the offers and the card.",
            },
            offer
                ? {
                      label: "An offer",
                      href: `/offers/${offer.slug}`,
                      detail: "Claim it on your phone and you have a code to take in with you.",
                  }
                : null,
            card?.guest_token
                ? {
                      label: `${card.guest_name}'s card`,
                      href: `/card/${card.guest_token}`,
                      detail: `${card.stamps} of 6 stamps, in a customer's phone, with no account behind it.`,
                  }
                : null,
            card?.card_code
                ? {
                      label: "Add a stamp to it",
                      href: `/stamp/${card.card_code}`,
                      detail: "What your staff see when they scan a card on the shop's phone.",
                  }
                : null,
            {
                label: "The dashboard",
                href: `/business/${business.id}`,
                detail: "Their side of it: offers, redemptions, posters and the card.",
            },
            {
                label: "The report",
                href: `/business/${business.id}/analytics`,
                detail: "First-time customers we sent, and how many came back — counted, not typed.",
            },
            {
                label: "The sales pack",
                href: `/sales-pack/${business.id}`,
                detail: "Six sheets to print or save as a PDF, built from everything above.",
            },
        ].filter(Boolean) as Step[];
    }

    return (
        <div className="text-[#17233B]">
            <header>
                <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                    The demo business
                </h1>

                <p className="mt-2 max-w-2xl text-[#17233B]/65">
                    A real business, approved and stocked, that nobody can see but us. Scan its
                    codes, stamp its cards, read its report — then press the button below to put
                    it back the way it demos best.
                </p>
            </header>

            <Card className="mt-8 border-[#17233B]/10">
                <CardContent>
                    {business ? (
                        <>
                            <h2 className="text-lg font-semibold">{business.name}</h2>
                            <p className="mt-1 text-sm text-[#17233B]/65">
                                Approved and hidden. Sign out and every link below is a 404 —
                                which is the point.
                            </p>
                        </>
                    ) : (
                        <>
                            <h2 className="text-lg font-semibold">Nothing to show yet</h2>
                            <p className="mt-1 text-sm text-[#17233B]/65">
                                Build it once and it stays. You become its owner, so it turns up
                                in your own dashboard and the staff tools work on your phone.
                            </p>
                        </>
                    )}

                    <form action={buildDemoBusiness} className="mt-4">
                        <SubmitButton pendingLabel="Building…">
                            {business ? "Put it back" : "Build the demo business"}
                        </SubmitButton>
                    </form>
                </CardContent>
            </Card>

            {steps.length > 0 && (
                <ol className="mt-8 space-y-3">
                    {steps.map((step, index) => (
                        <li key={step.href}>
                            <Card className="border-[#17233B]/10">
                                <CardContent className="flex flex-wrap items-center justify-between gap-4">
                                    <div className="flex min-w-0 items-start gap-4">
                                        <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-[#FF593F]/10 text-sm font-bold text-[#FF593F]">
                                            {index + 1}
                                        </span>

                                        <div className="min-w-0">
                                            <p className="font-semibold">{step.label}</p>
                                            <p className="mt-0.5 text-sm text-[#17233B]/65">
                                                {step.detail}
                                            </p>
                                        </div>
                                    </div>

                                    <Button
                                        render={
                                            <Link
                                                href={step.href}
                                                target="_blank"
                                                rel="noreferrer"
                                            />
                                        }
                                        nativeButton={false}
                                        variant="outline"
                                        size="sm"
                                    >
                                        Open
                                        <FiExternalLink aria-hidden="true" />
                                    </Button>
                                </CardContent>
                            </Card>
                        </li>
                    ))}
                </ol>
            )}
        </div>
    );
}

export default function DemoBusinessPage() {
    return (
        <Suspense fallback={<Loading />}>
            <Demo />
        </Suspense>
    );
}
