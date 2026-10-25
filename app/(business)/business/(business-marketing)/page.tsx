import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
    FiArrowRight,
    FiAward,
    FiBarChart2,
    FiActivity,
    FiCheck,
    FiClock,
    FiCoffee,
    FiGift,
    FiMusic,
    FiScissors,
    FiShoppingBag,
    FiTool,
    FiGrid,
    FiHeart,
    FiStar,
} from "react-icons/fi";

import {
    Eyebrow,
    FeatureSection,
    FinalCta,
    PlansSummary,
    PrimaryActions,
} from "@/components/business-marketing";
import {
    BirthdayEmail,
    DashboardScreen,
    FloatingNote,
    LoyaltyCardScreen,
    MonthlyReportEmail,
    NewOfferEmail,
    OfferClaimScreen,
    PosterScansCard,
    PosterVisual,
    SquarePostPreview,
    StaffScanScreen,
    VoucherScreen,
    WhatsAppShareScreen,
} from "@/components/product-visuals";
import { Button } from "@/components/ui/button";
import { qrSvg } from "@/lib/qr";

export const metadata: Metadata = {
    title: { absolute: "Promotello for Business | Turn First-Time Visitors into Regulars" },
    description:
        "Digital loyalty cards, QR posters, offers and follower emails for independent businesses. Free to start, set up in 15 minutes, no hardware.",
};

const loop = [
    { icon: FiGrid, title: "Get noticed", body: "A QR poster in your window and a page in the Promotello directory." },
    { icon: FiGift, title: "Bring them in", body: "A promotion worth trying, shared everywhere and claimed on their phone in seconds." },
    { icon: FiAward, title: "Bring them back", body: "A loyalty card on their phone, and automatic reasons to return." },
    { icon: FiBarChart2, title: "See it working", body: "Visits, followers and scans every month, compared with the last." },
];

// Examples across Promotello's categories, so no one thinks it's only for cafés.
const businessTypes = [
    { icon: FiCoffee, type: "Cafés and bakeries", example: "Buy 9 coffees, get the 10th free", photo: "pastry-counter" },
    { icon: FiClock, type: "Restaurants", example: "Two courses for £15, Monday to Wednesday, 5 to 7pm", photo: "pizza" },
    { icon: FiMusic, type: "Pubs and bars", example: "A free drink for new followers on quiz night", photo: "pub" },
    { icon: FiScissors, type: "Hair and barbers", example: "Your 6th cut half price", photo: "barber" },
    { icon: FiStar, type: "Beauty, nails and spas", example: "10% off a first treatment, and a birthday treat", photo: "beauty" },
    { icon: FiActivity, type: "Fitness, yoga and classes", example: "First class free, then a stamp every visit", photo: "yoga" },
    { icon: FiShoppingBag, type: "Shops, florists and makers", example: "10% off your first order in store", photo: "plants" },
    { icon: FiTool, type: "Services, pets and repairs", example: "Every 5th groom or service free", photo: "dog-grooming" },
];

const faqs = [
    {
        question: "Do my customers need to download an app?",
        answer: "No. Customers scan your poster or open your page in their phone's browser and sign up in seconds. Their vouchers and loyalty cards live in their Promotello account.",
    },
    {
        question: "Do I need a card reader or any hardware?",
        answer: "No. Staff stamp loyalty cards and redeem vouchers by scanning the customer's QR code with their own phone's camera. Customers can't stamp their own cards.",
    },
    {
        question: "How long does it take to set up?",
        answer: "Most businesses are live in about 15 minutes: add your details, create an offer or loyalty card, and print your QR poster.",
    },
    {
        question: "Who gets the emails?",
        answer: "Only customers who choose to follow your business. Every email has an unsubscribe link, and you never have to write one: new offers and automations send themselves.",
    },
    {
        question: "What does it cost?",
        answer: `Free gets you a profile, one live offer and a QR poster. Pro adds loyalty cards, unlimited offers and follower emails, and Growth adds automations. Paid plans start with a 30-day free trial and you can cancel any time.`,
    },
];

