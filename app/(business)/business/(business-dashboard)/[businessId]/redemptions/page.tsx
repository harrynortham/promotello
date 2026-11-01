import { Suspense } from "react";
import { FiCamera } from "react-icons/fi";
import { connection } from "next/server";
import { notFound, redirect } from "next/navigation";

import { ScanVoucherIllustration } from "@/components/scan-voucher-illustration";
import { RedemptionsHowItWorks } from "./how-it-works";
import { createClient } from "@/utils/supabase/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

type PageProps = {
    params: Promise<{
        businessId: string;
    }>;
};

type Redemption = {
    id: string;
    redemption_code: string;
    redeemed_at: string;
    used_at: string | null;
    offers:
    | {
        id: string;
        title: string;
        discount: string;
        business_id: string;
    }
    | {
        id: string;
        title: string;
        discount: string;
        business_id: string;
    }[]
    | null;
};

async function markRedemptionUsed(formData: FormData) {
    "use server";

    const redemptionId = formData.get("redemptionId");
    const businessId = formData.get("businessId");

    if (
        typeof redemptionId !== "string" ||
        typeof businessId !== "string" ||
        !redemptionId ||
        !businessId
    ) {
        return;
    }

    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login");
    }

    const { error } = await supabase.rpc("mark_redemption_used", {
        requested_redemption_id: redemptionId,
    });

    if (error) {
        throw new Error(error.message);
    }

    redirect(`/business/${businessId}/redemptions`);
}

