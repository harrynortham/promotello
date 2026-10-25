import type { Metadata } from "next";
import Link from "next/link";
import { FiCheck, FiMinus } from "react-icons/fi";

import { Eyebrow, FeatureSection, FinalCta, PrimaryActions } from "@/components/business-marketing";
import {
    BirthdayEmail,
    DashboardScreen,
    LoyaltyCardScreen,
    MonthlyReportEmail,
    NewOfferEmail,
    PosterScansCard,
    PosterVisual,
    QuietHoursCard,
    ReviewPromptScreen,
    StaffScanScreen,
    SquarePostPreview,
    VoucherScreen,
    WhatsAppShareScreen,
} from "@/components/product-visuals";
import { qrSvg } from "@/lib/qr";

export const metadata: Metadata = {
    title: "Business Features",
    description:
        "Digital loyalty cards, QR posters with scan counts, offers and scan-to-redeem vouchers, follower emails, Google review prompts, automations and monthly reports.",
};

const sections = [
    { id: "loyalty", label: "Loyalty cards" },
    { id: "posters", label: "QR posters" },
    { id: "offers", label: "Offers and vouchers" },
    { id: "followers", label: "Followers" },
    { id: "reviews", label: "Google reviews" },
    { id: "automations", label: "Automations" },
    { id: "quiet-hours", label: "Quiet hours" },
    { id: "results", label: "Results" },
    { id: "sharing", label: "Sharing" },
];

type Availability = boolean | string;

const comparison: { feature: string; free: Availability; pro: Availability; growth: Availability }[] = [
    { feature: "Business page in the Promotello directory", free: true, pro: true, growth: true },
    { feature: "Live offers", free: "1", pro: "Unlimited", growth: "Unlimited" },
    { feature: "Offers live without waiting for review", free: false, pro: true, growth: true },
    { feature: "Scan-to-redeem vouchers", free: true, pro: true, growth: true },
    { feature: "QR posters with scan counts", free: "1", pro: "Unlimited", growth: "Unlimited" },
    { feature: "Team members for your staff", free: true, pro: true, growth: true },
    { feature: "Digital loyalty card", free: false, pro: true, growth: true },
    { feature: "Followers emailed every new offer", free: false, pro: true, growth: true },
    { feature: "Google review prompts", free: false, pro: true, growth: true },
    { feature: "Share links, Instagram images and captions", free: true, pro: true, growth: true },
    { feature: "30-day analytics", free: true, pro: true, growth: true },
    { feature: "Welcome, birthday and win-back automations", free: false, pro: false, growth: true },
    { feature: "Quiet-hours offers", free: false, pro: false, growth: true },
    { feature: "Monthly value report by email", free: false, pro: false, growth: true },
];

function Cell({ value }: { value: Availability }) {
    if (value === true) {
        return <FiCheck aria-label="Included" className="mx-auto text-[#FF593F]" />;
    }

    if (value === false) {
        return <FiMinus aria-label="Not included" className="mx-auto text-[#17233B]/25" />;
    }

    return <span className="text-xs font-medium sm:text-sm">{value === "Unlimited" ? "No limit" : value}</span>;
}

