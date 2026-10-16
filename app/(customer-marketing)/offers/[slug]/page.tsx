import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { notFound } from "next/navigation";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { createClient } from "@/utils/supabase/server";
import RedeemButton from "./redeem-button";
import { Skeleton } from "@/components/ui/skeleton";

type OfferPageProps = {
    params: Promise<{
        slug: string;
    }>;
};

function LoadingState() {
    return (
        <main className="min-h-screen bg-[#FFF8F0] px-6 py-10">
            <div className="mx-auto w-full max-w-2xl">
                <Skeleton className="h-9 w-40 rounded-md" />

                <div className="mt-6 overflow-hidden rounded-xl border border-[#17233B]/10 bg-white">
                    <Skeleton className="h-72 w-full rounded-none" />

                    <div className="space-y-6 p-6 md:p-10">
                        <Skeleton className="h-20 w-20 rounded-xl" />

                        <div className="flex items-start justify-between gap-4">
                            <div className="space-y-3">
                                <Skeleton className="h-5 w-32 rounded-md" />
                                <Skeleton className="h-4 w-24 rounded-md" />
                            </div>

                            <Skeleton className="h-9 w-24 rounded-full" />
                        </div>

                        <Skeleton className="h-12 w-3/4 rounded-md" />
                        <Skeleton className="h-24 w-full rounded-md" />

                        <div className="grid gap-4 sm:grid-cols-2">
                            <Skeleton className="h-24 w-full rounded-xl" />
                            <Skeleton className="h-24 w-full rounded-xl" />
                        </div>

                        <Skeleton className="h-32 w-full rounded-md" />
                        <Skeleton className="h-12 w-full rounded-md" />
                    </div>
                </div>
            </div>
        </main>
    );
}

function formatExpiry(date: string) {
    return new Intl.DateTimeFormat("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
    }).format(new Date(date));
}

async function OfferContent({ params }: OfferPageProps) {
    await connection();

    const { slug } = await params;
    const supabase = await createClient();

    const { data: offer } = await supabase
        .from("offers")
        .select(
            `
        id,
        slug,
        category,
        discount,
        title,
        description,
        availability,
        expires_at,
        terms,
        image_url,
        max_redemptions,
        redemption_count,
        businesses!inner (
          id,
          name,
          logo_url,
          approval_status
        )
      `,
        )
        .eq("slug", slug)
        .eq("approval_status", "approved")
        .eq("businesses.approval_status", "approved")
        .single();

    if (!offer) {
        notFound();
    }

    const business = Array.isArray(offer.businesses)
        ? offer.businesses[0]
        : offer.businesses;

    const remainingRedemptions =
        offer.max_redemptions === null
            ? null
            : Math.max(
                offer.max_redemptions - offer.redemption_count,
                0,
            );

    const isFullyClaimed = remainingRedemptions === 0;

    return (
        <main className="min-h-screen bg-[#FFF8F0] px-6 py-10">
            <div className="mx-auto w-full max-w-2xl">
                <Button
                    render={<Link href="/#offers" />}
                    nativeButton={false}
                    variant="outline"
                    size="sm"
                    className="mb-6"
                >
                    ← Back to all deals
                </Button>

                <Card className="overflow-hidden border-[#17233B]/10 shadow-sm">
                    {offer.image_url && (
                        <div className="aspect-[16/8] w-full overflow-hidden bg-[#FFF8F0]">
                            <img
                                src={offer.image_url}
                                alt={offer.title}
                                className="h-full w-full object-cover"
                            />
                        </div>
                    )}

                    <CardContent className="p-6 md:p-10">
                        {business?.logo_url && (
                            <img
                                src={business.logo_url}
                                alt={`${business.name} logo`}
                                className="mb-6 h-20 w-20 rounded-xl object-cover"
                            />
                        )}

                        <div className="flex flex-wrap items-start justify-between gap-4">
                            <div>
                                <Badge
                                    variant="outline"
                                    className="border-[#FF593F]/30 bg-[#FF593F]/10 text-[#FF593F]"
                                >
                                    {offer.category}
                                </Badge>

                                <p className="mt-4 text-sm text-[#17233B]/60">
                                    Offered by
                                </p>

                                <Button
                                    render={
                                        <Link href={`/businesses/${business?.id}`} />
                                    }
                                    nativeButton={false}
                                    variant="link"
                                    size="sm"
                                    className="h-auto p-0 text-base"
                                >
                                    {business?.name ?? "Local business"}
                                </Button>
                            </div>

                            <Badge
                                variant="secondary"
                                className="bg-[#FFF4E8] px-4 py-2 text-sm text-[#FF593F]"
                            >
                                {offer.discount}
                            </Badge>
                        </div>

                        <h1 className="mt-6 text-3xl font-semibold tracking-tight text-[#17233B] md:text-4xl">
                            {offer.title}
                        </h1>

                        <p className="mt-5 leading-7 text-[#17233B]/70">
                            {offer.description}
                        </p>

                        <div className="mt-8 grid gap-4 sm:grid-cols-2">
                            <Card className="border-[#17233B]/10 bg-[#FFF8F0] shadow-none">
                                <CardContent className="p-5">
                                    <p className="text-xs font-semibold uppercase tracking-wide text-[#17233B]/50">
                                        Availability
                                    </p>

                                    <p className="mt-2 text-sm text-[#17233B]">
                                        {offer.availability}
                                    </p>
                                </CardContent>
                            </Card>

                            <Card className="border-[#17233B]/10 bg-[#FFF8F0] shadow-none">
                                <CardContent className="p-5">
                                    <p className="text-xs font-semibold uppercase tracking-wide text-[#17233B]/50">
                                        Expiry date
                                    </p>

                                    <p className="mt-2 text-sm text-[#17233B]">
                                        {formatExpiry(offer.expires_at)}
                                    </p>
                                </CardContent>
                            </Card>
                        </div>

                        {remainingRedemptions !== null && (
                            <Alert className="mt-6 border-[#FF593F]/20 bg-[#FFF4E8] text-[#17233B]">
                                <AlertTitle>
                                    {isFullyClaimed
                                        ? "This offer has been fully claimed."
                                        : `${remainingRedemptions} redemption${remainingRedemptions === 1 ? "" : "s"
                                        } remaining`}
                                </AlertTitle>

                                {!isFullyClaimed && (
                                    <AlertDescription>
                                        Claim this offer while redemptions are still available.
                                    </AlertDescription>
                                )}
                            </Alert>
                        )}

                        <Separator className="my-8" />

                        <section>
                            <h2 className="text-lg font-semibold text-[#17233B]">
                                Terms and conditions
                            </h2>

                            <p className="mt-2 whitespace-pre-line text-sm leading-6 text-[#17233B]/65">
                                {offer.terms}
                            </p>
                        </section>

                        <Separator className="my-8" />

                        <section>
                            <h2 className="text-lg font-semibold text-[#17233B]">
                                Ready to redeem?
                            </h2>

                            <p className="mt-2 text-sm leading-6 text-[#17233B]/65">
                                Select the button below to reveal your redemption code. Show
                                the code to the business when using this offer.
                            </p>

                            <RedeemButton
                                offerId={offer.id}
                                isFullyClaimed={isFullyClaimed}
                            />
                        </section>
                    </CardContent>
                </Card>
            </div>
        </main>
    );
}

export default function OfferPage({ params }: OfferPageProps) {
    return (
        <Suspense fallback={<LoadingState />}>
            <OfferContent params={params} />
        </Suspense>
    );
}