import { Skeleton } from "@/components/ui/skeleton";

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
