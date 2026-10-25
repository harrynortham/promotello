"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import {
    FiArrowRight,
    FiAward,
    FiBarChart2,
    FiCamera,
    FiGift,
    FiGrid,
    FiHeart,
    FiHome,
    FiSmartphone,
    FiStar,
} from "react-icons/fi";

import { PeriodSummary, type BusinessAnalytics } from "@/components/business-period-summary";
import { LoyaltyStamps } from "@/components/loyalty-stamps";
import { OfferCard } from "@/components/offer-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { VoucherQr } from "@/components/voucher-qr";

const business = "Harbour Grind";

const tabs = [
    { id: "overview", label: "Overview", icon: FiHome },
    { id: "loyalty", label: "Loyalty card", icon: FiAward },
    { id: "posters", label: "QR posters", icon: FiGrid },
    { id: "offers", label: "Offers & followers", icon: FiGift },
    { id: "results", label: "Monthly results", icon: FiBarChart2 },
    { id: "customer", label: "What customers see", icon: FiSmartphone },
] as const;

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

function Loyalty() {
    return (
        <Panel
            title="A loyalty card that lives on their phone"
            description="Set the reward once. Staff stamp cards by scanning the customer's card with their phone camera, so nobody can stamp themselves."
        >
            <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
                <div className="rounded-2xl border border-[#17233B]/10 bg-white p-6">
                    <p className="text-sm font-medium text-[#C8371D]">{business} coffee card</p>
                    <h3 className="mt-1 text-xl font-semibold">Buy 9 coffees, get the 10th free</h3>
                    <div className="mt-5">
                        <LoyaltyStamps stamps={6} required={10} size="lg" />
                    </div>
                    <p className="mt-4 text-sm text-[#17233B]/70">Ellie&apos;s card: 6 of 10. Four more to a free coffee.</p>
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

                <div className="rounded-2xl border-4 border-[#17233B] bg-white p-5 text-center shadow-sm">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#C8371D]">Scan me</p>
                    <p className="mt-1 text-lg font-semibold leading-tight">Free pastry with your coffee</p>
                    <div
                        className="mx-auto mt-3 w-40 [&_svg]:h-auto [&_svg]:w-full"
                        aria-label="Example QR code"
                        role="img"
                        dangerouslySetInnerHTML={{ __html: posterQr }}
                    />
                    <p className="mt-3 text-xs text-[#17233B]/70">{business} · on Promotello</p>
                </div>
            </div>
        </Panel>
    );
}

function Offers() {
    return (
        <Panel
            title="Offers that go out to your followers"
            description="Create an offer in a minute and choose how many people can claim it. On Pro it goes live straight away, and everyone who follows you gets an email."
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
                    <FiHeart aria-hidden="true" className="mt-1 size-5 shrink-0 text-[#C8371D]" />
                    <p className="text-sm leading-6">
                        <strong>186 followers</strong> got an email about your Monday offer. Customers follow
                        you from your page or a QR poster, and can unsubscribe any time.
                    </p>
                </div>
                <div className="flex gap-3 rounded-2xl border border-[#17233B]/10 bg-white p-5">
                    <FiStar aria-hidden="true" className="mt-1 size-5 shrink-0 text-[#C8371D]" />
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

export function DemoDashboard({ analytics, posterQr }: { analytics: BusinessAnalytics; posterQr: string }) {
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
                        {tab === "loyalty" && <Loyalty />}
                        {tab === "posters" && <Posters posterQr={posterQr} />}
                        {tab === "offers" && <Offers />}
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