export default async function BusinessPage() {
    const posterQr = await qrSvg("https://www.promotello.com/business/demo");

    return (
        <main className="overflow-hidden bg-background text-[#17233B]">
            {/* Hero */}
            <section className="relative isolate">
                <div aria-hidden="true" className="pointer-events-none absolute -right-40 top-0 -z-10 h-[36rem] w-[36rem] rounded-full bg-[#FF593F]/10 blur-3xl" />

                <div className="mx-auto grid max-w-7xl items-center gap-14 px-6 py-16 sm:px-10 sm:py-24 lg:grid-cols-[1.05fr_1fr]">
                    <div>
                        <Eyebrow>For independent local businesses</Eyebrow>
                        <h1 className="mt-5 max-w-xl text-5xl font-semibold leading-[1.05] tracking-tight sm:text-6xl">
                            Turn first-time visitors into{" "}
                            <span className="text-[#C8371D]">regulars.</span>
                        </h1>
                        <p className="mt-6 max-w-xl text-lg leading-8 text-[#17233B]/70">
                            Promotions customers claim on their phone and digital loyalty cards that bring them
                            back, plus QR posters and follower emails. It works from day one with your own
                            customers. No hardware, no contract.
                        </p>

                        <div className="mt-8">
                            <PrimaryActions />
                        </div>

                        <ul className="mt-7 flex flex-wrap gap-x-5 gap-y-2 text-sm text-[#17233B]/65">
                            {["Free to start", "No app for customers to download", "Set up in 15 minutes"].map((item) => (
                                <li key={item} className="inline-flex items-center gap-2">
                                    <FiCheck aria-hidden="true" className="text-[#C8371D]" />
                                    {item}
                                </li>
                            ))}
                        </ul>

                        <p className="mt-7 text-sm text-[#17233B]/70">
                            Already on Promotello?{" "}
                            <Link href="/business/dashboard" className="font-medium text-[#17233B] underline underline-offset-4">
                                Open your dashboard
                            </Link>
                        </p>
                    </div>

                    <div className="relative mx-auto w-full max-w-xl pb-10 lg:pb-0">
                        <DashboardScreen />
                        <div className="absolute -bottom-6 -right-2 z-20 hidden scale-[0.82] sm:block lg:-right-10">
                            <LoyaltyCardScreen />
                        </div>
                        <FloatingNote
                            icon="check"
                            title="Jo claimed your free pastry offer"
                            detail="84 claimed so far · 2 min ago"
                            className="absolute -left-4 bottom-4 z-20 hidden sm:flex lg:-left-10"
                        />
                    </div>
                </div>
            </section>

            {/* The loop */}
            <section className="border-y border-[#17233B]/10 bg-[#FFF8F0]">
                <div className="mx-auto grid max-w-7xl gap-8 px-6 py-14 sm:grid-cols-2 sm:px-10 lg:grid-cols-4">
                    {loop.map(({ icon: Icon, title, body }, index) => (
                        <div key={title}>
                            <div className="flex items-center gap-3">
                                <span className="flex size-10 items-center justify-center rounded-full bg-white text-[#C8371D] shadow-sm">
                                    <Icon aria-hidden="true" />
                                </span>
                                <span className="text-xs font-semibold text-[#17233B]/65">0{index + 1}</span>
                            </div>
                            <h2 className="mt-4 text-lg font-semibold">{title}</h2>
                            <p className="mt-2 leading-7 text-[#17233B]/65">{body}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* Business types */}
            <section className="mx-auto max-w-7xl px-6 py-20 sm:px-10 lg:py-24">
                <div className="max-w-2xl">
                    <Eyebrow>Who it&apos;s for</Eyebrow>
                    <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
                        Built for any local business with customers who could come back.
                    </h2>
                    <p className="mt-4 text-lg leading-8 text-[#17233B]/70">
                        If people visit you in person, Promotello can help them visit again. A few ideas to
                        get you started:
                    </p>
                </div>
                <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {businessTypes.map(({ icon: Icon, type, example, photo }) => (
                        <li key={type} className="overflow-hidden rounded-2xl border border-[#17233B]/10 bg-white">
                            <div className="relative aspect-[16/10]">
                                <Image
                                    src={`/images/marketing/${photo}.jpg`}
                                    alt=""
                                    fill
                                    sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
                                    className="object-cover"
                                />
                                <span className="absolute bottom-3 left-3 flex size-9 items-center justify-center rounded-full bg-white text-[#C8371D] shadow">
                                    <Icon aria-hidden="true" />
                                </span>
                            </div>
                            <div className="p-5">
                                <p className="font-semibold">{type}</p>
                                <p className="mt-1 text-sm leading-6 text-[#17233B]/65">&ldquo;{example}&rdquo;</p>
                            </div>
                        </li>
                    ))}
                </ul>
            </section>

            <FeatureSection
                tinted
                eyebrow="Promotions"
                title="Promotions people claim in seconds and redeem at your till."
                body="Create a promotion in a minute: a free pastry with a coffee, two for one on Mondays, 10% off a first treatment. Customers find it on your page, in the Promotello directory or through your QR poster, claim it on their phone, and get their own voucher."
                points={[
                    "You choose the deal, the terms, the end date and how many can be claimed",
                    "Each customer gets a personal voucher with a QR code",
                    "Staff scan it at the till, and it can't be used twice",
                    "See claims and redemptions for every promotion",
                ]}
                visual={
                    <div className="flex items-start gap-4">
                        <OfferClaimScreen />
                        <div className="hidden translate-y-10 sm:block">
                            <VoucherScreen />
                        </div>
                    </div>
                }
            />

            <FeatureSection
                reverse
                eyebrow="Loyalty cards"
                title="A stamp card that never gets lost in a coat pocket."
                body="Set your reward once, like a free coffee after nine. Customers keep the card on their phone, and staff stamp it by scanning, so nobody can stamp themselves."
                points={[
                    "Choose how many stamps and what the reward is",
                    "Staff use their own phone: no card reader",
                    "See members, stamps and rewards earned",
                ]}
                visual={
                    <div className="flex items-end gap-4">
                        <LoyaltyCardScreen />
                        <div className="hidden translate-y-8 sm:block">
                            <StaffScanScreen />
                        </div>
                    </div>
                }
            />

            <FeatureSection
                tinted
                eyebrow="QR posters"
                title="Turn passers-by into followers."
                body="Print a poster for your window, your till or your tables. A scan takes people to your page, where they can follow you, join your loyalty card or claim your offer."
                points={[
                    "A ready-to-print poster for each spot",
                    "See how many scans each one gets",
                    "Works with any phone camera",
                ]}
                visual={
                    <div className="relative flex items-center">
                        <PosterVisual qrSvg={posterQr} />
                        <div className="relative z-10 -ml-12 mt-40 hidden sm:block">
                            <PosterScansCard />
                        </div>
                    </div>
                }
            />

            <FeatureSection
                reverse
                eyebrow="Followers"
                title="Every new promotion lands in your followers' inboxes."
                body="Customers follow you from your page or your poster. On Pro, a new promotion goes live straight away and everyone who follows you gets an email about it, with your name as the sender."
                points={[
                    "Nothing to write: the emails send themselves",
                    "Every email has an unsubscribe link",
                    "Customers who've just visited are asked for a Google review",
                ]}
                visual={
                    <div className="relative w-full max-w-sm">
                        <NewOfferEmail />
                        <FloatingNote
                            icon="star"
                            title="21 Google review clicks"
                            detail="From customers who just visited"
                            className="absolute -bottom-16 -right-4 sm:-right-12"
                        />
                    </div>
                }
            />

            <FeatureSection
                tinted
                eyebrow="Sharing"
                title="Every promotion is ready to share."
                body="One tap sends a promotion to WhatsApp, Facebook or X with a link preview showing your photo and the deal. Download ready-made images for Instagram stories and posts, copy a suggested caption, and see how many people came from your shares."
                points={[
                    "Link previews with your photo, deal and business name",
                    "Story and square post images for Instagram and Facebook",
                    "A suggested caption, ready to copy",
                    "Customers can share your promotions with friends too",
                    "Views from shared links counted in your analytics",
                ]}
                visual={
                    <div className="flex items-end gap-4">
                        <WhatsAppShareScreen />
                        <div className="hidden -translate-y-16 sm:block">
                            <SquarePostPreview />
                        </div>
                    </div>
                }
            />

            <FeatureSection
                reverse
                eyebrow="Results"
                title="Know it's worth it."
                body="Your dashboard shows views, claims, visits, QR scans and loyalty stamps for the last 30 days, compared with the 30 before. On Growth, a summary lands in your inbox on the 1st of every month."
                points={[
                    "Page and offer views, claims and visits",
                    "Scans for each QR poster",
                    "A monthly value report on Growth",
                ]}
                visual={<MonthlyReportEmail />}
            />

            {/* Growth */}
            <section className="bg-[#17233B] text-white">
                <div className="mx-auto grid max-w-7xl items-center gap-12 px-6 py-20 sm:px-10 lg:grid-cols-2 lg:py-24">
                    <div>
                        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#FF8F7D]">Growth plan</p>
                        <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">Marketing that runs while you work.</h2>
                        <p className="mt-5 text-lg leading-8 text-white/70">
                            Switch on an automation once and Promotello keeps sending it, each with a personal
                            reward your staff redeem like any voucher.
                        </p>
                        <ul className="mt-8 grid gap-5 sm:grid-cols-2">
                            {[
                                { icon: FiHeart, title: "Welcome", body: "A thank-you reward for every new follower." },
                                { icon: FiStar, title: "Birthday", body: "A treat on their birthday, every year." },
                                { icon: FiArrowRight, title: "Win-back", body: "A nudge for customers you haven't seen in a while." },
                                { icon: FiClock, title: "Quiet hours", body: "Offers that only work when you're quiet, like Monday 2 to 4pm." },
                            ].map(({ icon: Icon, title, body }) => (
                                <li key={title} className="flex gap-3">
                                    <Icon aria-hidden="true" className="mt-1 shrink-0 text-[#FF8F7D]" />
                                    <span>
                                        <span className="block font-semibold">{title}</span>
                                        <span className="block text-sm text-white/65">{body}</span>
                                    </span>
                                </li>
                            ))}
                        </ul>
                    </div>
                    <div className="flex justify-center">
                        <BirthdayEmail />
                    </div>
                </div>
            </section>

            {/* Pricing */}
            <section className="mx-auto max-w-7xl px-6 py-20 sm:px-10 lg:py-24">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                    <div className="max-w-2xl">
                        <Eyebrow>Pricing</Eyebrow>
                        <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">Start free. Upgrade when it&apos;s working.</h2>
                        <p className="mt-4 text-lg text-[#17233B]/70">
                            Paid plans include a 30-day free trial. The first 50 businesses get Pro for £19 a month, for life.
                        </p>
                    </div>
                    <Button render={<Link href="/business/pricing" />} nativeButton={false} variant="outline">
                        Full pricing
                        <FiArrowRight aria-hidden="true" />
                    </Button>
                </div>
                <div className="mt-10">
                    <PlansSummary />
                </div>
            </section>

            {/* FAQ */}
            <section className="border-t border-[#17233B]/10 bg-[#FFF8F0]">
                <div className="mx-auto grid max-w-7xl gap-10 px-6 py-20 sm:px-10 lg:grid-cols-[1fr_2fr]">
                    <div>
                        <Eyebrow>Questions</Eyebrow>
                        <h2 className="mt-4 text-3xl font-semibold tracking-tight">Good to know</h2>
                        <p className="mt-4 text-[#17233B]/65">
                            More in{" "}
                            <Link href="/business/faq" className="font-medium text-[#C8371D] underline underline-offset-4">
                                the full FAQ
                            </Link>
                            .
                        </p>
                    </div>
                    <dl className="divide-y divide-[#17233B]/10">
                        {faqs.map((faq) => (
                            <div key={faq.question} className="py-5 first:pt-0">
                                <dt className="font-semibold">{faq.question}</dt>
                                <dd className="mt-2 leading-7 text-[#17233B]/70">{faq.answer}</dd>
                            </div>
                        ))}
                    </dl>
                </div>
            </section>

            <div className="pt-20">
                <FinalCta />
            </div>
        </main>
    );
}
