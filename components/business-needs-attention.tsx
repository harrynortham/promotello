import Link from "next/link";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

type AttentionItem = {
    id: string;
    title: string;
    description: string;
    href: string;
};

type BusinessNeedsAttentionProps = {
    items: AttentionItem[];
};

export function BusinessNeedsAttention({
    items,
}: BusinessNeedsAttentionProps) {
    if (items.length === 0) {
        return (
            <Alert className="mt-8 border-emerald-200 bg-emerald-50 text-emerald-950">
                <AlertTitle>Everything looks good</AlertTitle>

                <AlertDescription>
                    There are no outstanding business or offer issues
                    requiring your attention.
                </AlertDescription>
            </Alert>
        );
    }

    return (
        <section className="mt-8">
            <div className="mb-4">
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#FF593F]">
                    Action required
                </p>

                <h2 className="mt-2 text-2xl font-semibold tracking-tight">
                    Needs your attention
                </h2>

                <p className="mt-2 text-sm text-[#17233B]/70">
                    Resolve these items to keep your businesses and offers
                    performing well.
                </p>
            </div>

            <div className="space-y-3">
                {items.map((item) => (
                    <Alert
                        key={item.id}
                        className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
                    >
                        <div>
                            <AlertTitle>{item.title}</AlertTitle>
                            <AlertDescription>
                                {item.description}
                            </AlertDescription>
                        </div>

                        <Button
                            render={<Link href={item.href} />}
                            nativeButton={false}
                            variant="outline"
                            size="sm"
                            className="shrink-0"
                        >
                            Review
                        </Button>
                    </Alert>
                ))}
            </div>
        </section>
    );
}