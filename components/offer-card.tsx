import Link from "next/link";

import { Button } from "@/components/ui/button";

type OfferCardProps = {
    slug: string;
    discount: string;
    title: string;
    description: string;
    availability: string;
    business?: string;
    businessId?: string;
    expiresAt?: string;
};

export function OfferCard({
    slug,
    discount,
    title,
    description,
    availability,
    business,
    businessId,
    expiresAt,
}: OfferCardProps) {
    const formattedExpiry = expiresAt
        ? new Date(expiresAt).toLocaleDateString("en-GB", {
            day: "numeric",
            month: "short",
            year: "numeric",
        })
        : null;

    return (
        <article className="flex h-full flex-col rounded-2xl border border-[#17233B]/10 bg-white p-6 text-left shadow-sm transition-shadow hover:shadow-md">
            <div className="flex items-start justify-between gap-4">
                <div>
                    {business &&
                        (businessId ? (
                            <Link
                                href={`/businesses/${businessId}`}
                                className="text-sm font-medium text-[#17233B]/60 hover:text-[#FF593F] hover:underline"
                            >
                                {business}
                            </Link>
                        ) : (
                            <p className="text-sm font-medium text-[#17233B]/60">
                                {business}
                            </p>
                        ))}

                    <p className="mt-2 text-sm font-semibold text-[#FF593F]">
                        {discount}
                    </p>
                </div>

                {formattedExpiry && (
                    <span className="shrink-0 rounded-full bg-[#FFF4E8] px-3 py-1 text-xs font-medium text-[#17233B]/70">
                        Ends {formattedExpiry}
                    </span>
                )}
            </div>

            <h3 className="mt-4 text-xl font-semibold text-[#17233B]">
                {title}
            </h3>

            <p className="mt-2 flex-1 text-sm leading-6 text-[#17233B]/65">
                {description}
            </p>

            <div className="mt-6 flex flex-col gap-4 border-t border-[#17233B]/10 pt-5 sm:flex-row sm:items-center sm:justify-between">
                <span className="text-sm text-[#17233B]/55">
                    {availability}
                </span>

                <Button
                    size="sm"
                    variant="default"
                    render={<Link href={`/offers/${slug}`} />}
                    nativeButton={false}
                >
                    View deal
                </Button>
            </div>
        </article>
    );
}