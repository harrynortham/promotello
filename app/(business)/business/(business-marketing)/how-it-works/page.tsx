import type { Metadata } from "next";
import { FiCheck } from "react-icons/fi";

import { Eyebrow, FeatureSection, FinalCta, PrimaryActions } from "@/components/business-marketing";
import {
    BrowserFrame,
    DashboardScreen,
    LoyaltyCardScreen,
    NewOfferEmail,
    PosterVisual,
    StaffScanScreen,
    VoucherScreen,
} from "@/components/product-visuals";
import { qrSvg } from "@/lib/qr";

export const metadata: Metadata = {
    title: { absolute: "How It Works | Promotello for Business" },
    description:
        "Sign up free, put up your QR poster, and turn first-time visitors into regulars with loyalty cards, offers and follower emails. Here's how it works, step by step.",
};

function SetupScreen() {
    const steps = ["Your business", "Location and hours", "Your first offer"];

    return (
        <BrowserFrame url="promotello.com/onboarding" label="Setting up a business on Promotello" className="w-full max-w-md">
            <div className="p-6">
                <div className="flex gap-2" aria-hidden="true">
                    {steps.map((step, index) => (
                        <span key={step} className={`h-1.5 flex-1 rounded-full ${index < 2 ? "bg-[#FF593F]" : "bg-[#17233B]/10"}`} />
                    ))}
                </div>
                <p className="mt-5 text-xs font-semibold uppercase tracking-[0.14em] text-[#FF593F]">Step 2 of 3</p>
                <p className="mt-1 text-lg font-semibold">Where can customers find you?</p>
                <div className="mt-4 space-y-3 text-sm">
                    {[
                        ["Address", "214 Gloucester Road"],
                        ["Town or city", "Bristol"],
                        ["Opening hours", "Mon–Fri 7:30am–5pm, Sat 8am–4pm"],
                    ].map(([label, value]) => (
                        <div key={label}>
                            <p className="text-xs text-[#17233B]/55">{label}</p>
                            <p className="mt-1 rounded-lg border border-[#17233B]/10 px-3 py-2">{value}</p>
                        </div>
                    ))}
                </div>
                <div className="mt-5 inline-flex rounded-full bg-[#FF593F] px-5 py-2 text-sm font-semibold text-white">Continue</div>
            </div>
        </BrowserFrame>
    );
}

const customerSteps = [
    "Scan your poster or find you on Promotello",
    "Sign up with their email in seconds, with no app to download",
    "Follow you, claim your offer or join your loyalty card",
    "Show their phone at the till",
    "Get emails about your new offers (and can unsubscribe any time)",
];

const staffSteps = [
    "Accept an invite to your business's team",
    "Scan the customer's QR code with their phone camera",
    "Tap \"Add stamp\" or \"Mark as used\"",
    "See a clear warning if a voucher was already used or has ended",
    "That's it: no card reader, no training needed",
];

const faqs = [
    {
        question: "What phones does it work on?",
        answer: "Any smartphone with a camera and a web browser. Customers and staff use Promotello in the browser, so there's nothing to install.",
    },
    {
        question: "Do customers need an account?",
        answer: "Yes, a free one. It's how their loyalty card and vouchers follow them between visits, and how we stop the same person claiming an offer twice.",
    },
    {
        question: "How do my staff get access?",
        answer: "Invite them from the Team page with their email address. Members can scan and redeem; admins can also create offers.",
    },
    {
        question: "What if I don't want to give a discount?",
        answer: "You don't have to. Lots of businesses offer an extra instead, like a free pastry with a coffee, or a loyalty reward after a number of visits.",
    },
    {
        question: "Can I try it before paying?",
        answer: "Yes. The Free plan has no time limit, and Pro and Growth both start with a 30-day free trial. Cancel any time before it ends and you won't be charged.",
    },
];

