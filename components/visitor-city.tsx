import { CityInterestForm } from "@/components/city-interest-form";
import { Skeleton } from "@/components/ui/skeleton";
import { placeName } from "@/lib/cities";
import type { VisitorContext } from "@/lib/visitor";

// Shown to visitors outside every live city: what they're seeing instead,
// and a way to hear when we launch near them.
export async function NotHereYet({ visitor }: { visitor: VisitorContext }) {
    if (!visitor.outsideTown) return null;

    const town = visitor.outsideTown;
    const place = await placeName(null);

    return (
        <aside
            aria-label="Promotello near you"
            className="border-b border-[#FF593F]/20 bg-[#FF593F]/10 text-[#17233B]"
        >
            <div className="mx-auto flex max-w-7xl flex-col gap-3 px-6 py-4 sm:px-10 lg:flex-row lg:items-center lg:justify-between">
                <p className="text-sm">
                    <strong>Promotello isn&apos;t in {town} yet</strong>, so you&apos;re seeing {place}.
                    Want to know when we arrive?
                </p>
                <CityInterestForm town={town} />
            </div>
        </aside>
    );
}

// While we work out the visitor's city.
export function VisitorLoading() {
    return (
        <main className="min-h-screen bg-[#FFF8F0] pb-24">
            <div className="mx-auto max-w-7xl px-6 py-12 sm:px-10 sm:py-16">
                <Skeleton className="h-64 rounded-3xl" />
                <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                    {[1, 2, 3, 4].map((item) => (
                        <Skeleton key={item} className="aspect-[3/4] rounded-2xl" />
                    ))}
                </div>
            </div>
        </main>
    );
}
