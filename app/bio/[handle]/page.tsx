import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { notFound, redirect } from "next/navigation";
import {
    FiArrowUpRight,
    FiBookOpen,
    FiCalendar,
    FiGift,
    FiGlobe,
    FiMapPin,
    FiPhone,
    FiTag,
} from "react-icons/fi";

import { SubmitButton } from "@/components/submit-button";
import { claimPreview } from "@/app/(business)/business/preview/[token]/actions";
import { ExampleBadge } from "@/components/example-badge";
import { PageViewTracker } from "@/components/page-view-tracker";
import { SocialLinks } from "@/components/social-links";
import { addressParts, directionsUrl } from "@/lib/address";
import { storedImage } from "@/lib/images";
import { cardLine } from "@/lib/loyalty-state";
import { DEFAULT_STAMPS, readStarterRow } from "@/lib/starter";
import { absoluteUrl, siteName, truncate } from "@/lib/site";
import { previewLink } from "@/lib/previews";
import { businessPath, offerPath } from "@/lib/slugs";
import { socialsOf } from "@/lib/social-links";
import { createClient } from "@/utils/supabase/server";

// The page a business puts in its Instagram bio.
//
// Served at /@theirhandle by a rewrite in proxy.ts, because a folder
// called "@..." in app/ is a parallel route slot rather than a path.
//
// It is not the business page with the furniture taken off. Somebody
// arriving here came from a bio on a phone, has one thumb and about
// four seconds, and wants one of five things: what's on, the card, the
// menu, a table, or the way there. So it is a column of buttons in that
// order, and nothing else — no directory, no search, no other
// businesses, nothing of ours above theirs.
//
// Which is the whole bargain. A business swaps its bio link for this
// one because this one is better for them than what was there, and
// their followers arrive on Promotello as a side effect. The moment it
// reads as our page with their name on it, they take it down.

type PageProps = {
    params: Promise<{ handle: string }>;
    // ?c=<token> is the one-tap claim, for a business we messaged on
    // purpose. The token is the proof, exactly as it is in the preview
    // link -- this is the same secret on an address that reads as
    // theirs, because nobody opens a /business/preview/... URL from a
    // DM (20270315090000).
    searchParams?: Promise<{ c?: string; error?: string }>;
};

type BioBusiness = {
    id: string;
    slug: string;
    name: string;
    approval_status: string;
    description: string | null;
    logo_url: string | null;
    cover_image_url: string | null;
    category: string;
    website_url: string | null;
    menu_url: string | null;
    booking_url: string | null;
    phone: string | null;
    instagram_url: string | null;
    facebook_url: string | null;
    x_url: string | null;
    youtube_url: string | null;
    linkedin_url: string | null;
    tiktok_url: string | null;
    business_locations: {
        address_line_1: string | null;
        address_line_2: string | null;
        city: string | null;
        region: string | null;
        postal_code: string | null;
        country_code: string | null;
    }[];
};

async function findByHandle(handle: string) {
    const supabase = await createClient();

    const { data: row } = await supabase
        .from("business_handles")
        .select("business_id, is_current, handle")
        .eq("handle", handle.toLowerCase())
        .maybeSingle();

    if (!row) return { business: null, movedTo: null };

    // RLS decides whether this business is anybody's to see. A handle
    // for a page that is not public resolves to nothing, exactly as the
    // business page would.
    const { data: business } = await supabase
        .from("businesses")
        .select(
            `
                id, slug, name, approval_status, description, logo_url, cover_image_url, category,
                website_url, menu_url, booking_url, phone,
                instagram_url, facebook_url, x_url, youtube_url, linkedin_url, tiktok_url,
                business_locations (
                    address_line_1, address_line_2, city, region, postal_code, country_code
                )
            `,
        )
        .eq("id", row.business_id)
        .maybeSingle();

    if (!business) return { business: null, movedTo: null };

    if (!row.is_current) {
        // They changed their handle. The old one keeps working, which is
        // the point of keeping it, and sends people to the new address
        // so the one in circulation slowly becomes the right one.
        const { data: current } = await supabase
            .from("business_handles")
            .select("handle")
            .eq("business_id", row.business_id)
            .eq("is_current", true)
            .maybeSingle();

        return { business: business as BioBusiness, movedTo: current?.handle ?? null };
    }

    return { business: business as BioBusiness, movedTo: null };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    await connection();

    const { handle } = await params;
    const { business } = await findByHandle(handle);

    if (!business) return { title: "Not found", robots: { index: false } };

    return {
        title: { absolute: `${business.name} on ${siteName}` },
        description: truncate(
            business.description || `${business.name}: what's on, and how to find us.`,
        ),
        // Their business page is the one search engines should rank.
        // This is the same business said twice, and the bio link is for
        // people arriving from a bio rather than from a search.
        alternates: { canonical: absoluteUrl(businessPath(business)) },
        robots: { index: false, follow: true },
    };
}

