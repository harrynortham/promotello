import { Suspense } from "react";
import Link from "next/link";
import { FiCamera } from "react-icons/fi";
import { connection } from "next/server";
import { notFound, redirect } from "next/navigation";

import { createClient } from "@/utils/supabase/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
    Alert,
    AlertDescription,
    AlertTitle,
} from "@/components/ui/alert";

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
        <main className="min-h-screen bg-[#FFF8F0] px-6 py-12">
            <div className="mx-auto max-w-5xl">
                <div className="flex items-end justify-between">
                    <div>
                        <Skeleton className="h-5 w-40 rounded-md" />
                        <Skeleton className="mt-3 h-10 w-72 rounded-md" />
                        <Skeleton className="mt-3 h-5 w-96 max-w-full rounded-md" />
                    </div>

                    <Skeleton className="hidden h-9 w-40 rounded-md sm:block" />
                </div>

                <div className="mt-10 space-y-4">
                    {[1, 2, 3].map((item) => (
                        <div
                            key={item}
                            className="rounded-xl border border-[#17233B]/10 bg-white p-6"
                        >
                            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                                <div className="space-y-3">
                                    <Skeleton className="h-7 w-56 rounded-md" />
                                    <Skeleton className="h-4 w-24 rounded-full" />
                                    <Skeleton className="h-4 w-40 rounded-md" />
                                    <Skeleton className="h-4 w-32 rounded-md" />
                                </div>

                                <Skeleton className="h-24 w-48 rounded-xl" />
                            </div>

                            <Skeleton className="mt-6 h-9 w-32 rounded-md" />
                        </div>
                    ))}
                </div>
            </div>
        </main>
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
        <main className="min-h-screen bg-[#FFF8F0] px-6 py-12">
            <div className="mx-auto max-w-5xl">
                <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <p className="text-sm font-medium text-[#FF593F]">
                            Business redemptions
                        </p>

                        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[#17233B]">
                            {business.name}
                        </h1>

                        <p className="mt-3 text-[#17233B]/65">
                            Check customer codes and mark promotions as used.
                        </p>
                    </div>

                    <Button
                        render={<Link href={`/business/${businessId}/offers`} />}
                        nativeButton={false}
                        variant="outline"
                        size="sm"
                    >
                        Back to promotions
                    </Button>
                </div>

                <div className="mt-8 flex items-start gap-3 rounded-2xl border border-[#17233B]/10 bg-white p-5">
                    <FiCamera aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-[#FF593F]" />
                    <p className="text-sm leading-6 text-[#17233B]/75">
                        <span className="font-semibold text-[#17233B]">Quickest at the till:</span>{" "}
                        point your phone camera at the QR code on the customer&apos;s
                        voucher. It opens the voucher here so you can mark it used in
                        one tap.
                    </p>
                </div>

                {redemptions.length === 0 ? (
                    <Alert className="mt-10 border-[#17233B]/10 bg-white">
                        <AlertTitle>No redemptions yet</AlertTitle>

                        <AlertDescription>
                            Customer redemptions will appear here when customers claim your
                            promotions.
                        </AlertDescription>
                    </Alert>
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
                                                    {offer?.title ?? "Promotion"}
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
                                        <div className="space-y-1 text-sm text-[#17233B]/60">
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
        </main>
    );
}

export default function BusinessRedemptionsPage({ params }: PageProps) {
    return (
        <Suspense fallback={<LoadingState />}>
            <RedemptionsContent params={params} />
        </Suspense>
    );
}