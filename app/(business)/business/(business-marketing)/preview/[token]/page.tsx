import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { FiCheckCircle, FiGift, FiUsers } from "react-icons/fi";

import { BusinessPagePreview } from "@/components/business-page-preview";
import { LoyaltyCardScreen, PosterVisual } from "@/components/product-visuals";
import { SubmitButton } from "@/components/submit-button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { FOUNDING_MEMBER_LIMIT, plans } from "@/lib/billing";
import { qrSvg } from "@/lib/qr";
import { absoluteUrl } from "@/lib/site";
import { previewLink, tokenFromPreviewSegment } from "@/lib/previews";
import { createClient } from "@/utils/supabase/server";
import { claimPreview } from "./actions";
import { PreviewClaimed } from "./claimed";

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
    cover_image_url: string | null;
    area: string | null;
    city: string | null;
    contact_name: string | null;
    sample_offer: string;
    sample_reward: string;
    sample_stamps: number;
    claimed: boolean;
};


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

    const [{ token: segment }, { error }] = await Promise.all([params, searchParams]);
    const token = tokenFromPreviewSegment(segment);

    if (!token) {
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
        return <PreviewClaimed name={preview.business_name} />;
    }

    const signedIn = Boolean(auth.user);
    const town = preview.city?.trim() || null;
    // The street if we know it, the town otherwise. Never "your area".
    const nearby = preview.area?.trim() || town;
    const nextPath = previewLink(token, preview.business_name);
    const poster = await qrSvg(absoluteUrl(nextPath));

    const claim = (
        <div className="flex flex-col items-start gap-3">
            <form action={claimPreview}>
                <input type="hidden" name="token" value={token} />
                <input type="hidden" name="name" value={preview.business_name} />
                <SubmitButton pendingLabel="Claiming…" className="h-12 px-6 text-base">
                    {signedIn ? `Claim ${preview.business_name}` : `Claim ${preview.business_name} for free`}
                </SubmitButton>
            </form>
            <p className="text-sm text-[#17233B]/70">
                Free, and nothing goes public until you say so.
            </p>

            {!signedIn && (
                <p className="text-sm text-[#17233B]/70">
                    You&apos;ll create an account first. Already have one?{" "}
                    <Link href={`/login?next=${encodeURIComponent(nextPath)}`} className="font-medium text-[#FF593F] underline">
                        Sign in
                    </Link>
                </p>
            )}
        </div>
    );

    return (
        <>
            <section className="mx-auto max-w-7xl px-6 pb-12 pt-14 sm:px-10 sm:pt-20">
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#FF593F]">
                    A preview made for {preview.business_name}
                </p>
                <h1 className="mt-4 max-w-3xl text-4xl font-semibold tracking-tight sm:text-5xl">
                    {preview.contact_name ? `Hi ${preview.contact_name}, here's` : "Here's"} {preview.business_name} on Promotello.
                </h1>
                <p className="mt-5 max-w-2xl text-lg leading-8 text-[#17233B]/70">
                    We&apos;ve set up your page, a digital loyalty card and a QR poster for your window, to show how
                    Promotello turns first-time visitors into regulars.
                    {town && ` Your page sits in the ${town} directory, where people look for somewhere to go.`}
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
                            <FiUsers aria-hidden="true" className="text-[#FF593F]" />
                            Your page
                        </h2>
                        <p className="mt-2 text-sm leading-6 text-[#17233B]/65">
                            {town
                                ? `Customers browsing ${town} find you in the directory, follow you, and claim your offers.`
                                : "Customers find you in the Promotello directory, follow you, and claim your offers."}
                        </p>
                        <div className="mt-6">
                            <BusinessPagePreview
                                page={{
                                    name: preview.business_name,
                                    category: preview.category,
                                    area: preview.area,
                                    city: preview.city,
                                    description: preview.description,
                                    logoUrl: preview.logo_url,
                                    coverImageUrl: preview.cover_image_url,
                                    offer: preview.sample_offer,
                                }}
                            />
                        </div>
                    </div>

                    <div>
                        <h2 className="flex items-center gap-2 font-semibold">
                            <FiCheckCircle aria-hidden="true" className="text-[#FF593F]" />
                            Your offer, on a poster
                        </h2>
                        <p className="mt-2 text-sm leading-6 text-[#17233B]/65">
                            Print it in a minute and put it in the window. People scan it, claim your
                            offer on their phone, and show the code at the till.
                            {nearby ? ` Every scan on ${nearby} is counted, so you can see what's working.` : " Every scan is counted, so you can see what's working."}
                        </p>
                        <div className="mt-10 flex justify-center">
                            <PosterVisual
                                qrSvg={poster}
                                businessName={preview.business_name}
                                logoUrl={preview.logo_url}
                                headline={preview.sample_offer}
                            />
                        </div>
                    </div>

                    <div>
                        <h2 className="flex items-center gap-2 font-semibold">
                            <FiGift aria-hidden="true" className="text-[#FF593F]" />
                            Your loyalty card
                        </h2>
                        <p className="mt-2 text-sm leading-6 text-[#17233B]/65">
                            Customers keep it on their phone. Staff stamp it by scanning, so no paper cards to lose.
                        </p>
                        <div className="mt-6 flex justify-center">
                            <LoyaltyCardScreen
                                businessName={preview.business_name}
                                logoUrl={preview.logo_url}
                                required={preview.sample_stamps}
                                stamps={Math.max(1, preview.sample_stamps - 3)}
                                reward={preview.sample_reward}
                            />
                        </div>
                    </div>
                </div>
            </section>

            <section className="mx-auto max-w-7xl px-6 py-14 sm:px-10">
                <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-center">
                    <div>
                        <h2 className="text-2xl font-semibold tracking-tight">Free to claim. Pro is free for 30 days.</h2>
                        <ul className="mt-4 space-y-2 text-[#17233B]/70">
                            <li>Free plan: your page, one live offer and a QR poster for your window, for as long as you like.</li>
                            <li>Pro: loyalty card, a poster for every spot with scan counts, followers and unlimited offers.</li>
                            <li>The first {FOUNDING_MEMBER_LIMIT} businesses on Pro pay {plans.pro_founding_monthly.price} a month, locked for life.</li>
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
