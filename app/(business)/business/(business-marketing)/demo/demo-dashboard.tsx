"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import {
    FiArrowRight,
    FiAward,
    FiBarChart2,
    FiCamera,
    FiCheckCircle,
    FiGift,
    FiGrid,
    FiHeart,
    FiHome,
    FiShoppingBag,
    FiSmartphone,
    FiStar,
} from "react-icons/fi";

import { BusinessCard } from "@/components/business-card";
import { PeriodSummary, type BusinessAnalytics } from "@/components/business-period-summary";
import { LoyaltyCard } from "@/components/loyalty-card";
import { LoyaltyStamps } from "@/components/loyalty-stamps";
import { OfferCard } from "@/components/offer-card";
import { QrPoster } from "@/components/qr-poster";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { VoucherQr } from "@/components/voucher-qr";

const business = "Harbour Grind";

// The dashboard's own pages, in its own order and under its own names, so
// someone who signs up after the demo looks for what they already saw.
const tabs = [
    { id: "overview", label: "Overview", icon: FiHome },
    { id: "profile", label: "Business profile", icon: FiShoppingBag },
    { id: "offers", label: "Offers", icon: FiGift },
    { id: "posters", label: "QR posters", icon: FiGrid },
    { id: "loyalty", label: "Loyalty card", icon: FiAward },
    { id: "redemptions", label: "Redemptions", icon: FiCheckCircle },
    { id: "results", label: "Analytics", icon: FiBarChart2 },
    { id: "customer", label: "What customers see", icon: FiSmartphone },
] as const;

// The redemptions page lists what staff have marked used at the till.
const redemptions = [
    { offer: "Free pastry with any coffee before 10am", code: "HG7K2Q4M8P", when: "Today, 9:12am", status: "Used" },
    { offer: "Two flat whites for £5 on Mondays", code: "HG4R8T1X5N", when: "Today, 8:47am", status: "Used" },
    { offer: "Free pastry with any coffee before 10am", code: "HG9B3L6W2K", when: "Yesterday, 4:02pm", status: "Ready" },
];

// What the directory shows for this business, the same card the business
// profile page puts beside the form.
const listing = {
    id: "demo",
    slug: "harbour-grind-harbourside-bristol-demo",
    name: business,
    description: "A harbourside coffee roaster pulling espresso and serving pastries from the bakery next door.",
    logoUrl: null,
    categoryId: null,
    categoryName: "Cafés & coffee",
    area: "Harbourside",
    cityId: null,
    createdAt: new Date().toISOString(),
    offerCount: 2,
    coverImageUrl: null,
    isSample: false,
    topOffer: { slug: "demo", title: "Free pastry with any coffee before 10am", discount: "Free pastry" },
};

type TabId = (typeof tabs)[number]["id"];

const offers = [
    { title: "Free pastry with any coffee before 10am", discount: "Free pastry", claims: 64, used: 51, status: "Live" },
    { title: "Two flat whites for £5 on Mondays", discount: "2 for £5", claims: 38, used: 29, status: "Live" },
    { title: "10% off beans to take home", discount: "10% off", claims: 22, used: 12, status: "Ended" },
];

const posters = [
    { name: "Front window", scans: 214 },
    { name: "By the till", scans: 131 },
    { name: "Table cards", scans: 58 },
];

function Stat({ label, value, note }: { label: string; value: string; note: string }) {
    return (
        <div className="rounded-xl border border-[#17233B]/10 bg-white p-5">
            <p className="text-sm font-medium text-[#17233B]/70">{label}</p>
            <p className="mt-2 text-3xl font-semibold tabular-nums">{value}</p>
            <p className="mt-1 text-xs text-emerald-700">{note}</p>
        </div>
    );
}

function Panel({ title, description, children }: { title: string; description: string; children: ReactNode }) {
    return (
        <section>
            <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
            <p className="mt-2 max-w-2xl text-[#17233B]/65">{description}</p>
            <div className="mt-6">{children}</div>
        </section>
    );
}

