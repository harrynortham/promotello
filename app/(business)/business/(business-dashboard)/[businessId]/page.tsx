import { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import { FiExternalLink } from "react-icons/fi";

import {
    BusinessOnboardingChecklist,
    type ChecklistGroup,
} from "@/components/business-onboarding-checklist";
import { BusinessRecentRedemptions } from "@/components/business-recent-redemptions";
import { FromYourEmail } from "@/components/from-your-email";
import { WhyNotApproved } from "@/components/why-not-approved";
import { reopenBusiness } from "./settings/actions";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { BackToFree } from "@/components/back-to-free";
import { loadWhatIsPaused } from "@/lib/what-is-paused";
import { TrialNeedsACard } from "@/components/trial-needs-a-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { businessHasPro, isLiveOffer } from "@/lib/billing";
import { readStarter, starterToShow } from "@/lib/starter";
import { businessPath } from "@/lib/slugs";
import { storedImage } from "@/lib/images";
import { createClient } from "@/utils/supabase/server";

type PageProps = {
    params: Promise<{
        businessId: string;
    }>;
    searchParams?: Promise<{ welcome?: string; reopened?: string; sent?: string; error?: string }>;
};

type OfferSummary = {
    id: string;
    title: string;
    approval_status: string;
    // What isLiveOffer needs: an expired or plan-paused offer is not
    // something to point a poster at. closed_at and review_requested_at
    // stood here and were never selected or read.
    expires_at: string;
    plan_paused_at: string | null;
    max_redemptions: number | null;
    redemption_count: number;
};

type RecentRedemption = {
    id: string;
    redemption_code: string;
    redeemed_at: string | null;
    used_at: string | null;
    offers:
    | {
        title: string;
        discount: string;
    }
    | {
        title: string;
        discount: string;
    }[]
    | null;
};

function LoadingState() {
    return (
        <div className="space-y-8">
            <div>
                <Skeleton className="h-5 w-40" />
                <Skeleton className="mt-3 h-10 w-72" />
                <Skeleton className="mt-3 h-5 w-96 max-w-full" />
            </div>

            <Skeleton className="h-64 rounded-xl" />

            <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
                {[1, 2, 3, 4].map((item) => (
                    <Skeleton key={item} className="h-28 rounded-xl sm:h-32" />
                ))}
            </div>

            <Skeleton className="h-64 rounded-xl" />
        </div>
    );
}

function statusClass(status: string) {
    if (status === "approved") {
        return "border-emerald-200 bg-emerald-100 text-emerald-800";
    }

    if (status === "rejected") {
        return "border-red-200 bg-red-100 text-red-800";
    }

    return "border-amber-200 bg-amber-100 text-amber-800";
}

async function BusinessOverviewContent({ params, searchParams }: PageProps) {
    await connection();

    const { businessId } = await params;
    const search = await searchParams;
    const isWelcome = search?.welcome === "1";
    const supabase = await createClient();

    const { data: business } = await supabase
        .from("businesses")
        .select(
            `
                id,
                slug,
                name,
                category,
                description,
                logo_url,
                cover_image_url,
                website_url,
                contact_email,
                approval_status,
                review_reason,
                review_note,
                closed_at,
                review_requested_at,
                google_review_url
            `,
        )
        .eq("id", businessId)
        .single();

    if (!business) {
        notFound();
    }

    const [
        { data: offerRows },
        { count: redemptionCount },
        { data: locations },
        { data: hours },
        { count: memberCount },
        { data: recentRedemptionRows },
        { count: printedPosterCount },
        { count: loyaltyCount },
        hasPro,
        starter,
        { data: trial },
    ] = await Promise.all([
        supabase
            .from("offers")
            .select(
                "id, title, approval_status, max_redemptions, redemption_count, expires_at, plan_paused_at",
            )
            .eq("business_id", businessId)
            .order("redemption_count", { ascending: false }),

        supabase
            .from("offer_redemptions")
            .select(
                `
                    id,
                    offers!inner (
                        business_id
                    )
                `,
                { count: "exact", head: true },
            )
            .eq("offers.business_id", businessId),

        supabase
            .from("business_locations")
            .select("id")
            .eq("business_id", businessId),

        supabase
            .from("business_hours")
            .select("day_of_week")
            .eq("business_id", businessId),

        supabase
            .from("business_members")
            .select("business_id", { count: "exact", head: true })
            .eq("business_id", businessId),

        supabase
            .from("offer_redemptions")
            .select(
                `
                    id,
                    redemption_code,
                    redeemed_at,
                    used_at,
                    offers!inner (
                        title,
                        discount,
                        business_id
                    )
                `,
            )
            .eq("offers.business_id", businessId)
            .order("redeemed_at", { ascending: false })
            .limit(5),

        supabase
            // Printed, not made: a code sitting in the dashboard has never
            // been in a window. poster_printed_at is set when the poster is
            // printed or saved as a PDF.
            .from("qr_codes")
            .select("id", { count: "exact", head: true })
            .eq("business_id", businessId)
            .is("archived_at", null)
            .not("poster_printed_at", "is", null),

        supabase
            .from("loyalty_programs")
            .select("id", { count: "exact", head: true })
            .eq("business_id", businessId),

        businessHasPro(supabase, businessId),

        // The offer and the reward we put in their preview email, so
        // the first screen after claiming is the thing they said yes to
        // rather than a blank form (docs/LAUNCH-FUNNEL.md).
        readStarter(supabase, businessId),

        // A trial can now start without a card, and then the day it ends
        // is the day Pro stops. The billing page says so and an email
        // says so five days out; neither is where a business spends its
        // time (docs/LAUNCH-FUNNEL.md).
        supabase
            .from("subscriptions")
            .select("status, trial_end, has_payment_method")
            .eq("business_id", businessId)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle(),
    ]);

    // One free trial per business (billing/actions.ts: trialEligible is
    // existing.length === 0). A business that has already had one is
    // offered a card form, not a trial, so offering it "Try Pro free" is
    // advertising something it cannot have.
    const trialSpent = Boolean(trial);
    const proCallToAction = trialSpent ? "Go Pro" : "Try Pro free";

    // Only for a business that had a plan and lost it: a healthy one pays
    // nothing for these, which is why they are not in the batch above.
    const backToFree = trialSpent && !hasPro;
    const whatIsPaused = backToFree ? await loadWhatIsPaused(supabase, businessId) : null;

    const trialNeedsACard =
        trial?.status === "trialing" && trial.has_payment_method === false && trial.trial_end
            ? trial.trial_end
            : null;

    const offers = (offerRows ?? []) as OfferSummary[];

    // Only the halves they haven't done themselves.
    const fromEmail = starterToShow(starter, {
        hasOffer: offers.length > 0,
        hasLoyalty: (loyaltyCount ?? 0) > 0,
    });

    const recentRedemptions =
        (recentRedemptionRows ?? []) as RecentRedemption[];

    const approvedOffers = offers.filter(
        (offer) => offer.approval_status === "approved",
    );

    const lowInventoryOffers = approvedOffers.filter((offer) => {
        if (offer.max_redemptions === null) {
            return false;
        }

        const remaining =
            offer.max_redemptions - offer.redemption_count;

        return remaining <= 10 && remaining > 0;
    });

    const totalClaims = offers.reduce(
        (total, offer) => total + offer.redemption_count,
        0,
    );

    const base = `/business/${businessId}`;

    // Live: customers can find them, so there is something to measure.
    // Awaiting send: the page has not yet reached the bar that puts it in
    // front of us, which is a thing that happens rather than a thing they
    // do (20270123090000_the_queue_fills_itself.sql).
    const isLive = business.approval_status === "approved" && !business.closed_at;
    const awaitingSend = business.approval_status === "pending" && !business.review_requested_at;


    // The offer a poster would open: live, and approved, since a poster
    // cannot point at one still being checked. Whichever has been claimed
    // most, because the offers come back in that order and the one that
    // already works on people is the one worth putting in the window.
    const posterOffer =
        offers.find(
            (offer) => offer.approval_status === "approved" && isLiveOffer(offer),
        ) ?? null;

    // One poster is the ask, and it is finished by any of them: a poster
    // aimed at the business page still lands somebody on the page, where
    // the offers and the card are both there to take. A poster aimed at
    // one thing is better — it puts that thing straight on the phone —
    // but it is not the only door, and asking a business that has
    // already taped something up for a second and a third is a chore
    // list rather than help.
    //
    // What it is aimed at decides the words while they have none, so the
    // one poster they do make is the one worth most: the card if they
    // hand one out, otherwise the offer they are running.
    const hasPoster = Boolean(printedPosterCount);
    const posterFor = loyaltyCount ? "loyalty" : posterOffer?.id ?? null;

    const checklist: ChecklistGroup[] = [
        {
            title: "Get ready to go live",
            description: "What customers see when they find you.",
            required: true,
            items: [
                {
                    id: "logo",
                    label: "Add your logo",
                    description: "Customers recognise you faster on offers and posters.",
                    completed: Boolean(business.logo_url),
                    href: `${base}/logo`,
                    action: "Add logo",
                },
                {
                    id: "description",
                    label: "Describe your business",
                    description: "A couple of sentences on what makes you worth a visit.",
                    completed: Boolean(business.description?.trim()),
                    href: `${base}/description`,
                    action: "Add description",
                },
                {
                    id: "location",
                    label: "Add your address",
                    description: "So customers can find you and get directions.",
                    completed: Boolean(locations?.length),
                    href: `${base}/address`,
                    action: "Add address",
                },
                {
                    id: "hours",
                    label: "Set your opening hours",
                    description: "Shown on your profile so nobody turns up to a closed door.",
                    completed: Boolean(hours?.length),
                    href: `${base}/hours`,
                    action: "Set hours",
                },
                {
                    id: "cover",
                    label: "Add a cover photo",
                    description: "The picture across the top of your page, and the one customers see in the directory.",
                    completed: Boolean(business.cover_image_url),
                    href: `${base}/cover`,
                    action: "Add cover photo",
                },
                {
                    id: "offer",
                    label: "Create your first offer",
                    description: "Give people a reason to visit. It goes live once approved.",
                    completed: offers.length > 0,
                    href: `${base}/offers/new`,
                    action: "Create offer",
                },
            ],
        },
        {
            title: "Bring in customers",
            description: "Optional, but this is where regulars come from.",
            required: false,
            items: [
                // One poster row, naming whichever poster is worth most.
                // A card with nothing pointing at it beats a second
                // general poster every time: it is the thing they are
                // paying for, and until a poster opens it the only way in
                // is a directory page they are not yet found on.
                // Named after what it will open, and sent to the
                // designer with that already chosen. "Print a QR poster"
                // pointing at an empty form left them a second decision
                // to make before anything happened.
                {
                    id: "qr",
                    label: loyaltyCount
                        ? "Put your loyalty card in the window"
                        : posterOffer
                            ? "Put your offer in the window"
                            : "Print a QR poster",
                    description: loyaltyCount
                        ? "A poster by the till puts your card straight on a customer's phone."
                        : posterOffer
                            ? `A poster is how somebody walking past finds “${posterOffer.title}”.`
                            : "Put it in your window or by the till so passers-by find your offers.",
                    completed: hasPoster,
                    href: posterFor ? `${base}/qr/new?for=${posterFor}` : `${base}/qr`,
                    action: "Make a poster",
                },
                {
                    id: "loyalty",
                    label: "Start a loyalty card",
                    description: "Digital stamps that turn first visits into regulars.",
                    completed: Boolean(loyaltyCount),
                    href: hasPro ? `${base}/loyalty` : `${base}/billing`,
                    action: hasPro ? "Set up card" : proCallToAction,
                    pro: !hasPro,
                },
                {
                    id: "reviews",
                    label: "Get more Google reviews",
                    description: "Customers who just visited are asked to leave you a review.",
                    completed: Boolean(business.google_review_url),
                    href: hasPro ? `${base}/edit` : `${base}/billing`,
                    action: hasPro ? "Add review link" : proCallToAction,
                    pro: !hasPro,
                },
                {
                    id: "team",
                    label: "Invite your team",
                    description: "So staff can check codes and stamp loyalty cards.",
                    completed: Boolean(memberCount && memberCount > 1),
                    href: `${base}/team`,
                    action: "Invite team",
                },
            ],
        },
    ];

    return (
        <div className="space-y-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#FF593F]">
                        Overview
                    </p>

                    <div className="mt-3 flex items-center gap-4">
                        {storedImage(business.logo_url) ? (
                            <Link
                                href={`/business/${businessId}/logo`}
                                aria-label="Change your logo"
                                className="shrink-0"
                            >
                                <Image
                                    src={storedImage(business.logo_url)!}
                                    alt=""
                                    width={64}
                                    height={64}
                                    className="size-16 rounded-xl border border-[#17233B]/10 bg-white object-cover shadow-sm"
                                />
                            </Link>
                        ) : (
                            // Until there's a logo, the initial stands in and leads to adding one.
                            <Link
                                href={`/business/${businessId}/logo`}
                                aria-label="Add your logo"
                                className="flex size-16 shrink-0 items-center justify-center rounded-xl border border-dashed border-[#FF593F]/40 bg-[#FFF4E8] text-2xl font-semibold text-[#FF593F] transition hover:border-[#FF593F]"
                            >
                                {business.name.charAt(0).toUpperCase()}
                            </Link>
                        )}

                        <h1 className="text-4xl font-semibold tracking-tight">
                            {business.name}
                        </h1>
                    </div>

                    {/* The first screen anybody sees. It says what
                        Promotello does for them rather than what this
                        screen is called, and it says the same thing on
                        day one and a year in — the card below it comes
                        and goes, so a line about what is in it would be
                        wrong half the time. */}
                    <p className="mt-3 max-w-2xl text-[#17233B]/65">
                        {isLive
                            ? `Everything ${business.name} does on Promotello, in one place: offers that bring people in, QR posters that get them scanning, and a loyalty card that brings them back. How it is all going is below.`
                            : `Everything ${business.name} will do on Promotello starts here: offers that bring people in, QR posters that get them scanning, and a loyalty card that brings them back. Nothing is public until we have checked your page, which is usually the same day.`}
                    </p>
                </div>
            </div>

            {isWelcome && !awaitingSend && (
                <Alert className="border-emerald-200 bg-emerald-50 text-emerald-900">
                    <AlertTitle>Welcome to Promotello, {business.name} is set up</AlertTitle>
                    <AlertDescription>
                        {business.approval_status === "approved"
                            ? "Your business is live. Pick up from the steps below."
                            : business.review_requested_at
                                ? "Our team checks every new business before it appears publicly. You can set everything up in the meantime, starting with the steps below."
                                : "It's yours now, and nothing is public yet. Have a look through what we set up and change anything that isn't right."}
                    </AlertDescription>
                </Alert>
            )}

            {business.closed_at && (
                <Alert className="border-[#FF593F]/30 bg-[#FF593F]/5">
                    <AlertTitle>This business is closed</AlertTitle>
                    <AlertDescription>
                        <p>
                            It has left the directory, its offers aren&apos;t showing and
                            nobody new can join its loyalty card. Nothing has been deleted,
                            and the stamps and vouchers your customers are holding are
                            still theirs. Anything else you run is unaffected.
                        </p>

                        <form action={reopenBusiness} className="mt-4">
                            <input type="hidden" name="businessId" value={businessId} />
                            <Button type="submit" size="sm">
                                Reopen {business.name}
                            </Button>
                        </form>
                    </AlertDescription>
                </Alert>
            )}

            {search?.reopened && !business.closed_at && (
                <Alert className="border-emerald-200 bg-emerald-50 text-emerald-900">
                    <AlertTitle>{business.name} is open again</AlertTitle>
                    <AlertDescription>
                        It is back in the directory exactly as it was, with its offers and
                        its loyalty card.
                    </AlertDescription>
                </Alert>
            )}

            {search?.error === "reopen" && (
                <Alert variant="destructive">
                    <AlertTitle>We couldn&apos;t reopen it</AlertTitle>
                    <AlertDescription>Please try again.</AlertDescription>
                </Alert>
            )}

            {awaitingSend && (
                <Alert id="send-for-review" className="scroll-mt-24 border-[#FF593F]/30 bg-[#FF593F]/5">
                    <AlertTitle>Your page isn&apos;t live yet</AlertTitle>
                    <AlertDescription>
                        {/* There is nothing to press any more: the page
                            comes to us on its own once it is a listing
                            (20270123090000_the_queue_fills_itself.sql).
                            Saying what makes that happen is the whole of
                            what the button used to say. */}
                        <p>
                            {isWelcome ? "It's yours now. " : ""}Open it to see what a customer
                            would see, and work down the list below. It comes to us on its own
                            once it has a description, an address and your opening hours —
                            there&apos;s nothing to send. Nothing is public until we&apos;ve
                            checked it.
                        </p>

                        {/* "This page" read as the dashboard, which is where they
                            are standing. The page it means is a click away. */}
                        <div className="mt-4 flex flex-wrap items-center gap-2">
                            <Button
                                render={<Link href={businessPath(business)} target="_blank" rel="noreferrer" />}
                                nativeButton={false}
                                variant="outline"
                                size="sm"
                            >
                                See your page
                                <FiExternalLink aria-hidden="true" />
                            </Button>

                        </div>
                    </AlertDescription>
                </Alert>
            )}

            {business.approval_status === "pending" && business.review_requested_at && !isWelcome && (
                <Alert className="border-amber-200 bg-amber-50 text-amber-900">
                    <AlertTitle>{business.name} is with us</AlertTitle>
                    <AlertDescription>
                        We check every page before it goes on the directory — usually the
                        same day — and we&apos;ll email you the moment yours does. Carry
                        on in the meantime: everything here works, and your offers are
                        read one by one as you write them.
                    </AlertDescription>
                </Alert>
            )}

            {(business.approval_status === "rejected" || business.approval_status === "suspended") && (
                <div className="space-y-3">
                    <Alert variant="destructive">
                        <AlertTitle>
                            {business.approval_status === "rejected" ? "Your business wasn't approved" : "Your business is suspended"}
                        </AlertTitle>
                        <AlertDescription>
                            It isn&apos;t visible to customers.{" "}
                            {business.approval_status === "suspended"
                                ? "Nothing is deleted: your offers, your loyalty cards and their stamps are all still here."
                                : null}{" "}
                            <Link href="/business/contact" className="underline underline-offset-4">
                                Contact us
                            </Link>{" "}
                            and we&apos;ll help sort it out.
                        </AlertDescription>
                    </Alert>

                    {/* The reason, where they are when they read the
                        banner — rather than in an email they have to go
                        and find. */}
                    <WhyNotApproved
                        of="business"
                        action={business.approval_status === "suspended" ? "suspended" : "rejected"}
                        reason={business.review_reason}
                        note={business.review_note}
                    />
                </div>
            )}

            {trialNeedsACard && (
                <TrialNeedsACard businessId={businessId} trialEnd={trialNeedsACard} />
            )}

            {whatIsPaused && <BackToFree businessId={businessId} standing={whatIsPaused} />}

            {/* Above the checklist: what they came for comes before the
                list of what we want from them. */}
            <FromYourEmail businessId={businessId} offer={fromEmail.offer} card={fromEmail.card} />

            <BusinessOnboardingChecklist groups={checklist} setupHref={`/business/setup/${businessId}`} />

            {isLive && (
            // Two across on a phone: four counts stacked full width is
            // most of a screen given over to four numbers.
            <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm font-medium text-[#17233B]/70">
                            Total offers
                        </CardTitle>
                    </CardHeader>

                    <CardContent>
                        <p className="text-3xl font-semibold sm:text-4xl">
                            {offers.length}
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm font-medium text-[#17233B]/70">
                            Approved offers
                        </CardTitle>
                    </CardHeader>

                    <CardContent>
                        <p className="text-3xl font-semibold sm:text-4xl">
                            {approvedOffers.length}
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm font-medium text-[#17233B]/70">
                            Total claims
                        </CardTitle>
                    </CardHeader>

                    <CardContent>
                        <p className="text-3xl font-semibold sm:text-4xl">
                            {totalClaims}
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm font-medium text-[#17233B]/70">
                            Redemptions
                        </CardTitle>
                    </CardHeader>

                    <CardContent>
                        <p className="text-3xl font-semibold sm:text-4xl">
                            {redemptionCount ?? 0}
                        </p>
                    </CardContent>
                </Card>
            </div>
            )}

            {lowInventoryOffers.length > 0 && (
                <Alert className="border-orange-200 bg-orange-50 text-orange-800">
                    <AlertTitle>
                        Offers nearing their limits
                    </AlertTitle>

                    <AlertDescription>
                        {lowInventoryOffers.length} offer
                        {lowInventoryOffers.length === 1 ? "" : "s"} has
                        limited redemptions remaining.
                    </AlertDescription>
                </Alert>
            )}

            {isLive && (
            <Card>
                <CardHeader>
                    <CardTitle>Offer performance</CardTitle>
                </CardHeader>

                <CardContent>
                    {offers.length === 0 ? (
                        <Alert>
                            <AlertTitle>No offers yet</AlertTitle>

                            <AlertDescription>
                                Create your first offer to start reaching
                                customers.
                            </AlertDescription>

                            <Button
                                render={
                                    <Link
                                        href={`/business/${businessId}/offers/new`}
                                    />
                                }
                                nativeButton={false}
                                size="sm"
                                className="mt-5"
                            >
                                Create offer
                            </Button>
                        </Alert>
                    ) : (
                        <div className="space-y-5">
                            {offers.slice(0, 5).map((offer) => {
                                const usage =
                                    offer.max_redemptions &&
                                        offer.max_redemptions > 0
                                        ? Math.min(
                                            Math.round(
                                                (offer.redemption_count /
                                                    offer.max_redemptions) *
                                                100,
                                            ),
                                            100,
                                        )
                                        : 0;

                                return (
                                    <div key={offer.id}>
                                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                            <div>
                                                <h3 className="font-semibold">
                                                    {offer.title}
                                                </h3>

                                                <Badge
                                                    variant="outline"
                                                    className={`mt-2 capitalize ${statusClass(
                                                        offer.approval_status,
                                                    )}`}
                                                >
                                                    {offer.approval_status}
                                                </Badge>
                                            </div>

                                            <p className="text-sm font-semibold text-[#FF593F]">
                                                {offer.redemption_count} claimed
                                            </p>
                                        </div>

                                        {offer.max_redemptions !== null && (
                                            <div className="mt-4">
                                                <div className="flex justify-between text-xs text-[#17233B]/70">
                                                    <span>Usage limit</span>

                                                    <span>
                                                        {offer.redemption_count}{" "}
                                                        of{" "}
                                                        {offer.max_redemptions}
                                                    </span>
                                                </div>

                                                <Progress
                                                    value={usage}
                                                    className="mt-2 h-2"
                                                />
                                            </div>
                                        )}

                                        <Separator className="mt-5" />
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </CardContent>
            </Card>

            )}

            {isLive && (
            <BusinessRecentRedemptions
                businessId={businessId}
                redemptions={recentRedemptions.map((redemption) => {
                    const offer = Array.isArray(redemption.offers)
                        ? redemption.offers[0]
                        : redemption.offers;

                    return {
                        id: redemption.id,
                        redemption_code: redemption.redemption_code,
                        redeemed_at: redemption.redeemed_at,
                        used_at: redemption.used_at,
                        offer: offer
                            ? {
                                title: offer.title,
                                discount: offer.discount,
                            }
                            : null,
                    };
                })}
            />
            )}

            <Card>
                <CardHeader>
                    <CardTitle>Quick actions</CardTitle>
                </CardHeader>

                <CardContent className="flex flex-wrap gap-3">
                    <Button
                        render={
                            <Link href={`/business/${businessId}/offers`} />
                        }
                        nativeButton={false}
                        variant="outline"
                        size="sm"
                    >
                        Manage offers
                    </Button>

                    <Button
                        render={
                            <Link
                                href={`/business/${businessId}/redemptions`}
                            />
                        }
                        nativeButton={false}
                        variant="outline"
                        size="sm"
                    >
                        View redemptions
                    </Button>

                    <Button
                        render={
                            <Link
                                href={`/business/${businessId}/analytics`}
                            />
                        }
                        nativeButton={false}
                        variant="outline"
                        size="sm"
                    >
                        View analytics
                    </Button>

                    {/* No sales pack here. It is a thing we print to sell
                        with, not a thing a business does with their own
                        page — and this dashboard belongs to them even
                        when an admin is the one looking at it. Admins
                        reach it from Sales, through the demo business. */}
                </CardContent>
            </Card>
        </div>
    );
}

export default function BusinessOverviewPage({ params, searchParams }: PageProps) {
    return (
        <Suspense fallback={<LoadingState />}>
            <BusinessOverviewContent params={params} searchParams={searchParams} />
        </Suspense>
    );
}