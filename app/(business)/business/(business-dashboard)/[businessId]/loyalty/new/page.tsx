import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { FiArrowLeft } from "react-icons/fi";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { FormPageLoading } from "@/components/dashboard-skeletons";
import { loadLoyaltyEditor } from "../loyalty-data";
import { LoyaltyCardBuilder } from "../program-form";

// Another card, for a business that already has one. The first is still
// built on the loyalty page itself, where there is nothing else to see.

type PageProps = { params: Promise<{ businessId: string }> };


async function NewLoyaltyCard({ params }: PageProps) {
    await connection();

    const { businessId } = await params;
    const editor = await loadLoyaltyEditor(businessId);
    const back = `/business/${businessId}/loyalty`;

    if (!editor.canManage) {
        redirect(back);
    }

    // The card being offered, if there is one. Starting a new card
    // closes that one to new joiners rather than changing it: the people
    // holding it were promised what it says.
    const { data: current } = await editor.supabase
        .from("loyalty_programs")
        .select("id, name, stamps_required, reward")
        .eq("business_id", businessId)
        .eq("is_active", true)
        .is("closed_at", null)
        .maybeSingle();

    const { count: holders } = current
        ? await editor.supabase
            .from("loyalty_cards")
            .select("id", { count: "exact", head: true })
            .eq("program_id", current.id)
        : { count: 0 };

    return (
        <div className="text-[#17233B]">
            <Button render={<Link href={back} />} nativeButton={false} variant="ghost" size="sm">
                <FiArrowLeft aria-hidden="true" />
                Loyalty cards
            </Button>

            <header className="mt-6">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#FF593F]">
                    {current ? "Change the deal" : "New loyalty card"}
                </p>

                <h1 className="mt-3 text-4xl font-semibold tracking-tight">
                    {current ? "Start a new card" : "Start your loyalty card"}
                </h1>

                <p className="mt-3 max-w-2xl text-[#17233B]/65">
                    {current
                        ? "A card in someone's wallet is a promise, so its stamps and reward don't change. A new one takes its place for anyone joining from now on."
                        : "A digital stamp card customers keep on their phone. Decide what it takes and what they get."}
                </p>
            </header>

            {current && (
                <Alert className="mt-8 border-[#17233B]/10 bg-white">
                    <AlertTitle>
                        {current.name} stops being handed out
                    </AlertTitle>

                    <AlertDescription>
                        {holders
                            ? `${holders} ${holders === 1 ? "customer is" : "customers are"} collecting ${current.stamps_required} stamps for ${current.reward.charAt(0).toLowerCase() + current.reward.slice(1)}. They keep that card, keep being stamped and claim what they were promised — they simply won't be joined by anyone new.`
                            : `Nobody is collecting it yet, so nothing is lost. It stops being offered the moment this one starts.`}
                    </AlertDescription>
                </Alert>
            )}

            <LoyaltyCardBuilder
                businessId={businessId}
                businessName={editor.businessName}
                businessLogoUrl={editor.businessLogoUrl}
                program={null}
                replacing={Boolean(current)}
                submitLabel={current ? "Start the new card" : "Start this card"}
                locked={!editor.hasPro}
            />
        </div>
    );
}

export default function NewLoyaltyCardPage(props: PageProps) {
    return (
        <Suspense fallback={<FormPageLoading fields={5} />}>
            <NewLoyaltyCard {...props} />
        </Suspense>
    );
}
