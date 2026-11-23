import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { FiCheckCircle, FiGift, FiMail, FiStar } from "react-icons/fi";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { followReasons } from "@/components/qr-poster";
import { runAutomations } from "@/lib/automations";
import { followPromises } from "@/lib/follow-promises";
import { storedImage } from "@/lib/images";
import { businessPath } from "@/lib/slugs";
import { createClient } from "@/utils/supabase/server";
import Image from "next/image";

export const metadata = {
    title: "Follow",
    robots: { index: false, follow: false },
};

type PageProps = { params: Promise<{ businessId: string }> };

const uuid = /^[0-9a-f-]{36}$/i;

// Drawn from the same function as the poster, so the sheet somebody
// scanned and the page it opens promise the same things -- and promise
// nothing this business cannot do.

async function FollowView({ params }: PageProps) {
    await connection();

    const { businessId } = await params;
    const supabase = await createClient();

    if (!uuid.test(businessId)) {
        return <Gone />;
    }

    const { data: business } = await supabase
        .from("businesses")
        .select("id, slug, name, logo_url, approval_status")
        .eq("id", businessId)
        .maybeSingle();

    if (!business || business.approval_status !== "approved") {
        return <Gone />;
    }

    const [{ data: { user } }, promises] = await Promise.all([
        supabase.auth.getUser(),
        followPromises(business.id),
    ]);

    const reasons = followReasons(promises);

    // No account, no follow: business_followers is keyed to a user. The
    // poster still did its job, so this says what is on the other side
    // of signing up rather than only asking them to.
    if (!user) {
        const next = encodeURIComponent(`/follow/${business.id}`);

        return (
            <Card business={business}>
                <h1 className="mt-5 text-3xl font-semibold tracking-tight">Follow {business.name}</h1>
                <Reasons reasons={reasons} />

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

                <p className="mt-4 text-center text-sm text-[#17233B]/60">
                    No app to download, and you can unsubscribe in a tap.
                </p>
            </Card>
        );
    }

    const { data: existing } = await supabase
        .from("business_followers")
        .select("business_id")
        .eq("business_id", business.id)
        .eq("user_id", user.id)
        .maybeSingle();

    // The scan is the answer. Somebody who pointed a camera at a sheet
    // saying "follow us" has said yes already, so asking again on the
    // page they land on is asking twice.
    let followed = Boolean(existing);
    let failed = false;

    if (!existing) {
        const { error } = await supabase
            .from("business_followers")
            .insert({ business_id: business.id, user_id: user.id });

        if (error) {
            failed = true;
        } else {
            followed = true;
            // Their welcome reward, if this business has one switched
            // on. It emails itself, so nothing here waits for it.
            await runAutomations({ businessId: business.id, userId: user.id }).catch(() => {});
        }
    }

    return (
        <Card business={business}>
            {failed ? (
                <>
                    <h1 className="mt-5 text-3xl font-semibold tracking-tight">Follow {business.name}</h1>
                    <Alert variant="destructive" className="mt-5">
                        <AlertTitle>That didn&apos;t work</AlertTitle>
                        <AlertDescription>
                            Open their page and press Follow, and you&apos;ll be on the list.
                        </AlertDescription>
                    </Alert>
                </>
            ) : (
                <>
                    <p className="mt-5 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-900">
                        <FiCheckCircle aria-hidden="true" />
                        {existing ? "You already follow them" : "You're following"}
                    </p>
                    <h1 className="mt-3 text-3xl font-semibold tracking-tight">{business.name}</h1>
                    <Reasons reasons={reasons} />
                </>
            )}

            <div className="mt-7 space-y-3">
                <Button
                    render={<Link href={businessPath(business)} />}
                    nativeButton={false}
                    className="h-12 w-full bg-[#FF593F] text-base text-white hover:bg-[#FF593F]/90"
                >
                    See what&apos;s on
                </Button>

                <Button
                    render={<Link href="/dashboard" />}
                    nativeButton={false}
                    variant="outline"
                    className="h-12 w-full"
                >
                    My vouchers and cards
                </Button>
            </div>

            {followed && !failed && (
                <p className="mt-4 text-center text-sm text-[#17233B]/60">
                    Every email has an unsubscribe link, and you can stop any time.
                </p>
            )}
        </Card>
    );
}

const icons = [FiGift, FiStar, FiMail];

function Reasons({ reasons }: { reasons: string[] }) {
    // Nothing true to say, on Free with no automations: better a short
    // page than three lines the business cannot keep.
    if (reasons.length === 0) {
        return null;
    }

    return (
        <ul className="mt-6 space-y-3">
            {reasons.map((text, index) => ({ text, icon: icons[index] })).map((reason) => (
                <li key={reason.text} className="flex items-start gap-3">
                    <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-[#FF593F]/10 text-[#FF593F]">
                        <reason.icon aria-hidden="true" className="size-3.5" />
                    </span>
                    <span className="text-[#17233B]/75">{reason.text}</span>
                </li>
            ))}
        </ul>
    );
}

function Card({
    business,
    children,
}: {
    business: { name: string; logo_url: string | null };
    children: React.ReactNode;
}) {
    const logo = storedImage(business.logo_url);

    return (
        <div className="mx-auto max-w-md px-6 py-14 sm:px-10">
            <div className="rounded-3xl border border-[#17233B]/10 bg-white p-7 text-[#17233B] shadow-sm">
                {logo ? (
                    <Image
                        src={logo}
                        alt=""
                        width={56}
                        height={56}
                        className="size-14 rounded-xl object-cover"
                    />
                ) : (
                    // The same stand-in the emails use: a letter beats a
                    // broken box for a business that never uploaded one.
                    <span
                        aria-hidden="true"
                        className="flex size-14 items-center justify-center rounded-xl bg-[#FF593F]/10 text-xl font-bold text-[#FF593F]"
                    >
                        {business.name.charAt(0).toUpperCase()}
                    </span>
                )}

                {children}
            </div>
        </div>
    );
}

function Gone() {
    return (
        <div className="mx-auto max-w-md px-6 py-14 sm:px-10">
            <div className="rounded-3xl border border-[#17233B]/10 bg-white p-7 text-[#17233B] shadow-sm">
                <h1 className="text-2xl font-semibold tracking-tight">This poster isn&apos;t working</h1>
                <p className="mt-3 text-[#17233B]/70">
                    The business it points at isn&apos;t on Promotello at the moment. Nothing has gone
                    wrong with your phone.
                </p>

                <Button
                    render={<Link href="/offers" />}
                    nativeButton={false}
                    className="mt-6 h-12 w-full bg-[#FF593F] text-base text-white hover:bg-[#FF593F]/90"
                >
                    See what&apos;s on nearby
                </Button>
            </div>
        </div>
    );
}

export default function FollowPage(props: PageProps) {
    return (
        <main className="min-h-dvh bg-[#FFF8F0]">
            <Suspense
                fallback={
                    <div className="mx-auto max-w-md px-6 py-14 sm:px-10">
                        <Skeleton className="h-72 w-full rounded-3xl" />
                    </div>
                }
            >
                <FollowView {...props} />
            </Suspense>
        </main>
    );
}
