import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { FiArrowRight, FiCheckCircle, FiGift, FiTag } from "react-icons/fi";

import { ExpiredPreview } from "./expired-preview";
import { BusinessPagePreview } from "@/components/business-page-preview";
import { OfferCard } from "@/components/offer-card";
import { LoyaltyCardScreen, PosterVisual } from "@/components/product-visuals";
import { SubmitButton } from "@/components/submit-button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { FOUNDING_MEMBER_LIMIT, FOUNDING_TRIAL_DAYS, TRIAL_DAYS, freeFor, plans } from "@/lib/billing";
import { foundingPlacesLeft } from "@/lib/founding-places";
import { qrSvg } from "@/lib/qr";
import { absoluteUrl } from "@/lib/site";
import { previewLink, tokenFromPreviewSegment } from "@/lib/previews";
import { createClient } from "@/utils/supabase/server";
import { claimPreview } from "./actions";
import { PreviewHeader } from "@/components/site/preview-header";
import { PreviewClaimed } from "./claimed";
import { RegisterLink } from "@/components/register-link";

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


// Laid out like the business 404, because it is the same kind of
// moment: something that was meant for you, and isn't there.
function NotAvailable() {
    return (
        <>
            <PreviewHeader />
        <section className="px-6 py-14 sm:py-20">
            <div className="mx-auto grid max-w-5xl items-center gap-12 lg:grid-cols-2 lg:gap-16">
                <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#FF593F]">
                        Preview unavailable
                    </p>

                    <h1 className="mt-5 text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
                        This preview isn&apos;t available
                    </h1>

                    <p className="mt-5 max-w-lg text-lg leading-8 text-[#17233B]/65">
                        The link may have expired. You can still add your business to
                        Promotello in a few minutes.
                    </p>

                    <Button render={<RegisterLink />} nativeButton={false} size="lg" className="mt-8">
                        Add your business
                        <FiArrowRight aria-hidden="true" />
                    </Button>
                </div>

                <ExpiredPreview />
            </div>
        </section>
        </>
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

    const signedIn = Boolean(auth.user);

    if (preview.claimed) {
        // Usually it was them, a moment ago, on another tab — so the page
        // says so and opens the business rather than offering a sign-in
        // button to somebody who is already signed in.
        const { data: membership } = signedIn
            ? await supabase
                  .from("business_members")
                  .select("business_id")
                  .eq("business_id", preview.business_id)
                  .eq("user_id", auth.user!.id)
                  .maybeSingle()
            : { data: null };

        return (
            <>
                <PreviewHeader />
                <PreviewClaimed
                    name={preview.business_name}
                    businessId={preview.business_id}
                    yours={Boolean(membership)}
                    signedIn={signedIn}
                />
            </>
        );
    }

    const town = preview.city?.trim() || null;
    // The street if we know it, the town otherwise. Never "your area".
    const nearby = preview.area?.trim() || town;
    const nextPath = previewLink(token, preview.business_name);
    const poster = await qrSvg(absoluteUrl(nextPath));

    // The scarcity belongs next to the press, not two clicks away on the
    // pricing page (docs/LAUNCH-FUNNEL.md).
    const placesLeft = await foundingPlacesLeft();

    // Whether there is still a founding place to be had. Null means we
    // could not count them, and promising one we cannot honour is worse
    // than not mentioning it.
    const founding = placesLeft !== null && placesLeft > 0;

    // The section of the directory this page would be listed in. Already
    // loaded for the page mock below, and never shown in words until now.
    const section = preview.category?.trim() || null;

    const claim = (
        // The header's button points here, so it needs somewhere to land.
        <div id="claim" className="flex scroll-mt-24 flex-col items-start gap-3">
            <form action={claimPreview}>
                <input type="hidden" name="token" value={token} />
                <input type="hidden" name="name" value={preview.business_name} />
                <SubmitButton pendingLabel="Claiming…" className="h-12 px-6 text-base">
                    {signedIn ? `Claim ${preview.business_name}` : `Claim ${preview.business_name} for free`}
                </SubmitButton>
            </form>
        </div>
    );

    return (
        <>
            {/* The only state with something to claim, so the only one
                whose header carries the button. */}
            <PreviewHeader token={token} />

            <section className="mx-auto max-w-7xl px-6 pb-12 pt-14 sm:px-10 sm:pt-20">
                {/* Their page beside the sentence that names it, rather
                    than a column further down. It is the thing being
                    offered, and the first screenful is where somebody
                    decides whether to read the rest. */}
                <div className="grid items-center gap-12 lg:grid-cols-[1.1fr_1fr] lg:gap-16">
                    <div>
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#FF593F]">
                    A preview made for {preview.business_name}
                </p>
                <h1 className="mt-4 max-w-3xl text-4xl font-semibold tracking-tight sm:text-5xl">
                    {preview.contact_name ? `Hi ${preview.contact_name}, here's` : "Here's"} {preview.business_name} on Promotello.
                </h1>
                <p className="mt-5 max-w-2xl text-lg leading-8 text-[#17233B]/70">
                    We&apos;ve set up your page, a digital loyalty card and a QR poster for your window, to show how
                    Promotello turns first-time visitors into regulars.
                    {/* The section, not just the directory. "The Bristol
                        directory" is a place in general; "under Bakeries"
                        is their place, and it is a page that already
                        exists with their competitors on it. */}
                    {town &&
                        (section
                            ? ` Your page sits in the ${town} directory, under ${section}, where people look for somewhere to go.`
                            : ` Your page sits in the ${town} directory, where people look for somewhere to go.`)}
                </p>

                {error && (
                    <Alert variant="destructive" className="mt-6 max-w-xl">
                        <AlertTitle>Not claimed</AlertTitle>
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                )}

                <div className="mt-8">{claim}</div>
                    </div>

                    <div className="flex justify-center lg:justify-end">
                        {/* No offer on it: the offer has its own card
                            below, drawn by the component the directory
                            uses, and two different pictures of the same
                            offer is one too many. */}
                        {/* A width of its own. The frame is a block in
                            a flex column, so without one it sizes to its
                            contents — and a business with a short
                            description got a visibly smaller page than
                            one with a long description, which is the
                            last thing a preview should vary by. */}
                        <BusinessPagePreview
                            className="w-full"
                            follow
                            offers={1}
                            page={{
                                name: preview.business_name,
                                category: preview.category,
                                area: preview.area,
                                city: preview.city,
                                description: preview.description,
                                logoUrl: preview.logo_url,
                                coverImageUrl: preview.cover_image_url,
                            }}
                        />
                    </div>
                </div>
            </section>

            <section className="border-y border-[#17233B]/10 bg-white">
                <div className="mx-auto grid max-w-7xl items-start gap-12 px-6 py-14 sm:px-10 lg:grid-cols-3">
                    <div>
                        <h2 className="flex items-center gap-2 font-semibold">
                            <FiTag aria-hidden="true" className="text-[#FF593F]" />
                            Your offer
                        </h2>
                        <p className="mt-2 text-sm leading-6 text-[#17233B]/65">
                            {town && section
                                ? `This is how it looks to someone browsing ${section.toLowerCase()} in ${town}. They claim it on their phone and show the code at the till.`
                                : "This is how it looks to someone browsing the directory. They claim it on their phone and show the code at the till."}
                        </p>
                        {/* The card the directory draws, not a drawing
                            of one — the same component /offers lists.
                            No slug: this offer does not exist until
                            they claim the page. */}
                        <div className="mt-6">
                            <OfferCard
                                slug=""
                                discount="Offer"
                                title={preview.sample_offer}
                                description="An example of what you could run. You write the real one when you claim the page."
                                availability="You choose the days and times"
                                business={preview.business_name}
                                businessLogoUrl={preview.logo_url}
                                imageUrl={preview.cover_image_url}
                                area={preview.area}
                                city={preview.city}
                                category={preview.category}
                                example
                            />
                        </div>
                    </div>

                    <div>
                        <h2 className="flex items-center gap-2 font-semibold">
                            <FiCheckCircle aria-hidden="true" className="text-[#FF593F]" />
                            Your poster
                        </h2>
                        <p className="mt-2 text-sm leading-6 text-[#17233B]/65">
                            Print it in a minute and put it in the window. People scan it, claim your
                            offer on their phone, and show the code at the till.
                            {nearby ? ` Every scan on ${nearby} is counted, so you can see what's working.` : " Every scan is counted, so you can see what's working."}
                        </p>
                        <div className="mt-10 flex justify-center">
                            <PosterVisual
                                width={300}
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
                        {/* The same component the marketing pages use,
                            which is the same card a customer holds. */}
                        <div className="mt-6 flex justify-center">
                            <LoyaltyCardScreen
                                businessName={preview.business_name}
                                logoUrl={preview.logo_url}
                                required={preview.sample_stamps}
                                reward={preview.sample_reward}
                                stamps={Math.max(1, preview.sample_stamps - 3)}
                            />
                        </div>
                    </div>
                </div>
            </section>

            <section className="mx-auto max-w-7xl px-6 py-14 sm:px-10">
                {/* The claim block is a button and a line of small
                    print, and "auto" was letting that print set the
                    column — 827px of it beside 341px of the words that
                    matter. Both columns are given a share instead, and
                    min-w-0 so neither can push the other out. */}
                <div className="grid gap-10 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] lg:items-center">
                    <div>
                        {/* The founding trial is three months, not the
                            ordinary thirty days — this said 30 to
                            somebody being offered 90, which is the one
                            number on the page they might check. */}
                        <h2 className="text-2xl font-semibold tracking-tight">
                            Free to claim. Pro is free for{" "}
                            {freeFor(founding ? FOUNDING_TRIAL_DAYS : TRIAL_DAYS)}.
                        </h2>
                        <ul className="mt-4 space-y-2 text-[#17233B]/70">
                            <li>Free plan: your page, one live offer and a QR poster for your window, for as long as you like.</li>
                            <li>Pro: loyalty card, a poster for every spot with scan counts, followers and unlimited offers.</li>
                            {founding && (
                                <li>
                                    The first {FOUNDING_MEMBER_LIMIT} businesses get{" "}
                                    {freeFor(FOUNDING_TRIAL_DAYS)} of Pro free, then{" "}
                                    {plans.pro_founding_monthly.price} a month instead of{" "}
                                    {plans.pro_monthly.price}, locked for life.
                                </li>
                            )}
                        </ul>
                        <p className="mt-4 text-sm text-[#17233B]/70">
                            <Link href="/business/pricing" className="underline">See pricing</Link> ·{" "}
                            <Link href="/business/how-it-works" className="underline">How it works</Link>
                        </p>

                        {/* The offer that converts somebody who likes it
                            and has no time: at fifty businesses this
                            costs an afternoon a week and is worth more
                            than any feature (docs/LAUNCH-FUNNEL.md). */}
                        <p className="mt-6 rounded-xl bg-white p-4 text-sm leading-6 text-[#17233B]/75">
                            <span className="font-semibold text-[#17233B]">No time for it?</span>{" "}
                            Claim the page and email us a photo of your shop and your opening
                            hours, and we&apos;ll finish the rest for you — you look at it
                            before anybody else does.{" "}
                            <Link href="/business/contact" className="font-medium underline underline-offset-4">
                                Ask us to set it up
                            </Link>
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
        <main className="flex-1 bg-[#FFF8F0] text-[#17233B]">
            <Suspense fallback={<div className="mx-auto max-w-7xl px-6 py-20 sm:px-10"><Skeleton className="h-96 rounded-3xl" /></div>}>
                <PreviewContent {...props} />
            </Suspense>
        </main>
    );
}