function Overview() {
    return (
        <Panel
            title={`Good morning, ${business}`}
            description="Your dashboard shows what's happening this month and what to do next."
        >
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Stat label="Followers" value="186" note="▲ 32 this month" />
                <Stat label="Loyalty members" value="94" note="▲ 18 this month" />
                <Stat label="Visits from Promotello" value="312" note="▲ 27% vs last month" />
                <Stat label="Google review clicks" value="21" note="▲ 12 vs last month" />
            </div>

            <div className="mt-6 rounded-2xl border border-[#17233B]/10 bg-white p-6">
                <h3 className="font-semibold">Recent activity</h3>
                <ul className="mt-4 divide-y divide-[#17233B]/5 text-sm">
                    {[
                        ["Sam stamped Ellie's loyalty card", "2 min ago"],
                        ["Voucher used: Free pastry with any coffee", "14 min ago"],
                        ["New follower from your window poster", "38 min ago"],
                        ["Jo claimed Two flat whites for £5", "1 hour ago"],
                        ["Ellie earned a free coffee", "Yesterday"],
                    ].map(([text, when]) => (
                        <li key={text} className="flex items-center justify-between gap-4 py-3">
                            <span>{text}</span>
                            <span className="shrink-0 text-[#17233B]/65">{when}</span>
                        </li>
                    ))}
                </ul>
            </div>
        </Panel>
    );
}