function LoadingState() {
    return (
        <div>
            <div>
                <div className="flex items-end justify-between">
                    <div>
                        <Skeleton className="h-5 w-40 rounded-lg" />
                        <Skeleton className="mt-3 h-10 w-72 rounded-lg" />
                        <Skeleton className="mt-3 h-5 w-96 max-w-full rounded-lg" />
                    </div>

                    <Skeleton className="hidden h-9 w-40 rounded-lg sm:block" />
                </div>

                <div className="mt-10 space-y-4">
                    {[1, 2, 3].map((item) => (
                        <div
                            key={item}
                            className="rounded-xl border border-[#17233B]/10 bg-white p-6"
                        >
                            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                                <div className="space-y-3">
                                    <Skeleton className="h-7 w-56 rounded-lg" />
                                    <Skeleton className="h-4 w-24 rounded-full" />
                                    <Skeleton className="h-4 w-40 rounded-lg" />
                                    <Skeleton className="h-4 w-32 rounded-lg" />
                                </div>

                                <Skeleton className="h-24 w-48 rounded-xl" />
                            </div>

                            <Skeleton className="mt-6 h-9 w-32 rounded-lg" />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
async function RedemptionsContent({ params }: PageProps) {
    await connection();

    const { businessId } = await params;
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login");
    }

    const { data: business, error: businessError } = await supabase
        .from("businesses")
        .select("id, name")
        .eq("id", businessId)
        .maybeSingle();

    if (businessError || !business) {
        notFound();
    }

    const { data, error } = await supabase
        .from("offer_redemptions")
        .select(
            `
        id,
        redemption_code,
        redeemed_at,
        used_at,
        offers!inner (
          id,
          title,
          discount,
          business_id
        )
      `,
        )
        .eq("offers.business_id", businessId)
        .order("redeemed_at", { ascending: false });

    if (error) {
        throw new Error("Unable to load redemptions.");
    }

    const redemptions = (data ?? []) as Redemption[];

    return (
        <div>
            <div>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#FF593F]">
                            {business.name}
                        </p>

                        <h1 className="mt-3 text-4xl font-semibold tracking-tight">
                            Redemptions
                        </h1>

                        <p className="mt-3 text-[#17233B]/65">
                            Check customer codes and mark offers as used.
                        </p>
                    </div>

                    <div className="shrink-0">
                        <RedemptionsHowItWorks />
                    </div>
                </div>

                <div className="mt-8 grid gap-6 rounded-xl border border-[#17233B]/10 bg-white p-6 sm:grid-cols-[10rem_minmax(0,1fr)] sm:items-center sm:gap-8 sm:p-8">
                    <ScanVoucherIllustration className="mx-auto w-36 sm:w-40" />

                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#FF593F]">
                            Quickest at the till
                        </p>

                        <h2 className="mt-2 text-xl font-semibold text-[#17233B]">
                            Scan the customer&apos;s voucher
                        </h2>

                        <p className="mt-2 text-sm leading-6 text-[#17233B]/70">
                            Point your phone camera at the QR code on their
                            voucher. It opens the voucher here, so you can mark
                            it used in one tap.
                        </p>

                        <p className="mt-3 flex items-start gap-2 text-sm leading-6 text-[#17233B]/55">
                            <FiCamera aria-hidden="true" className="mt-1 size-4 shrink-0 text-[#FF593F]" />
                            No camera to hand? Find the offer below and mark it
                            used from its card.
                        </p>
                    </div>
                </div>

                {redemptions.length === 0 ? (
                    <div className="mt-10 rounded-xl border border-dashed border-[#17233B]/20 bg-white px-6 py-14 text-center">
                        <h2 className="text-xl font-semibold">No redemptions yet</h2>
                        <p className="mx-auto mt-2 max-w-md text-[#17233B]/65">
                            Customer redemptions will appear here when customers claim your offers.
                        </p>
                    </div>
                ) : (
                    <section className="mt-10 space-y-4">
                        {redemptions.map((redemption) => {
                            const offer = Array.isArray(redemption.offers)
                                ? redemption.offers[0]
                                : redemption.offers;

                            const isUsed = Boolean(redemption.used_at);

                            return (
                                <Card key={redemption.id} className="border-[#17233B]/10">
                                    <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                                        <div>
                                            <div className="flex flex-wrap items-center gap-3">
                                                <CardTitle className="text-xl text-[#17233B]">
                                                    {offer?.title ?? "Offer"}
                                                </CardTitle>

                                                <Badge
                                                    variant={isUsed ? "default" : "secondary"}
                                                    className={
                                                        isUsed
                                                            ? "bg-green-100 text-green-700 hover:bg-green-100"
                                                            : "bg-amber-100 text-amber-700 hover:bg-amber-100"
                                                    }
                                                >
                                                    {isUsed ? "Used" : "Not used"}
                                                </Badge>
                                            </div>

                                            {offer?.discount && (
                                                <p className="mt-2 text-sm font-medium text-[#FF593F]">
                                                    {offer.discount}
                                                </p>
                                            )}
                                        </div>

                                        <div className="rounded-xl bg-[#17233B] px-6 py-4 text-center text-white">
                                            <p className="text-xs uppercase tracking-wide text-white/60">
                                                Redemption code
                                            </p>

                                            <p className="mt-1 text-2xl font-bold tracking-[0.2em]">
                                                {redemption.redemption_code}
                                            </p>
                                        </div>
                                    </CardHeader>

                                    <CardContent>
                                        <div className="space-y-1 text-sm text-[#17233B]/70">
                                            <p>
                                                Redeemed{" "}
                                                {new Date(
                                                    redemption.redeemed_at,
                                                ).toLocaleDateString("en-GB")}
                                            </p>

                                            {redemption.used_at && (
                                                <p className="text-green-700">
                                                    Marked as used{" "}
                                                    {new Date(
                                                        redemption.used_at,
                                                    ).toLocaleDateString("en-GB")}
                                                </p>
                                            )}
                                        </div>

                                        {!isUsed && (
                                            <form action={markRedemptionUsed} className="mt-6">
                                                <input
                                                    type="hidden"
                                                    name="redemptionId"
                                                    value={redemption.id}
                                                />

                                                <input
                                                    type="hidden"
                                                    name="businessId"
                                                    value={businessId}
                                                />

                                                <Button type="submit" variant="default" size="sm">
                                                    Mark as used
                                                </Button>
                                            </form>
                                        )}
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </section>
                )}
            </div>
        </div>
    );
}

export default function BusinessRedemptionsPage({ params }: PageProps) {
    return (
        <Suspense fallback={<LoadingState />}>
            <RedemptionsContent params={params} />
        </Suspense>
    );
}