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
    businessLogoUrl?: string | null;
    imageUrl?: string | null;
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
    businessLogoUrl,
    imageUrl,
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
        <article className="flex h-full flex-col overflow-hidden rounded-2xl border border-[#17233B]/10 bg-white text-left shadow-sm transition-shadow hover:shadow-md">
            {imageUrl && (
                <img
                    src={imageUrl}
                    alt={title}
                    className="h-52 w-full object-cover"
                />
            )}

            <div className="flex flex-1 flex-col p-6">
                <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                        {businessLogoUrl ? (
                            <img
                                src={businessLogoUrl}
                                alt={`${business ?? "Business"} logo`}
                                className="h-12 w-12 rounded-xl object-cover"
                            />
                        ) : (
                            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#FFF4E8] text-lg font-semibold text-[#FF593F]">
                                {business?.charAt(0).toUpperCase() ?? "B"}
                            </div>
                        )}

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

                            <p className="mt-1 text-sm font-semibold text-[#FF593F]">
                                {discount}
                            </p>
                        </div>
                    </div>

                    {formattedExpiry && (
                        <span className="shrink-0 rounded-full bg-[#FFF4E8] px-3 py-1 text-xs font-medium text-[#17233B]/70">
                            Ends {formattedExpiry}
                        </span>
                    )}
                </div>

                <h3 className="mt-5 text-xl font-semibold text-[#17233B]">
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
            </div>
        </article>
    );
}