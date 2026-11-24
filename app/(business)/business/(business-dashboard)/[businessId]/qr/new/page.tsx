import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { FiArrowLeft } from "react-icons/fi";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FormPageLoading } from "@/components/dashboard-skeletons";
import { loadDesigner } from "../designer-data";
import { PosterDesigner } from "../poster-designer";

// The form on its own, for a business that already has a code. The QR
// page is then a list of what they have rather than a form with the list
// pushed below it.

type PageProps = {
    params: Promise<{ businessId: string }>;
    // "loyalty", or an offer's id: what the business said it wanted a
    // poster for on the way here. Sent by the loyalty page, the dashboard
    // checklist and the screen after a new offer.
    searchParams: Promise<{ for?: string }>;
};


async function NewQrCode({ params, searchParams }: PageProps) {
    await connection();

    const [{ businessId }, { for: openOn }] = await Promise.all([params, searchParams]);
    const designer = await loadDesigner(businessId);
    const back = `/business/${businessId}/qr`;
    // This page is reachable with nothing made yet, which is where the
    // nudges send everybody so one link works whatever they have.
    const another = designer.codeCount > 0;

    // Nothing to do here without the right to do it: the QR page says
    // why, in the words it already has.
    if (!designer.canManage || !designer.isLive || designer.atFreeLimit) {
        redirect(back);
    }

    return (
        <div className="text-[#17233B]">
            <Button render={<Link href={back} />} nativeButton={false} variant="ghost" size="sm">
                <FiArrowLeft aria-hidden="true" />
                QR posters
            </Button>

            <header className="mt-6">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#FF593F]">
                    New poster
                </p>

                <h1 className="mt-3 text-4xl font-semibold tracking-tight">
                    {another ? "Make another poster" : "Make a poster"}
                </h1>

                <p className="mt-3 max-w-2xl text-[#17233B]/65">
                    {another
                        ? "One per spot: your window, the till, the tables. Each one counts its own scans, so you can see which placement brings people in."
                        : "Put it in your window or by the till. It counts its own scans, so you can see what the spot is worth."}
                </p>
            </header>

            {designer.offers.length === 0 && (
                <Alert className="mt-8 border-[#17233B]/10 bg-white">
                    <AlertTitle>No live offers to point at</AlertTitle>

                    <AlertDescription>
                        This poster can open your business profile page, which shows whatever
                        is on at the time. Create an offer and you can point a poster
                        straight at it.
                    </AlertDescription>
                </Alert>
            )}

            <Card id="create-qr" className="mt-8 overflow-visible border-[#17233B]/10">
                <CardHeader>
                    <CardTitle>Make a poster</CardTitle>
                </CardHeader>

                <CardContent>
                    <PosterDesigner
                        businessId={businessId}
                        businessName={designer.businessName}
                        place={designer.place}
                        logoUrl={designer.logoUrl}
                        offers={designer.offers}
                        loyalty={designer.loyalty}
                        promises={designer.promises}
                        previewSvg={designer.previewSvg}
                        previewLink={designer.previewLink}
                        startOn={openOn ?? null}
                    />
                </CardContent>
            </Card>
        </div>
    );
}

export default function NewQrCodePage(props: PageProps) {
    return (
        <Suspense fallback={<FormPageLoading fields={4} />}>
            <NewQrCode {...props} />
        </Suspense>
    );
}