function Loyalty({ stampQr }: { stampQr: string }) {
    return (
        <Panel
            title="A loyalty card that lives on their phone"
            description="Choose the reward, the card colour and the stamp once. Staff stamp cards by scanning the customer's card with their phone camera, so nobody can stamp themselves."
        >
            <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
                <div>
                    <LoyaltyCard
                        businessName={business}
                        stampsRequired={10}
                        reward="a free coffee"
                        stamps={6}
                        rewardsRedeemed={3}
                        code="4F8A2C91D0"
                        colour="coral"
                        stampIcon="coffee"
                        qr={
                            <div
                                aria-label="Example card code"
                                role="img"
                                className="[&_svg]:h-full [&_svg]:w-full"
                                dangerouslySetInnerHTML={{ __html: stampQr }}
                            />
                        }
                    />
                </div>

                <div className="grid gap-4">
                    <Stat label="Members" value="94" note="▲ 18 this month" />
                    <Stat label="Stamps this month" value="612" note="▲ 35% vs last month" />
                    <Stat label="Rewards earned" value="41" note="That's 41 regulars" />
                </div>
            </div>

            <div className="mt-6 flex items-start gap-3 rounded-2xl bg-[#17233B] p-5 text-white">
                <FiCamera aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-[#FF8F7D]" />
                <p className="text-sm leading-6 text-white/80">
                    <strong className="text-white">At the till:</strong> the customer shows their card, your
                    staff scan it with their phone camera and tap &ldquo;Add stamp&rdquo;. No app or
                    hardware to buy.
                </p>
            </div>
        </Panel>
    );
}

function Posters({ posterQr }: { posterQr: string }) {
    const max = Math.max(...posters.map((poster) => poster.scans));

    return (
        <Panel
            title="QR posters that count every scan"
            description="Print a poster for each spot. Scanning takes people to your page, where they can follow you, join your loyalty card or claim an offer."
        >
            <div className="grid gap-6 lg:grid-cols-[1fr_16rem]">
                <div className="rounded-2xl border border-[#17233B]/10 bg-white p-6">
                    <h3 className="font-semibold">Scans this month</h3>
                    <ul className="mt-5 space-y-4">
                        {posters.map((poster) => (
                            <li key={poster.name}>
                                <div className="flex justify-between text-sm">
                                    <span>{poster.name}</span>
                                    <span className="font-semibold tabular-nums">{poster.scans}</span>
                                </div>
                                <div className="mt-2 h-2 rounded-full bg-[#17233B]/5">
                                    <div
                                        className="h-2 rounded-full bg-[#FF593F]"
                                        style={{ width: `${(poster.scans / max) * 100}%` }}
                                    />
                                </div>
                            </li>
                        ))}
                    </ul>
                    <p className="mt-5 text-sm text-[#17233B]/70">
                        Your window poster brings in the most people. Worth keeping it at eye level.
                    </p>
                </div>

                <div className="overflow-hidden rounded-xl border border-[#17233B]/10 shadow-sm">
                    <QrPoster
                        width="256px"
                        height={`${Math.round(256 * (297 / 210))}px`}
                        fontSize={16 * (256 / 794)}
                        businessName={business}
                        place="Front window"
                        offer={{ discount: "Free pastry", title: "Free pastry with any coffee before 10am" }}
                        qrMarkup={posterQr}
                        link="promotello.com/businesses/harbour-grind"
                        colour="coral"
                        eyebrow="Scan for offers"
                        headline="See what's on at Harbour Grind"
                    />
                </div>
            </div>
        </Panel>
    );
}

function BusinessProfile() {
    return (
        <Panel
            title="Your page, written beside what customers see"
            description="Four tabs: your details, photos, where you are and when you're open. The card beside them is the one the Promotello directory shows, and it changes as you type."
        >
            <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
                <div className="rounded-2xl border border-[#17233B]/10 bg-white p-6">
                    <div className="flex flex-wrap gap-2">
                        {["Profile", "Photos", "Location", "Hours"].map((label, index) => (
                            <span
                                key={label}
                                className={`rounded-full px-3 py-1 text-sm font-medium ${
                                    index === 0 ? "bg-[#FF593F] text-white" : "bg-[#17233B]/5 text-[#17233B]/70"
                                }`}
                            >
                                {label}
                            </span>
                        ))}
                    </div>

                    <dl className="mt-5 space-y-4 text-sm">
                        {[
                            ["Business name", business],
                            ["Category", "Cafés & coffee"],
                            ["Description", "A harbourside coffee roaster pulling espresso and serving pastries."],
                            ["Google review link", "Set, so customers are asked after a visit"],
                        ].map(([label, value]) => (
                            <div key={label}>
                                <dt className="font-medium text-[#17233B]/70">{label}</dt>
                                <dd className="mt-1">{value}</dd>
                            </div>
                        ))}
                    </dl>
                </div>

                <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#17233B]/50">
                        How customers see you
                    </p>
                    <div className="mt-3">
                        <BusinessCard business={listing} />
                    </div>
                    <p className="mt-3 text-sm text-[#17233B]/70">
                        Your logo and cover photo go on here too, so the directory shows your place rather than a
                        placeholder.
                    </p>
                </div>
            </div>
        </Panel>
    );
}

function Redemptions() {
    return (
        <Panel
            title="Redeeming takes seconds at the till"
            description="Point your phone camera at the QR code on the customer's voucher. It opens here, you tap Mark as used, and it can't be used twice."
        >
            <div className="overflow-x-auto rounded-2xl border border-[#17233B]/10 bg-white">
                <table className="w-full min-w-[34rem] text-left text-sm">
                    <thead className="text-[#17233B]/70">
                        <tr className="border-b border-[#17233B]/10">
                            <th className="px-5 py-3 font-medium">Offer</th>
                            <th className="px-5 py-3 font-medium">Code</th>
                            <th className="px-5 py-3 font-medium">When</th>
                            <th className="px-5 py-3 font-medium">Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {redemptions.map((row) => (
                            <tr key={row.code} className="border-b border-[#17233B]/5 last:border-0">
                                <td className="px-5 py-3 font-medium">{row.offer}</td>
                                <td className="px-5 py-3 font-mono text-xs tracking-[0.12em]">{row.code}</td>
                                <td className="px-5 py-3 text-[#17233B]/70">{row.when}</td>
                                <td className="px-5 py-3">
                                    <Badge variant={row.status === "Used" ? "secondary" : "outline"}>{row.status}</Badge>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="mt-6 flex items-start gap-3 rounded-2xl bg-[#17233B] p-5 text-white">
                <FiCamera aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-[#FF8F7D]" />
                <p className="text-sm leading-6 text-white/80">
                    <strong className="text-white">Already used, expired, or outside its hours?</strong> Your
                    staff see a clear warning before they hand anything over.
                </p>
            </div>
        </Panel>
    );
}

function Offers() {
    return (
        <Panel
            title="Offers that go out to your followers"
            description="Create an offer in a minute and choose how many people can claim it. Once it passes review it goes live, and everyone who follows you gets an email."
        >
            <div className="overflow-x-auto rounded-2xl border border-[#17233B]/10 bg-white">
                <table className="w-full min-w-[34rem] text-left text-sm">
                    <thead className="text-[#17233B]/70">
                        <tr className="border-b border-[#17233B]/10">
                            <th className="px-5 py-3 font-medium">Offer</th>
                            <th className="px-5 py-3 text-right font-medium">Claimed</th>
                            <th className="px-5 py-3 text-right font-medium">Used in store</th>
                            <th className="px-5 py-3 font-medium">Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {offers.map((offer) => (
                            <tr key={offer.title} className="border-b border-[#17233B]/5 last:border-0">
                                <td className="px-5 py-3 font-medium">{offer.title}</td>
                                <td className="px-5 py-3 text-right tabular-nums">{offer.claims}</td>
                                <td className="px-5 py-3 text-right tabular-nums">{offer.used}</td>
                                <td className="px-5 py-3">
                                    <Badge
                                        variant="outline"
                                        className={offer.status === "Live" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : ""}
                                    >
                                        {offer.status}
                                    </Badge>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <div className="flex gap-3 rounded-2xl border border-[#17233B]/10 bg-white p-5">
                    <FiHeart aria-hidden="true" className="mt-1 size-5 shrink-0 text-[#FF593F]" />
                    <p className="text-sm leading-6">
                        <strong>186 followers</strong> got an email about your Monday offer. Customers follow
                        you from your page or a QR poster, and can unsubscribe any time.
                    </p>
                </div>
                <div className="flex gap-3 rounded-2xl border border-[#17233B]/10 bg-white p-5">
                    <FiStar aria-hidden="true" className="mt-1 size-5 shrink-0 text-[#FF593F]" />
                    <p className="text-sm leading-6">
                        <strong>21 customers</strong> were sent to leave a Google review after a visit this
                        month.
                    </p>
                </div>
            </div>
        </Panel>
    );
}

function CustomerView() {
    return (
        <Panel
            title="What your customers see"
            description="Customers find you on Promotello or by scanning your poster. Vouchers and loyalty cards live in their account. No app to download."
        >
            <div className="grid gap-6 md:grid-cols-3">
                <div>
                    <p className="mb-3 text-sm font-semibold">Your offer</p>
                    <OfferCard
                        slug="#"
                        discount="Free pastry"
                        title="Free pastry with any coffee before 10am"
                        description="Pick any pastry from the counter when you buy a coffee before 10am."
                        availability="Weekdays before 10am"
                        business={business}
                        area="Gloucester Road"
                        category="Cafés & coffee"
                    />
                </div>

                <div>
                    <p className="mb-3 text-sm font-semibold">Their voucher</p>
                    <div className="rounded-2xl border border-[#17233B]/10 bg-white p-5 text-center">
                        <p className="text-sm text-[#17233B]/70">{business}</p>
                        <p className="mt-1 font-semibold">Free pastry with any coffee</p>
                        <VoucherQr code="HG7K2Q" className="mx-auto mt-4 w-40" />
                        <p className="mt-3 font-mono text-lg font-semibold tracking-widest">HG7K2Q</p>
                        <p className="mt-1 text-xs text-[#17233B]/70">Staff scan this to redeem</p>
                    </div>
                </div>

                <div>
                    <p className="mb-3 text-sm font-semibold">Their loyalty card</p>
                    <div className="rounded-2xl border border-[#17233B]/10 bg-white p-5">
                        <p className="text-sm text-[#17233B]/70">{business}</p>
                        <p className="mt-1 font-semibold">Free coffee after 9</p>
                        <div className="mt-4">
                            <LoyaltyStamps stamps={6} required={10} size="sm" />
                        </div>
                        <p className="mt-3 text-xs text-[#17233B]/70">4 more to go</p>
                    </div>
                </div>
            </div>
        </Panel>
    );
}

export function DemoDashboard({ analytics, posterQr, stampQr }: { analytics: BusinessAnalytics; posterQr: string; stampQr: string }) {
    const [tab, setTab] = useState<TabId>("overview");

    return (
        <main className="bg-[#FFF8F0] text-[#17233B]">
            <div className="border-b border-[#FF593F]/20 bg-[#FF593F]/10 px-6 py-3">
                <div className="mx-auto flex max-w-6xl flex-col gap-3 text-sm sm:flex-row sm:items-center sm:justify-between">
                    <p>
                        <strong>Demo:</strong> you&apos;re looking around a café&apos;s dashboard with made-up data.
                        Click the tabs to explore.
                    </p>
                    <Button render={<Link href="/business/register" />} nativeButton={false} size="sm">
                        Start free with your business
                        <FiArrowRight aria-hidden="true" />
                    </Button>
                </div>
            </div>

            <div className="mx-auto max-w-6xl px-6 py-8 lg:py-12">
                <div className="grid gap-8 lg:grid-cols-[14rem_minmax(0,1fr)]">
                    <nav aria-label="Demo sections" className="min-w-0">
                        <p className="mb-4 hidden px-3 text-xs font-semibold uppercase tracking-[0.16em] text-[#17233B]/65 lg:block">
                            {business}
                        </p>
                        <div className="-mx-6 overflow-x-auto px-6 pb-2 lg:mx-0 lg:overflow-visible lg:p-0">
                            <ul role="tablist" className="flex w-max gap-2 lg:w-full lg:flex-col">
                                {tabs.map(({ id, label, icon: Icon }) => (
                                    <li key={id}>
                                        <Button
                                            type="button"
                                            role="tab"
                                            aria-selected={tab === id}
                                            variant={tab === id ? "secondary" : "ghost"}
                                            className="justify-start whitespace-nowrap lg:w-full"
                                            onClick={() => setTab(id)}
                                        >
                                            <Icon aria-hidden="true" className="size-4" />
                                            {label}
                                        </Button>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </nav>

                    <div role="tabpanel" className="min-w-0">
                        {tab === "overview" && <Overview />}
                        {tab === "profile" && <BusinessProfile />}
                        {tab === "offers" && <Offers />}
                        {tab === "posters" && <Posters posterQr={posterQr} />}
                        {tab === "loyalty" && <Loyalty stampQr={stampQr} />}
                        {tab === "redemptions" && <Redemptions />}
                        {tab === "results" && (
                            <Panel
                                title="Proof it's working"
                                description="Every month you can see what Promotello brought you, compared with the month before."
                            >
                                <div className="-mt-10">
                                    <PeriodSummary analytics={analytics} />
                                </div>
                            </Panel>
                        )}
                        {tab === "customer" && <CustomerView />}
                    </div>
                </div>

                <section className="mt-14 flex flex-col gap-4 rounded-3xl bg-[#17233B] p-8 text-white sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h2 className="text-2xl font-semibold">Set this up for your business</h2>
                        <p className="mt-1 text-white/70">Free to start. Most businesses are live in 15 minutes.</p>
                    </div>
                    <div className="flex flex-wrap gap-3">
                        <Button
                            render={<Link href="/business/why-promotello" />}
                            nativeButton={false}
                            variant="outline"
                            className="border-white/30 bg-transparent text-white hover:bg-white/10 hover:text-white"
                        >
                            One-page overview
                        </Button>
                        <Button render={<Link href="/business/register" />} nativeButton={false}>
                            Start free
                        </Button>
                    </div>
                </section>
            </div>
        </main>
    );
}
