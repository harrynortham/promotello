import { notFound } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { createClient } from "@/utils/supabase/server";

export const instant = false;

type OfferPageProps = {
    params: Promise<{ slug: string }>;
};

export default async function OfferPage({ params }: OfferPageProps) {
    const { slug } = await params;
    const supabase = await createClient();

    const { data: offer } = await supabase
        .from("offers")
        .select("*")
        .eq("slug", slug)
        .single();

    if (!offer) {
        notFound();
    }

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
                    {offer.business}
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

                <Button
                    size="lg"
                    className="mt-8 w-full rounded-full bg-[#FF593F] text-[#17233B] hover:bg-[#e94d36]"
                >
                    Get this deal
                </Button>
            </section>
        </main>
    );
}