import { Button } from "@/components/ui/button";
import Link from "next/link";

type OfferCardProps = {
    slug: string;
    discount: string;
    title: string;
    description: string;
    availability: string;
};

export function OfferCard({
    discount,
    title,
    description,
    availability,
    slug
}: OfferCardProps) {
    return (
        <article className="rounded-2xl border border-[#17233B]/10 bg-white p-6 text-left shadow-sm">
            <p className="text-sm font-medium text-[#FF593F]">{discount}</p>

            <h3 className="mt-2 text-xl font-semibold text-[#17233B]">
                {title}
            </h3>

            <p className="mt-2 text-sm leading-6 text-[#17233B]/65">
                {description}
            </p>

            <div className="mt-5 flex items-center justify-between gap-4">
                <span className="text-sm text-[#17233B]/55">{availability}</span>

                <Button
                    size="sm"
                    render={<Link href={`/offers/${slug}`} />}
                    nativeButton={false}
                    className="rounded-full bg-[#FF593F] text-[#17233B] hover:bg-[#e94d36]"
                >
                    View deal
                </Button>
            </div>
        </article>
    );
}