// The link we sent them. One button, because the person reading it was
// written to by name and has already been asked -- the form beside this
// one is for a stranger who found the page, and asking somebody twice
// is how you lose them on a phone.
// What we drew up for them, marked as what it is. Never shown without
// the token: an example offer on a page for a real café is something
// somebody can walk in and ask for.
//
// Two rows in the same shape as Find us and Our website, because this
// is a page of rows and an example that arrives as a slab of its own
// reads as an advert dropped into one. The offer is here in words.
// The card is not drawn: it is a card, it wants a phone around it, and
// the preview page already puts it in one.
function Examples({
    offer,
    reward,
    stamps,
    customerView,
}: {
    offer: string | null;
    reward: string | null;
    stamps: number;
    // The preview page, which shows each of these the way somebody
    // browsing the directory meets it.
    customerView: string;
}) {
    if (!offer && !reward) return null;

    return (
        <section className="rounded-2xl border border-[#17233B]/10 bg-white p-5">
            <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#17233B]/55">
                    What your page could carry
                </p>
                <ExampleBadge />
            </div>

            <div className="mt-4 flex flex-col gap-3">
                {offer && (
                    <Action
                        href={`${customerView}#offer`}
                        icon={FiTag}
                        label="Your offer"
                        note={offer}
                    />
                )}

                {reward && (
                    <Action
                        href={`${customerView}#card`}
                        icon={FiGift}
                        label="Your loyalty card"
                        note={cardLine(stamps, reward)}
                    />
                )}
            </div>

            <p className="mt-4 text-sm leading-6 text-[#17233B]/65">
                Examples, not promises — we wrote them to show you the shape of it. Claim the page
                and the words are yours.
            </p>
        </section>
    );
}

