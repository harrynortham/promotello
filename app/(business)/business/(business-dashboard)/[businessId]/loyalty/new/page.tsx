import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { FiArrowLeft } from "react-icons/fi";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { loadLoyaltyEditor } from "../loyalty-data";
import { LoyaltyCardBuilder } from "../program-form";

// Another card, for a business that already has one. The first is still
// built on the loyalty page itself, where there is nothing else to see.

type PageProps = { params: Promise<{ businessId: string }> };

function LoadingState() {
    return (
        <div>
            <Skeleton className="h-10 w-48 rounded-lg" />
            <Skeleton className="mt-8 h-[32rem] rounded-xl" />
        </div>
    );
}

async function NewLoyaltyCard({ params }: PageProps) {
    await connection();

    const { businessId } = await params;
    const editor = await loadLoyaltyEditor(businessId);
    const back = `/business/${businessId}/loyalty`;

    if (!editor.canManage) {
        redirect(back);
    }

    return (
        <div className="text-[#17233B]">
            <Button render={<Link href={back} />} nativeButton={false} variant="ghost" size="sm">
                <FiArrowLeft aria-hidden="true" />
                Loyalty cards
            </Button>

            <header className="mt-6">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#FF593F]">
                    New loyalty card
                </p>

                <h1 className="mt-3 text-4xl font-semibold tracking-tight">
                    Start another card
                </h1>

                <p className="mt-3 max-w-2xl text-[#17233B]/65">
                    A second card for a different habit — coffee in the morning,
                    lunch at midday. Customers choose which to collect, so give
                    it a name they will recognise.
                </p>
            </header>

            <LoyaltyCardBuilder
                businessId={businessId}
                businessName={editor.businessName}
                businessLogoUrl={editor.businessLogoUrl}
                program={null}
                submitLabel="Start this card"
                locked={!editor.hasPro}
            />
        </div>
    );
}

export default function NewLoyaltyCardPage(props: PageProps) {
    return (
        <Suspense fallback={<LoadingState />}>
            <NewLoyaltyCard {...props} />
        </Suspense>
    );
}
