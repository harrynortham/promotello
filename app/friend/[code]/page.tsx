import { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { connection } from "next/server";
import { FiArrowRight, FiCheckCircle } from "react-icons/fi";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { storedImage } from "@/lib/images";
import { businessPath } from "@/lib/slugs";
import { createClient } from "@/utils/supabase/server";

export const metadata = {
    title: "A friend sent you",
    robots: { index: false, follow: false },
};

type PageProps = { params: Promise<{ code: string }> };

// Where a bring-a-friend link lands.
//
// The same shape as /follow: somebody arrives having been sent by a
// person rather than by us, and the one thing that must not happen is a
// sign-in wall with no explanation in front of it. Signed out, this
// says who sent them where and what is on the other side of an account.
//
// Nothing is promised to the friend here beyond what the shop is
// already offering everybody. The reward in this feature goes to the
// person who sent them, and only once the friend has actually been in —
// so there is nothing to dangle and nothing to be disappointed by.

async function FriendView({ params }: PageProps) {
    await connection();

    const { code } = await params;
    const supabase = await createClient();

    if (!/^[a-z0-9]{8}$/.test(code)) return <Gone />;

    const { data: shops } = await supabase.rpc("friend_invite_shop", { referral_code: code });
    const shop = Array.isArray(shops) ? shops[0] : shops;

    if (!shop) return <Gone />;

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        const next = encodeURIComponent(`/friend/${code}`);

        return (
            <Card name={shop.business_name} logoUrl={shop.logo_url}>
                <h1 className="mt-5 text-3xl font-semibold tracking-tight">
                    A friend sent you to {shop.business_name}
                </h1>
                <p className="mt-3 leading-7 text-[#17233B]/70">
                    Make a free account and their offers are yours to claim on your phone. No app to
                    download, and nothing to pay.
                </p>

                <div className="mt-7 space-y-3">
                    <Button
                        render={<Link href={`/signup?next=${next}`} />}
                        nativeButton={false}
                        className="h-12 w-full bg-[#FF593F] text-base text-white hover:bg-[#FF593F]/90"
                    >
                        Create a free account
                    </Button>

                    <Button
                        render={<Link href={`/login?next=${next}`} />}
                        nativeButton={false}
                        variant="outline"
                        className="h-12 w-full"
                    >
                        I already have one
                    </Button>
                </div>
            </Card>
        );
    }

    // Writes down that these two are connected, and nothing else. It
    // answers false for somebody who has been in before, who sent the
    // link themselves, or who has already been brought — none of which
    // is a problem for the person standing here, so none of it is said
    // to them. They came to see a shop.
    const { error: recordError } = await supabase.rpc("record_friend_referral", {
        referral_code: code,
    });

    if (recordError) {
        // Logged, not shown. The page they came to see still works.
        console.error("Friend referral not recorded", recordError);
    }

    return (
        <Card name={shop.business_name} logoUrl={shop.logo_url}>
            <FiCheckCircle aria-hidden="true" className="mt-5 size-10 text-emerald-600" />

            <h1 className="mt-4 text-3xl font-semibold tracking-tight">
                Welcome to {shop.business_name}
            </h1>
            <p className="mt-3 leading-7 text-[#17233B]/70">
                Here is what they are running. Claim anything you like on your phone and show the
                code when you pay.
            </p>

            <Button
                render={<Link href={`${businessPath({ slug: shop.business_slug })}?ref=share`} />}
                nativeButton={false}
                className="mt-7 h-12 w-full bg-[#FF593F] text-base text-white hover:bg-[#FF593F]/90"
            >
                See what&apos;s on
                <FiArrowRight aria-hidden="true" />
            </Button>
        </Card>
    );
}

function Card({
    name,
    logoUrl,
    children,
}: {
    name: string;
    logoUrl: string | null;
    children: React.ReactNode;
}) {
    const logo = storedImage(logoUrl);

    return (
        <main className="flex min-h-screen items-center justify-center bg-[#FFF8F0] px-5 py-12 text-[#17233B]">
            <div className="w-full max-w-md rounded-2xl border border-[#17233B]/10 bg-white px-7 py-8 text-center shadow-sm">
                <div className="flex justify-center">
                    {logo ? (
                        <Image
                            src={logo}
                            alt=""
                            width={80}
                            height={80}
                            className="size-16 rounded-2xl object-cover"
                        />
                    ) : (
                        <span className="flex size-16 items-center justify-center rounded-2xl bg-[#FFF4E8] text-xl font-semibold text-[#FF593F]">
                            {name.charAt(0).toUpperCase()}
                        </span>
                    )}
                </div>

                <div className="flex flex-col items-center">{children}</div>
            </div>
        </main>
    );
}

function Gone() {
    return (
        <main className="flex min-h-screen items-center justify-center bg-[#FFF8F0] px-5 py-12 text-[#17233B]">
            <div className="w-full max-w-md rounded-2xl border border-[#17233B]/10 bg-white px-7 py-10 text-center shadow-sm">
                <h1 className="text-2xl font-semibold tracking-tight">That link has gone</h1>
                <p className="mt-3 leading-7 text-[#17233B]/70">
                    It may have been shared a while ago, or the shop may have stopped running it.
                    There is plenty else nearby.
                </p>

                <Button
                    render={<Link href="/offers" />}
                    nativeButton={false}
                    className="mt-6 h-12 w-full"
                >
                    Find local offers
                </Button>
            </div>
        </main>
    );
}

function Loading() {
    return (
        <main className="flex min-h-screen items-center justify-center bg-[#FFF8F0] px-5 py-12">
            <div className="w-full max-w-md rounded-2xl border border-[#17233B]/10 bg-white px-7 py-8">
                <Skeleton className="mx-auto size-16 rounded-2xl" />
                <Skeleton className="mx-auto mt-5 h-8 w-64" />
                <Skeleton className="mx-auto mt-3 h-5 w-full" />
                <Skeleton className="mt-7 h-12 w-full" />
            </div>
        </main>
    );
}

export default function FriendPage({ params }: PageProps) {
    return (
        <Suspense fallback={<Loading />}>
            <FriendView params={params} />
        </Suspense>
    );
}