function OneTap({
    token,
    businessName,
    error,
}: {
    token: string;
    businessName: string;
    error: string | null;
}) {
    return (
        <section className="rounded-2xl border border-[#FF593F]/25 bg-[#FF593F]/[0.04] p-6 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#FF593F]">
                Your page
            </p>
            <h2 className="mt-2 text-xl font-semibold tracking-tight">
                This one is yours, {businessName}
            </h2>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-[#17233B]/75">
                We built it for you. Claim it and it&apos;s yours to change — your photos, your
                words, an offer people claim on their phone. Free to claim and free to keep.
            </p>

            {error && (
                <p className="mt-4 rounded-lg bg-white px-3 py-2 text-sm text-red-700">{error}</p>
            )}

            <form action={claimPreview} className="mt-5">
                <input type="hidden" name="token" value={token} />
                <input type="hidden" name="name" value={businessName} />

                <SubmitButton pendingLabel="Claiming…" className="h-12 w-full text-base">
                    Claim {businessName}
                </SubmitButton>
            </form>

            <p className="mt-3 text-xs text-[#17233B]/60">
                Not your business? Nothing happens until you press it.
            </p>
        </section>
    );
}

function Action({
    href,
    icon: Icon,
    label,
    note,
    external = false,
    lead = false,
}: {
    href: string;
    icon: typeof FiGift;
    label: string;
    note?: string | null;
    external?: boolean;
    lead?: boolean;
}) {
    const className = `flex items-center gap-3 rounded-2xl border px-5 py-4 transition ${
        lead
            ? "border-transparent bg-[#FF593F] text-white hover:bg-[#e8462e]"
            : "border-[#17233B]/12 bg-white hover:border-[#FF593F]/40 hover:shadow-sm"
    }`;

    const inside = (
        <>
            <Icon aria-hidden="true" className={`size-5 shrink-0 ${lead ? "" : "text-[#FF593F]"}`} />
            <span className="min-w-0 flex-1">
                <span className="block font-semibold leading-6">{label}</span>
                {note && (
                    <span className={`block text-sm leading-5 ${lead ? "text-white/85" : "text-[#17233B]/65"}`}>
                        {note}
                    </span>
                )}
            </span>
            <FiArrowUpRight aria-hidden="true" className="size-4 shrink-0 opacity-60" />
        </>
    );

    if (external) {
        return (
            <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
                {inside}
            </a>
        );
    }

    return (
        <Link href={href} className={className}>
            {inside}
        </Link>
    );
}

// A shell that prerenders, and the page inside it that cannot: the
// handle is looked up on every request and the offers are read live.
// Same shape as the business page, and the reason for it is the same —
// without the boundary the whole route bails out of prerendering and
// Next says so on every request.
export default function BioPage({ params, searchParams }: PageProps) {
    return (
        <Suspense fallback={<Loading />}>
            <BioContent params={params} searchParams={searchParams} />
        </Suspense>
    );
}

function Loading() {
    return (
        <main className="min-h-screen bg-[#FFF8F0]">
            <div className="mx-auto w-full max-w-lg px-5 py-10" role="status" aria-label="Loading">
                <div className="mx-auto size-20 animate-pulse rounded-2xl bg-[#17233B]/10" />
                <div className="mx-auto mt-4 h-7 w-48 animate-pulse rounded bg-[#17233B]/10" />
                <div className="mt-8 space-y-3">
                    {[0, 1, 2].map((row) => (
                        <div key={row} className="h-16 animate-pulse rounded-2xl bg-[#17233B]/10" />
                    ))}
                </div>
            </div>
        </main>
    );
}

async function BioContent({ params, searchParams }: PageProps) {
    await connection();

    const { handle } = await params;
    const { c: offeredToken, error: claimError } = (await searchParams) ?? {};
    const { business, movedTo } = await findByHandle(handle);

    if (!business) notFound();

    if (movedTo) redirect(`/@${movedTo}`);

    const supabase = await createClient();
    const today = new Date().toISOString().slice(0, 10);

    const [{ data: offers }, { data: cards }] = await Promise.all([
        supabase
            .from("offers")
            .select("id, slug, title, discount")
            .eq("business_id", business.id)
            .eq("approval_status", "approved")
            .gte("expires_at", today)
            .is("plan_paused_at", null)
            .order("created_at", { ascending: false })
            .limit(3),
        supabase
            .from("loyalty_programs")
            .select("id, stamps_required, reward")
            .eq("business_id", business.id)
            .eq("is_active", true)
            .is("closed_at", null)
            .limit(1),
    ]);

    const location = business.business_locations?.[0] ?? null;
    const lines = addressParts(location);
    const directions = directionsUrl(lines);
    const where = [location?.region, location?.city]
        .filter((part, index, parts) => part && parts.indexOf(part) === index)
        .join(", ");
    const card = cards?.[0] ?? null;

    // A page nobody has claimed, which is the one we send a business to
    // from an Instagram message. Everybody else arrives here from a bio
    // that only exists once somebody has claimed it, so on an unclaimed
    // page the owner is the likeliest reader by a distance — and there
    // are no offers to push down, because an unclaimed page cannot have
    // any (20270307090000).
    const unclaimed = business.approval_status !== "approved";

    // Only a token that actually claims this business, and only while
    // it still would. Anything else gets the ordinary panel, which asks
    // rather than hands anything over.
    const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    // One call does both: a row back means the token claims this
    // business, and it is also the offer and card we drew up for them.
    const { data: exampleRows } =
        unclaimed && offeredToken && uuid.test(offeredToken)
            ? await supabase.rpc("preview_examples", {
                requested_business_id: business.id,
                candidate: offeredToken,
            })
            : { data: null };

    const examples = readStarterRow(exampleRows);
    const tokenClaims = Boolean(
        exampleRows && (Array.isArray(exampleRows) ? exampleRows.length > 0 : true),
    );
    const logo = storedImage(business.logo_url);
    const cover = storedImage(business.cover_image_url);
    // Every link out carries where it came from, so the business can be
    // told whether its bio is worth the slot it takes up.
    const onward = (path: string) => `${path}?ref=bio`;

    return (
        <main className="min-h-screen bg-[#FFF8F0] pb-16 text-[#17233B]">
            <PageViewTracker businessId={business.id} source="bio" />

            <div className="mx-auto w-full max-w-lg px-5">
                {cover && (
                    <div className="relative mt-5 aspect-[16/9] overflow-hidden rounded-2xl">
                        <Image src={cover} alt="" fill sizes="(min-width: 640px) 32rem, 100vw" className="object-cover" />
                    </div>
                )}

                <header className={`relative text-center ${cover ? "-mt-10" : "mt-10"}`}>
                    {logo ? (
                        <Image
                            src={logo}
                            alt=""
                            width={96}
                            height={96}
                            className="mx-auto size-20 rounded-2xl border-4 border-[#FFF8F0] object-cover shadow-sm"
                        />
                    ) : (
                        <span className="mx-auto flex size-20 items-center justify-center rounded-2xl border-4 border-[#FFF8F0] bg-white text-2xl font-semibold text-[#FF593F] shadow-sm">
                            {business.name.charAt(0).toUpperCase()}
                        </span>
                    )}

                    <h1 className="mt-3 text-2xl font-semibold tracking-tight">{business.name}</h1>
                    <p className="mt-1 text-sm text-[#17233B]/65">
                        {business.category}
                        {where ? ` · ${where}` : ""}
                    </p>

                    {business.description && (
                        <p className="mx-auto mt-3 max-w-sm text-[15px] leading-6 text-[#17233B]/75">
                            {truncate(business.description, 160)}
                        </p>
                    )}
                </header>

                {/* Only on the link we sent them, and only with the
                    token on it. The ordinary "is this your business?"
                    panel is on the business page and belongs there: on
                    a bio page it is a form shown to a customer, about a
                    page they do not own, saying out loud that nobody
                    has claimed it. */}
                {unclaimed && tokenClaims && (
                    <div className="mt-7 space-y-5">
                        {/* The pitch before the ask: a mock-up of their
                            own page beats any description of one. */}
                        <Examples
                            offer={examples.offer}
                            reward={examples.reward}
                            stamps={examples.stamps ?? DEFAULT_STAMPS}
                            customerView={previewLink(offeredToken!, business.name)}
                        />

                        <OneTap
                            token={offeredToken!}
                            businessName={business.name}
                            error={claimError ?? null}
                        />
                    </div>
                )}

                <div className="mt-7 space-y-3">
                    {/* What's on, first and loudest. It is the only thing
                        here somebody can take away with them today. */}
                    {(offers ?? []).map((offer, index) => (
                        <Action
                            key={offer.id}
                            href={onward(offerPath(offer))}
                            icon={FiGift}
                            label={offer.discount}
                            note={offer.title}
                            lead={index === 0}
                        />
                    ))}

                    {/* Straight to the card rather than to the page it
                        sits on. Somebody who pressed this was promised
                        stamps, and a directory listing with the card
                        somewhere down it is an extra scroll between
                        them and the thing they asked for. */}
                    {card && (
                        <Action
                            href={onward(`/join/${card.id}`)}
                            icon={FiGift}
                            label="Collect stamps with us"
                            note={cardLine(card.stamps_required, card.reward)}
                            lead={(offers ?? []).length === 0}
                        />
                    )}

                    {business.booking_url && (
                        <Action href={business.booking_url} icon={FiCalendar} label="Book with us" external />
                    )}

                    {business.menu_url && (
                        <Action href={business.menu_url} icon={FiBookOpen} label="See the menu" external />
                    )}

                    {directions && (
                        <Action
                            href={directions}
                            icon={FiMapPin}
                            label="Find us"
                            note={lines.join(", ")}
                            external
                        />
                    )}

                    {business.phone && (
                        <Action
                            href={`tel:${business.phone.replace(/\s+/g, "")}`}
                            icon={FiPhone}
                            label="Call us"
                            note={business.phone}
                            external
                        />
                    )}

                    {business.website_url && (
                        <Action href={business.website_url} icon={FiGlobe} label="Our website" external />
                    )}
                </div>

                {socialsOf(business).length > 0 && (
                    <div className="mt-7 flex justify-center">
                        <SocialLinks business={business} businessName={business.name} />
                    </div>
                )}

                {/* Ours, at the bottom, the size of a credit. Anything
                    louder and this stops being their page. */}
                <p className="mt-10 text-center text-xs text-[#17233B]/50">
                    <Link href={onward(businessPath(business))} className="hover:text-[#FF593F]">
                        {business.name} on {siteName}
                    </Link>
                </p>
            </div>
        </main>
    );
}
