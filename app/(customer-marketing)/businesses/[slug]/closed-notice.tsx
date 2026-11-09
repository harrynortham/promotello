import Link from "next/link";

import { Button } from "@/components/ui/button";
import { ClosedShopfront } from "./not-found";

// A business that has left Promotello. Its posters are still in windows and
// its codes still resolve, so this is what a scan lands on — and it says the
// business's name, because "we couldn't find that business" reads like a
// broken link when someone is standing in front of the shop.

export function BusinessClosedNotice({ name }: { name: string }) {
    return (
        <main className="bg-[#FFF8F0] px-6 py-14 text-[#17233B] sm:py-20">
            <div className="mx-auto grid max-w-5xl items-center gap-12 lg:grid-cols-2 lg:gap-16">
                <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#FF593F]">
                        No longer listed
                    </p>

                    <h1 className="mt-5 text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
                        {name} isn&rsquo;t on Promotello any more.
                    </h1>

                    <p className="mt-5 max-w-md text-lg leading-8 text-[#17233B]/70">
                        The shop may well still be there &mdash; it&rsquo;s the Promotello
                        page that has gone. Any stamps or vouchers you collected stay in
                        your account.
                    </p>

                    <div className="mt-8 flex flex-wrap gap-3">
                        <Button render={<Link href="/explore" />} nativeButton={false} size="lg">
                            Find somewhere nearby
                        </Button>

                        <Button
                            render={<Link href="/dashboard" />}
                            nativeButton={false}
                            variant="outline"
                            size="lg"
                        >
                            My cards and vouchers
                        </Button>
                    </div>
                </div>

                <ClosedShopfront />
            </div>
        </main>
    );
}
