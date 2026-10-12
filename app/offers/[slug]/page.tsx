import { Suspense } from "react";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import RedeemButton from "./redeem-button";

type OfferPageProps = {
    params: Promise<{
        slug: string;
    }>;
};

function LoadingState() {
    return (
        <main className="flex min-h-screen items-center justify-center bg-[#FFF8F0] px-6">
            <div className="h-96 w-full max-w-xl animate-pulse rounded-3xl bg-white" />
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
        businesses!inner (
          name,
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

    const formattedExpiry = new Intl.DateTimeFormat("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
    }).format(new Date(offer.expires_at));

    return (
        <main className="flex min-h-screen flex-col items-center justify-center gap-3 bg-[#FFF8F0] px-6">
            <Link
                href="/#offers"
                className="text-sm font-medium text-[#17233B]/60 hover:text-[#17233B]"
            >
                ← Back to all deals
            </Link>

            <section className="w-full max-w-xl rounded-3xl bg-white p-8 shadow-sm">
                <p className="text-sm font-medium text-[#FF593F]">
                    {offer.discount}
                </p>

                <p className="mt-2 text-sm font-medium text-[#17233B]/60">
                    {business?.name ?? "Local business"}
                </p>

                <h1 className="mt-3 text-3xl font-semibold tracking-tight text-[#17233B]">
                    {offer.title}
                </h1>

                <p className="mt-4 leading-7 text-[#17233B]/65">
                    {offer.description}
                </p>

                <p className="mt-6 text-sm text-[#17233B]/55">
                    {offer.availability}
                </p>

                <div className="mt-6 space-y-2 text-sm text-[#17233B]/60">
                    <p>Expires {formattedExpiry}</p>
                    <p>{offer.terms}</p>
                </div>

                <RedeemButton offerId={offer.id} />
            </section>
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