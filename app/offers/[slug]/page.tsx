import { Suspense } from "react";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { createClient } from "@/utils/supabase/server";
import RedeemButton from "./redeem-button";

type OfferPageProps = {
    params: Promise<{
        slug: string;
    }>;
};

function LoadingState() {
    return (
        <main className="min-h-screen bg-[#FFF8F0] px-6 py-10">
            <div className="mx-auto h-[700px] w-full max-w-2xl animate-pulse rounded-3xl bg-white" />
        </main>
    );
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

    const formattedExpiry = new Intl.DateTimeFormat("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
    }).format(new Date(offer.expires_at));

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

                <section className="overflow-hidden rounded-3xl bg-white shadow-sm">
                    {offer.image_url && (
                        <img
                            src={offer.image_url}
                            alt={offer.title}
                            className="h-72 w-full object-cover"
                        />
                    )}

                    <div className="p-6 md:p-10">
                        {business.logo_url && (
                            <img
                                src={business.logo_url}
                                alt={`${business.name} logo`}
                                className="mb-6 h-20 w-20 rounded-2xl object-cover"
                            />
                        )}

                        <div className="flex flex-wrap items-start justify-between gap-4">
                            <div>
                                <p className="text-sm font-semibold uppercase tracking-wide text-[#FF593F]">
                                    {offer.category}
                                </p>

                                <p className="mt-3 text-sm text-[#17233B]/60">
                                    Offered by
                                </p>

                                <Button
                                    render={
                                        <Link href={`/businesses/${business.id}`} />
                                    }
                                    nativeButton={false}
                                    variant="link"
                                    size="sm"
                                    className="mt-1 h-auto p-0"
                                >
                                    {business.name}
                                </Button>
                            </div>

                            <span className="rounded-full bg-[#FFF4E8] px-4 py-2 text-sm font-semibold text-[#FF593F]">
                                {offer.discount}
                            </span>
                        </div>

                        <h1 className="mt-6 text-3xl font-semibold tracking-tight text-[#17233B] md:text-4xl">
                            {offer.title}
                        </h1>

                        <p className="mt-5 leading-7 text-[#17233B]/70">
                            {offer.description}
                        </p>

                        <div className="mt-8 grid gap-4 rounded-2xl bg-[#FFF8F0] p-5 sm:grid-cols-2">
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-wide text-[#17233B]/50">
                                    Availability
                                </p>

                                <p className="mt-1 text-sm text-[#17233B]">
                                    {offer.availability}
                                </p>
                            </div>

                            <div>
                                <p className="text-xs font-semibold uppercase tracking-wide text-[#17233B]/50">
                                    Expiry date
                                </p>

                                <p className="mt-1 text-sm text-[#17233B]">
                                    {formattedExpiry}
                                </p>
                            </div>
                        </div>

                        {remainingRedemptions !== null && (
                            <div className="mt-6 rounded-2xl bg-[#FFF4E8] p-4">
                                <p className="text-sm font-semibold text-[#17233B]">
                                    {isFullyClaimed
                                        ? "This offer has been fully claimed."
                                        : `${remainingRedemptions} redemption${remainingRedemptions === 1 ? "" : "s"
                                        } remaining`}
                                </p>
                            </div>
                        )}

                        <div className="mt-8">
                            <h2 className="text-lg font-semibold text-[#17233B]">
                                Terms and conditions
                            </h2>

                            <p className="mt-2 whitespace-pre-line text-sm leading-6 text-[#17233B]/65">
                                {offer.terms}
                            </p>
                        </div>

                        <div className="mt-8 border-t border-[#17233B]/10 pt-8">
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
                        </div>
                    </div>
                </section>
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