export default async function HowItWorksPage() {
    const posterQr = await qrSvg("https://www.promotello.com/business/demo");

    return (
        <main className="overflow-hidden bg-background text-[#17233B]">
            <section className="relative isolate">
                <div aria-hidden="true" className="pointer-events-none absolute -left-40 -top-20 -z-10 h-[30rem] w-[30rem] rounded-full bg-[#FF593F]/10 blur-3xl" />
                <div className="mx-auto max-w-4xl px-6 py-16 text-center sm:px-10 sm:py-24">
                    <Eyebrow>How it works</Eyebrow>
                    <h1 className="mt-5 text-4xl font-semibold tracking-tight sm:text-6xl">
                        From sign-up to regulars, in six steps.
                    </h1>
                    <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-[#17233B]/70">
                        Promotello works with the customers you already have. Set up once, put up a poster, and
                        your staff take it from there with nothing but their phones.
                    </p>
                    <div className="mt-8 flex justify-center">
                        <PrimaryActions />
                    </div>
                </div>
            </section>

            <FeatureSection
                tinted
                eyebrow="Step 1 · About 15 minutes"
                title="Set up your business."
                body="Add your name, address, opening hours and logo. Your page goes into the Promotello directory once our team has checked it."
                points={["Free, with no card needed", "Add more locations and team members whenever you like"]}
                visual={<SetupScreen />}
            />

            <FeatureSection
                reverse
                eyebrow="Step 2"
                title="Create an offer or a loyalty card."
                body="Pick a reward that suits your margins: a free pastry with a coffee, two for one on quiet afternoons, or a free coffee after nine stamps."
                points={[
                    "Set claim limits and an end date",
                    "On Pro, offers go live straight away",
                    "Share it to WhatsApp, Facebook and Instagram in a tap",
                ]}
                visual={<LoyaltyCardScreen stamps={3} />}
            />

            <FeatureSection
                tinted
                eyebrow="Step 3"
                title="Put up your QR poster."
                body="Print a poster for your window, your till or your tables. Anyone who scans it lands on your page, ready to follow you, claim your offer or join your card."
                points={["A4 and A5 sizes, ready to print", "Each poster counts its own scans"]}
                visual={<PosterVisual qrSvg={posterQr} />}
            />

            <FeatureSection
                reverse
                eyebrow="Step 4"
                title="Customers claim and collect on their phones."
                body="Vouchers and loyalty cards live in the customer's Promotello account, so they're always with them and never forgotten at home."
                points={["No app to download", "Each customer can claim an offer once"]}
                visual={<VoucherScreen />}
            />

            <FeatureSection
                tinted
                eyebrow="Step 5"
                title="Staff scan at the till."
                body="The customer shows their phone and your staff scan it with their own. One tap adds a stamp or redeems a voucher, and nobody can stamp their own card."
                points={["Works on any staff phone", "Warns about used or expired vouchers"]}
                visual={<StaffScanScreen />}
            />

            <FeatureSection
                reverse
                eyebrow="Step 6"
                title="Keep them coming back, and see it working."
                body="Followers get an email about every new offer, and on Growth they get welcome, birthday and win-back rewards automatically. Your dashboard shows what it's all bringing in."
                points={["Visits, followers and scans compared month to month", "A monthly report in your inbox on Growth"]}
                visual={
                    <div className="relative w-full max-w-lg">
                        <DashboardScreen />
                        <div className="absolute -bottom-12 -left-6 hidden w-80 sm:block">
                            <NewOfferEmail />
                        </div>
                    </div>
                }
            />

            <section className="border-t border-[#17233B]/10">
                <div className="mx-auto grid max-w-7xl gap-6 px-6 py-20 sm:px-10 md:grid-cols-2">
                    {[
                        { title: "What your customers do", steps: customerSteps },
                        { title: "What your staff do", steps: staffSteps },
                    ].map((column) => (
                        <div key={column.title} className="rounded-3xl border border-[#17233B]/10 bg-white p-8">
                            <h2 className="text-2xl font-semibold tracking-tight">{column.title}</h2>
                            <ol className="mt-6 space-y-4">
                                {column.steps.map((step, index) => (
                                    <li key={step} className="flex gap-3">
                                        <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[#17233B] text-xs font-semibold text-white">
                                            {index + 1}
                                        </span>
                                        <span className="pt-0.5 text-[#17233B]/80">{step}</span>
                                    </li>
                                ))}
                            </ol>
                        </div>
                    ))}
                </div>
            </section>

            <section className="bg-[#FFF8F0]">
                <div className="mx-auto grid max-w-7xl gap-10 px-6 py-20 sm:px-10 lg:grid-cols-[1fr_2fr]">
                    <div>
                        <Eyebrow>Questions</Eyebrow>
                        <h2 className="mt-4 text-3xl font-semibold tracking-tight">The practical bits</h2>
                    </div>
                    <dl className="divide-y divide-[#17233B]/10">
                        {faqs.map((faq) => (
                            <div key={faq.question} className="py-5 first:pt-0">
                                <dt className="flex gap-2 font-semibold">
                                    <FiCheck aria-hidden="true" className="mt-1 shrink-0 text-[#FF593F]" />
                                    {faq.question}
                                </dt>
                                <dd className="mt-2 pl-6 leading-7 text-[#17233B]/70">{faq.answer}</dd>
                            </div>
                        ))}
                    </dl>
                </div>
            </section>

            <div className="pt-20">
                <FinalCta title="Ready to put your first poster up?" />
            </div>
        </main>
    );
}
