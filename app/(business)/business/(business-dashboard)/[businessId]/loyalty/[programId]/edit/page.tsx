import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { notFound, redirect } from "next/navigation";
import { FiArrowLeft } from "react-icons/fi";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FormPageLoading } from "@/components/dashboard-skeletons";
import { loadLoyaltyEditor } from "../../loyalty-data";
import { ProgramSettingsForm, type Program } from "../../program-form";
import { StartHandingOutAgain, StopHandingOut } from "../../handing-out";

// One card, to change or pause. Changing the stamps changes everyone's
// card, which is why this says so where the button is.

type PageProps = { params: Promise<{ businessId: string; programId: string }> };


async function EditLoyaltyCard({ params }: PageProps) {
    await connection();

    const { businessId, programId } = await params;
    const editor = await loadLoyaltyEditor(businessId);
    const back = `/business/${businessId}/loyalty`;

    if (!editor.canManage) {
        redirect(back);
    }

    const [{ data }, { count: holders }, { data: onOffer }] = await Promise.all([
        editor.supabase
            .from("loyalty_programs")
            .select("id, name, closed_at, stamps_required, reward, terms, is_active, card_colour, stamp_icon")
            .eq("id", programId)
            .eq("business_id", businessId)
            .maybeSingle(),
        editor.supabase
            .from("loyalty_cards")
            .select("id", { count: "exact", head: true })
            .eq("program_id", programId),
        // Whichever card is taking joiners, since only one may: a closed
        // card can only go back on offer if that is this one or nothing.
        editor.supabase
            .from("loyalty_programs")
            .select("id, name")
            .eq("business_id", businessId)
            .eq("is_active", true)
            .is("closed_at", null)
            .limit(1)
            .maybeSingle(),
    ]);

    if (!data) {
        notFound();
    }

    const program = data as Program;
    // Once somebody holds this card, what it promises stops moving. The
    // name and the look are not the promise.
    const issued = (holders ?? 0) > 0;

    return (
        <div className="text-[#17233B]">
            <Button render={<Link href={back} />} nativeButton={false} variant="ghost" size="sm">
                <FiArrowLeft aria-hidden="true" />
                Loyalty cards
            </Button>

            <header className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#FF593F]">
                        {!program.is_active
                            ? "Stopped card"
                            : program.closed_at
                                ? "Still being collected"
                                : "The card on offer"}
                    </p>

                    <h1 className="mt-3 text-4xl font-semibold tracking-tight">{program.name}</h1>

                    <p className="mt-3 max-w-2xl text-[#17233B]/65">
                        Collect {program.stamps_required} stamps, get{" "}
                        {program.reward.charAt(0).toLowerCase() + program.reward.slice(1)}.
                    </p>
                </div>

                <div className="flex shrink-0 flex-wrap gap-3">
                    {/* Stopping hands it out no more; the people holding
                        one carry on collecting. There is no un-promising
                        a card, so there is no pause — but there is a way
                        back, while nothing else has taken its place. */}
                    {program.is_active && !program.closed_at && (
                        <StopHandingOut
                            businessId={businessId}
                            programId={program.id}
                            programName={program.name}
                            holders={holders ?? 0}
                        />
                    )}

                    {program.is_active && program.closed_at && (
                        <StartHandingOutAgain
                            businessId={businessId}
                            programId={program.id}
                            programName={program.name}
                            openCardName={onOffer && onOffer.id !== program.id ? onOffer.name : null}
                        />
                    )}
                </div>
            </header>

            <Card className="mt-8 border-[#17233B]/10">
                <CardHeader>
                    <CardTitle>Card settings</CardTitle>
                </CardHeader>

                <CardContent>
                    {issued && (
                        <Alert className="mb-6 border-[#17233B]/10 bg-[#FFF8F0]">
                            <AlertTitle>The deal on this card is settled</AlertTitle>

                            <AlertDescription>
                                {holders} {holders === 1 ? "customer is" : "customers are"}{" "}
                                collecting it, so the stamps, the reward and the terms stay
                                as they are — the same way a paper card in a wallet does.
                                Its name and its colours are yours to change.{" "}
                                <Link
                                    href={`/business/${businessId}/loyalty/new`}
                                    className="font-medium text-[#FF593F]"
                                >
                                    Start a new card
                                </Link>{" "}
                                to change the deal.
                            </AlertDescription>
                        </Alert>
                    )}

                    <ProgramSettingsForm
                        businessId={businessId}
                        program={program}
                        lockTerms={issued}
                        submitLabel="Save changes"
                    />
                </CardContent>
            </Card>
        </div>
    );
}

export default function EditLoyaltyCardPage(props: PageProps) {
    return (
        <Suspense fallback={<FormPageLoading fields={5} />}>
            <EditLoyaltyCard {...props} />
        </Suspense>
    );
}
