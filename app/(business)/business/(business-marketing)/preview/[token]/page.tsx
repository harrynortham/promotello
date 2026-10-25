import { Suspense } from "react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { connection } from "next/server";
import { FiCheckCircle, FiGift, FiMapPin, FiUsers } from "react-icons/fi";

import { BrowserFrame, LoyaltyCardScreen, PosterVisual } from "@/components/product-visuals";
import { SubmitButton } from "@/components/submit-button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { qrSvg } from "@/lib/qr";
import { absoluteUrl } from "@/lib/site";
import { createClient } from "@/utils/supabase/server";
import { claimPreview } from "./actions";

// A private page showing a business how it would look on Promotello,
// built by us before they've signed up. The token in the link is the key.

export const metadata: Metadata = {
    title: "Your business on Promotello",
    robots: { index: false, follow: false },
};

type PageProps = {
    params: Promise<{ token: string }>;
    searchParams: Promise<{ error?: string }>;
};

type Preview = {
    business_id: string;
    business_name: string;
    category: string;
    description: string | null;
    logo_url: string | null;
    area: string | null;
    city: string | null;
    contact_name: string | null;
    sample_offer: string;
    sample_reward: string;
    sample_stamps: number;
    claimed: boolean;
};

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function Initials({ name }: { name: string }) {
    const letters = name.trim().split(/\s+/).slice(0, 2).map((word) => word.charAt(0)).join("").toUpperCase();
    return (
        <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-[#FFF4E8] text-xl font-semibold text-[#17233B]">
            {letters}
        </span>
    );
}

function BusinessPagePreview({ preview }: { preview: Preview }) {
    const where = [preview.area, preview.city].filter((part, index, parts) => part && parts.indexOf(part) === index).join(", ");

    return (
        <BrowserFrame url="promotello.com/businesses/…" label={`${preview.business_name}'s page on Promotello`}>
            <div className="bg-[#FFF8F0] p-5 text-[#17233B]">
                <div className="h-20 rounded-xl bg-[#17233B]" />
                <div className="-mt-7 flex items-end gap-3 px-3">
                    {preview.logo_url ? (
                        <Image
                            src={preview.logo_url}
                            alt=""
                            width={56}
                            height={56}
                            className="size-14 rounded-2xl border-4 border-white bg-white object-contain"
                        />
                    ) : (
                        <Initials name={preview.business_name} />
                    )}
                </div>
                <p className="mt-3 text-lg font-semibold">{preview.business_name}</p>
                <p className="mt-0.5 flex items-center gap-1 text-xs text-[#17233B]/70">
                    <FiMapPin aria-hidden="true" />
                    {[preview.category, where].filter(Boolean).join(" · ")}
                </p>
                {preview.description && (
                    <p className="mt-2 line-clamp-2 text-sm text-[#17233B]/70">{preview.description}</p>
                )}
                <div className="mt-4 rounded-xl border border-[#17233B]/10 bg-white p-3">
                    <span className="inline-flex rounded-full bg-[#C8371D] px-2.5 py-0.5 text-xs font-semibold text-white">Offer</span>
                    <p className="mt-1.5 text-sm font-semibold">{preview.sample_offer}</p>
                    <div className="mt-2 rounded-lg bg-[#C8371D] py-1.5 text-center text-xs font-semibold text-white">Claim offer</div>
                </div>
            </div>
        </BrowserFrame>
    );
}

function NotAvailable() {
    return (
        <section className="mx-auto max-w-xl px-6 py-24 text-center sm:px-10">
            <h1 className="text-3xl font-semibold tracking-tight">This preview isn&apos;t available</h1>
            <p className="mt-4 text-[#17233B]/65">
                The link may have expired. You can still add your business to Promotello in a few minutes.
            </p>
            <Button render={<Link href="/business/register" />} nativeButton={false} size="lg" className="mt-8">
                Add your business
            </Button>
        </section>
    );
}

async function PreviewContent({ params, searchParams }: PageProps) {
    await connection();

    const [{ token }, { error }] = await Promise.all([params, searchParams]);

    if (!uuid.test(token)) {
        return <NotAvailable />;
    }

    const supabase = await createClient();
    const [{ data }, { data: auth }] = await Promise.all([
        supabase.rpc("open_business_preview", { requested_token: token }),
        supabase.auth.getUser(),
    ]);
    const preview = (Array.isArray(data) ? data[0] : null) as Preview | null;

    if (!preview) {
        return <NotAvailable />;
    }

    if (preview.claimed) {
        return (
            <section className="mx-auto max-w-xl px-6 py-24 text-center sm:px-10">
                <h1 className="text-3xl font-semibold tracking-tight">{preview.business_name} has been claimed</h1>
                <p className="mt-4 text-[#17233B]/65">If that was you, sign in to manage it.</p>
                <Button render={<Link href="/login?next=/business/dashboard" />} nativeButton={false} size="lg" className="mt-8">
                    Sign in
                </Button>
            </section>
        );
    }

    const signedIn = Boolean(auth.user);
    const nextPath = `/business/preview/${token}`;
    const poster = await qrSvg(absoluteUrl(nextPath));

    const claim = (
        <div className="flex flex-col items-start gap-3">
            <form action={claimPreview}>
                <input type="hidden" name="token" value={token} />
                <SubmitButton pendingLabel="Claiming…" className="h-12 px-6 text-base">
                    {signedIn ? `Claim ${preview.business_name}` : `Claim ${preview.business_name} for free`}
                </SubmitButton>
            </form>
            {!signedIn && (
                <p className="text-sm text-[#17233B]/70">
                    You&apos;ll create an account first. Already have one?{" "}
                    <Link href={`/login?next=${encodeURIComponent(nextPath)}`} className="font-medium text-[#C8371D] underline">
                        Sign in
                    </Link>
                </p>
            )}
        </div>
    );

    return (
        <>
            <section className="mx-auto max-w-7xl px-6 pb-12 pt-14 sm:px-10 sm:pt-20">
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#C8371D]">
                    A preview made for {preview.business_name}
                </p>
                <h1 className="mt-4 max-w-3xl text-4xl font-semibold tracking-tight sm:text-5xl">
                    {preview.contact_name ? `Hi ${preview.contact_name}, here's` : "Here's"} {preview.business_name} on Promotello.
                </h1>
                <p className="mt-5 max-w-2xl text-lg leading-8 text-[#17233B]/70">
                    We&apos;ve set up your page, a digital loyalty card and a QR poster for your window, to show how
                    Promotello turns first-time visitors into regulars. Nothing is live until you claim it, and
                    you can change everything afterwards.
                </p>

                {error && (
                    <Alert variant="destructive" className="mt-6 max-w-xl">
                        <AlertTitle>Not claimed</AlertTitle>
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                )}

                <div className="mt-8">{claim}</div>
            </section>

            <section className="border-y border-[#17233B]/10 bg-white">
                <div className="mx-auto grid max-w-7xl items-start gap-12 px-6 py-14 sm:px-10 lg:grid-cols-3">
                    <div>
                        <h2 className="flex items-center gap-2 font-semibold">
                            <FiUsers aria-hidden="true" className="text-[#C8371D]" />
                            Your page
                        </h2>
                        <p className="mt-2 text-sm leading-6 text-[#17233B]/65">
                            Customers find you in the Promotello directory, follow you, and claim your offers.
                        </p>
                        <div className="mt-6">
                            <BusinessPagePreview preview={preview} />
                        </div>
                    </div>

                    <div>
                        <h2 className="flex items-center gap-2 font-semibold">
                            <FiGift aria-hidden="true" className="text-[#C8371D]" />
                            Your loyalty card
                        </h2>
                        <p className="mt-2 text-sm leading-6 text-[#17233B]/65">
                            Customers keep it on their phone. Staff stamp it by scanning, so no paper cards to lose.
                        </p>
                        <div className="mt-6 flex justify-center">
                            <LoyaltyCardScreen
                                businessName={preview.business_name}
                                required={preview.sample_stamps}
                                stamps={Math.max(1, preview.sample_stamps - 3)}
                                reward={preview.sample_reward}
                                headline={`Collect ${preview.sample_stamps} stamps for ${preview.sample_reward}`}
                            />
                        </div>
                    </div>

                    <div>
                        <h2 className="flex items-center gap-2 font-semibold">
                            <FiCheckCircle aria-hidden="true" className="text-[#C8371D]" />
                            Your window poster
                        </h2>
                        <p className="mt-2 text-sm leading-6 text-[#17233B]/65">
                            Print it in a minute. Every scan is counted, so you can see what&apos;s working.
                        </p>
                        <div className="mt-10 flex justify-center">
                            <PosterVisual qrSvg={poster} businessName={preview.business_name} headline={preview.sample_offer} />
                        </div>
                    </div>
                </div>
            </section>

            <section className="mx-auto max-w-7xl px-6 py-14 sm:px-10">
                <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-center">
                    <div>
                        <h2 className="text-2xl font-semibold tracking-tight">Free to claim. Pro is free for 30 days.</h2>
                        <ul className="mt-4 space-y-2 text-[#17233B]/70">
                            <li>Free plan: your page and one live offer, for as long as you like.</li>
                            <li>Pro: loyalty card, QR posters with scan counts, followers and unlimited offers.</li>
                            <li>Founding members in Bristol pay £19 a month for Pro, locked for life.</li>
                        </ul>
                        <p className="mt-4 text-sm text-[#17233B]/70">
                            <Link href="/business/pricing" className="underline">See pricing</Link> ·{" "}
                            <Link href="/business/how-it-works" className="underline">How it works</Link>
                        </p>
                    </div>
                    {claim}
                </div>
            </section>
        </>
    );
}

export default function BusinessPreviewPage(props: PageProps) {
    return (
        <main className="min-h-screen bg-[#FFF8F0] text-[#17233B]">
            <Suspense fallback={<div className="mx-auto max-w-7xl px-6 py-20 sm:px-10"><Skeleton className="h-96 rounded-3xl" /></div>}>
                <PreviewContent {...props} />
            </Suspense>
        </main>
    );
}