export default async function FeaturesPage() {
    const posterQr = await qrSvg("https://www.promotello.com/business/demo");

    return (
        <main className="overflow-hidden bg-background text-[#17233B]">
            <section className="relative isolate">
                <div aria-hidden="true" className="pointer-events-none absolute -right-40 top-0 -z-10 h-[34rem] w-[34rem] rounded-full bg-[#FF593F]/10 blur-3xl" />
                <div className="mx-auto grid max-w-7xl items-center gap-14 px-6 py-16 sm:px-10 sm:py-24 lg:grid-cols-2">
                    <div>
                        <Eyebrow>Features</Eyebrow>
                        <h1 className="mt-5 text-4xl font-semibold leading-tight tracking-tight sm:text-6xl">
                            Everything you need to bring customers back.
                        </h1>
                        <p className="mt-6 max-w-xl text-lg leading-8 text-[#17233B]/70">
                            One place for your loyalty card, QR posters, offers, follower emails and results.
                            Customers use it in their phone&apos;s browser, and your staff use their own phones at the till.
                        </p>
                        <div className="mt-8">
                            <PrimaryActions />
                        </div>
                    </div>
                    <DashboardScreen className="w-full max-w-xl justify-self-center" />
                </div>

                <nav aria-label="Features on this page" className="mx-auto max-w-7xl px-6 pb-10 sm:px-10">
                    <ul className="flex flex-wrap gap-2">
                        {sections.map((section) => (
                            <li key={section.id}>
                                <Link
                                    href={`#${section.id}`}
                                    className="inline-flex rounded-full border border-[#17233B]/10 bg-white px-4 py-1.5 text-sm hover:border-[#FF593F]/40 hover:text-[#FF593F]"
                                >
                                    {section.label}
                                </Link>
                            </li>
                        ))}
                    </ul>
                </nav>
            </section>

            <FeatureSection
                id="loyalty"
                tinted
                eyebrow="Loyalty cards · Pro"
                title="A digital stamp card, stamped by your staff."
                body="Choose how many stamps it takes and what the reward is. Customers keep the card on their phone; staff scan it and tap once to stamp. Rewards are tracked for you."
                points={[
                    "3 to 20 stamps, any reward you like",
                    "Only your team can add stamps",
                    "See members, stamps this week and rewards earned",
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
                id="posters"
                reverse
                eyebrow="QR posters"
                title="A poster for every spot, with scans counted."
                body="Make a poster for your window, your till, your tables or a flyer. Each one has its own code, so you can see which spots bring people in."
                points={["Print at A4 or A5", "Scans counted per poster, by device", "Free plan includes one poster"]}
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
                id="offers"
                tinted
                eyebrow="Offers and vouchers"
                title="Offers that are simple to claim and quick to redeem."
                body="Write the offer, set how many can be claimed and when it ends. Each customer gets their own voucher with a QR code; staff scan it and mark it used, and it can't be used twice."
                points={[
                    "Claim limits, expiry dates and clear terms",
                    "One voucher per customer per offer",
                    "On Pro, offers go live straight away",
                ]}
                visual={<VoucherScreen />}
            />

            <FeatureSection
                id="followers"
                reverse
                eyebrow="Followers · Pro"
                title="Your own list of customers who want to hear from you."
                body="Customers follow you from your page or your poster. Every new offer you post is emailed to them automatically, with your name as the sender."
                points={[
                    "Nothing to write: emails send themselves",
                    "Every email has an unsubscribe link",
                    "See your follower count grow in Analytics",
                ]}
                visual={<NewOfferEmail />}
            />

            <FeatureSection
                id="reviews"
                tinted
                eyebrow="Google reviews · Pro"
                title="Ask for a review while the visit is fresh."
                body="Add your Google review link. Customers who used a voucher or got a stamp in the last two weeks are asked to leave you a review, and won't be asked again for three months."
                points={["Takes a minute to set up", "Clicks counted in your analytics"]}
                visual={<ReviewPromptScreen />}
            />

            <FeatureSection
                id="automations"
                reverse
                eyebrow="Automations · Growth"
                title="Welcome, birthday and win-back emails that run themselves."
                body="Switch each one on once. Promotello sends it to the right followers at the right time, with a personal gift voucher your staff redeem like any other."
                points={[
                    "Welcome: a thank-you for every new follower",
                    "Birthday: a treat on the day, every year",
                    "Win-back: a nudge after a set number of days away",
                ]}
                visual={<BirthdayEmail />}
            />

            <FeatureSection
                id="quiet-hours"
                tinted
                eyebrow="Quiet-hours offers · Growth"
                title="Fill the hours that are usually quiet."
                body="Make an offer that only works on the days and times you choose. Customers can claim it any time, but staff can only redeem it in the window."
                points={["Any days of the week, any time window", "Staff are warned if it's outside the hours"]}
                visual={<QuietHoursCard />}
            />

            <FeatureSection
                id="results"
                reverse
                eyebrow="Results"
                title="See exactly what Promotello brings in."
                body="Analytics shows the last 30 days against the 30 before: page and offer views, claims, vouchers used, QR scans, loyalty stamps and review clicks. On Growth, a summary arrives by email on the 1st."
                points={["A daily views chart", "Every promotion's claims and redemptions", "A monthly value report on Growth"]}
                visual={<MonthlyReportEmail />}
            />

            <FeatureSection
                id="sharing"
                tinted
                eyebrow="Sharing"
                title="Share every promotion in a tap."
                body="Each promotion has a share panel: send it to WhatsApp, Facebook or X with a link preview showing your photo and the deal, download images sized for Instagram stories and posts, and copy a suggested caption. Customers can share your promotions with friends from the promotion page too."
                points={[
                    "Link previews with your photo, deal and business name",
                    "Story (9:16) and square post images",
                    "Views from shared links counted separately",
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

            <section className="mx-auto max-w-5xl px-6 py-20 sm:px-10">
                <Eyebrow>Plans</Eyebrow>
                <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">What&apos;s in each plan</h2>
                <p className="mt-3 text-lg text-[#17233B]/70">
                    Free to start. Pro is {"£24"} a month and Growth is {"£39"}, both with a 30-day free trial.{" "}
                    <Link href="/business/pricing" className="font-medium text-[#FF593F] underline underline-offset-4">
                        See pricing
                    </Link>
                </p>

                <div className="mt-8 overflow-x-auto rounded-2xl border border-[#17233B]/10 bg-white">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-[#17233B]/10 text-sm">
                                <th className="px-3 py-4 text-sm font-medium text-[#17233B]/70 sm:px-5">Feature</th>
                                <th className="w-14 px-1 py-4 text-center font-semibold sm:w-24 sm:px-5">Free</th>
                                <th className="w-14 px-1 py-4 text-center font-semibold text-[#C2341F] sm:w-24 sm:px-5">Pro</th>
                                <th className="w-16 px-1 py-4 text-center font-semibold sm:w-24 sm:px-5">Growth</th>
                            </tr>
                        </thead>
                        <tbody>
                            {comparison.map((row) => (
                                <tr key={row.feature} className="border-b border-[#17233B]/5 last:border-0">
                                    <td className="px-3 py-3 text-sm sm:px-5">{row.feature}</td>
                                    <td className="px-1 py-3 text-center sm:px-5"><Cell value={row.free} /></td>
                                    <td className="bg-[#FF593F]/[0.03] px-1 py-3 text-center sm:px-5"><Cell value={row.pro} /></td>
                                    <td className="px-1 py-3 text-center sm:px-5"><Cell value={row.growth} /></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>

            <FinalCta />
        </main>
    );
}
