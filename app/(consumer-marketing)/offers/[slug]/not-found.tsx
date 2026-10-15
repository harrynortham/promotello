import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function OfferNotFound() {
    return (
        <main className="flex min-h-screen items-center justify-center bg-[#FFF8F0] px-6">
            <section className="w-full max-w-md text-center">
                <p className="text-sm font-medium text-[#FF593F]">Offer unavailable</p>

                <h1 className="mt-3 text-3xl font-semibold tracking-tight text-[#17233B]">
                    We couldn’t find that deal.
                </h1>

                <p className="mt-3 text-[#17233B]/65">
                    It may have expired or the link may be incorrect.
                </p>

                <Button
                    size="lg"
                    render={<Link href="/#offers" />}
                    nativeButton={false}
                    className="mt-8 rounded-full bg-[#FF593F] text-[#17233B] hover:bg-[#e94d36]"
                >
                    Browse all deals
                </Button>
            </section>
        </main>
    );
}