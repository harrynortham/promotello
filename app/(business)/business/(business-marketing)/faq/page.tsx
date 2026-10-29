import type { Metadata } from "next";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
    title: { absolute: "Frequently Asked Questions | Promotello for Business" },
    description:
        "Answers about promotions, vouchers, loyalty cards, QR posters, follower emails, automations, your team and pricing.",
};

const sections = [
    {
        id: "getting-started",
        title: "Getting started",
        description: "What Promotello is and who it's for.",
        questions: [
            {
                question: "What is Promotello?",
                answer:
                    "Promotello helps independent businesses turn first-time visitors into regulars. You get promotions customers claim on their phone, a digital loyalty card, QR posters, follower emails and monthly results, all in one place. Your business also gets a page in the Promotello directory.",
            },
            {
                question: "Is it right for my business?",
                answer:
                    "If customers visit you in person, it should be. Cafés, restaurants, pubs, bakeries, barbers, salons, spas, gyms and studios, shops, florists, pet groomers and repair shops all use the same tools: an offer to bring people in and a reason to come back.",
            },
            {
                question: "How long does it take to set up?",
                answer:
                    "About 15 minutes. Add your business details, opening hours and logo, create a promotion or loyalty card, and print your QR poster. Our team checks each new business before it appears publicly.",
            },
            {
                question: "Do I or my customers need to download an app?",
                answer:
                    "No. Everything works in the phone's web browser, for customers and staff. You don't need a card reader or any other hardware either.",
            },
            {
                question: "Can I try it before I pay?",
                answer:
                    "Yes. The Free plan has no time limit, and Pro and Growth start with a 30-day free trial.",
            },
        ],
    },
    {
        id: "promotions",
        title: "Promotions and vouchers",
        description: "Creating offers and redeeming them at the till.",
        questions: [
            {
                question: "Do I have to offer a big discount?",
                answer:
                    "No. Plenty of businesses offer an extra instead, like a free pastry with a coffee, a bundle, or an introductory treatment. Choose something that suits your margins.",
            },
            {
                question: "How do customers claim a promotion?",
                answer:
                    "They find it on your page, in the Promotello directory or by scanning your poster, then tap to claim it. They get their own voucher with a QR code and a short code, kept in their account. Each customer can claim each promotion once.",
            },
            {
                question: "How do my staff redeem a voucher?",
                answer:
                    "The customer shows the voucher and your staff scan the QR code with their phone camera, then tap \"Mark as used\". If it's already been used or the offer has ended, they'll see a clear warning. Vouchers can also be found on your Redemptions page.",
            },
            {
                question: "Can I limit how many people claim it?",
                answer:
                    "Yes. Set a claim limit and an end date. Once the limit is reached, nobody else can claim it.",
            },
            {
                question: "Does my promotion go live straight away?",
                answer:
                    "Once your business has been approved, promotions on Pro and Growth go live as soon as you create them, and your followers are emailed. On the Free plan, our team reviews each promotion first.",
            },
            {
                question: "Can a promotion only work at certain times?",
                answer:
                    "Yes, on Growth. Quiet-hours promotions only work on the days and times you choose, such as Monday to Thursday, 2pm to 4pm. Customers can claim them any time, but staff can only redeem them in the window.",
            },
        ],
    },
    {
        id: "loyalty",
        title: "Loyalty cards and QR posters",
        description: "Bringing customers back and getting found.",
        questions: [
            {
                question: "How does the loyalty card work?",
                answer:
                    "Choose how many stamps it takes (3 to 20) and the reward. Customers join from your page and keep the card on their phone. Staff scan the customer's card and tap \"Add stamp\". Loyalty cards are part of Pro.",
            },
            {
                question: "Can customers stamp their own cards?",
                answer:
                    "No. Only members of your team can add stamps, by scanning the customer's card.",
            },
            {
                question: "What are QR posters?",
                answer:
                    "Printable A4 and A5 posters for your window, till or tables. Scanning one takes people to your page, where they can follow you, join your loyalty card or claim a promotion. Each poster counts its own scans, so you can see which spots work. Free includes one poster; Pro and Growth have no limit.",
            },
        ],
    },
    {
        id: "followers",
        title: "Followers and emails",
        description: "Staying in touch without writing a thing.",
        questions: [
            {
                question: "What does following my business do?",
                answer:
                    "Customers who follow you get an email whenever you post a new promotion (on Pro and Growth). The emails send themselves, with your business name as the sender.",
            },
            {
                question: "Can I see who follows me?",
                answer:
                    "You see how many followers you have, but not who they are or their email addresses. That keeps customers' details private and the emails trustworthy.",
            },
            {
                question: "Can customers unsubscribe?",
                answer:
                    "Yes. Every email has an unsubscribe link, and customers can turn emails off for one business or all of them in their account.",
            },
            {
                question: "What are automations?",
                answer:
                    "On Growth, welcome, birthday and win-back emails go to your followers automatically, each with a personal reward voucher your staff redeem like any other. You choose the reward and switch each one on once.",
            },
            {
                question: "How do Google review prompts work?",
                answer:
                    "Add your Google review link. Customers who used a voucher or got a stamp from you in the last two weeks are asked to leave a review, and aren't asked again for three months. Review prompts are part of Pro.",
            },
        ],
    },
    {
        id: "managing-your-business",
        title: "Your team and business",
        description: "Staff, locations and results.",
        questions: [
            {
                question: "Can my staff help?",
                answer:
                    "Yes. Invite them by email from the Team page. Members can scan vouchers and stamp loyalty cards; admins can also create promotions and manage settings. There's no charge per team member.",
            },
            {
                question: "Can I manage more than one business?",
                answer:
                    "Yes. One account can run several businesses, and you switch between them in the dashboard. Each business has its own plan.",
            },
            {
                question: "Can someone set my business up for me?",
                answer:
                    "Yes. Whoever sets it up can hand it over from the Team page. You'll get an email, and when you accept you become the owner.",
            },
            {
                question: "How do I see whether it's working?",
                answer:
                    "Analytics shows the last 30 days against the 30 before: page and promotion views, claims, vouchers used, QR scans, loyalty stamps and review clicks. On Growth, owners also get a monthly report by email.",
            },
        ],
    },
    {
        id: "pricing",
        title: "Pricing and billing",
        description: "Plans, trials and cancelling.",
        questions: [
            {
                question: "How much does Promotello cost?",
                answer:
                    "Free costs nothing and includes your page, 1 live promotion and 1 QR poster. Pro is £24 a month (or £240 a year) and Growth is £39 a month (or £390 a year). The first 50 businesses can get Pro for £19 a month, locked for life.",
            },
            {
                question: "How does the free trial work?",
                answer:
                    "Pro and Growth start with a 30-day free trial. We ask for a card but don't charge it until the trial ends, and each business gets one trial.",
            },
            {
                question: "Are there fees per claim or per customer?",
                answer:
                    "No. You pay your plan and nothing else. You do cover the cost of whatever your promotions give away.",
            },
            {
                question: "Can I switch plans or cancel?",
                answer:
                    "Yes, any time from your Billing page. If you cancel, you keep your plan until the end of the period you've paid for, then move to Free: your newest live promotion stays up and the rest are paused, not deleted.",
            },
        ],
    },
];

export default function BusinessFaqPage() {
    return (
        <main className="bg-background text-foreground">
            <section className="relative isolate border-b">
                <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-x-0 top-0 -z-10 mx-auto h-80 max-w-3xl rounded-full bg-[#FF593F]/10 blur-3xl"
                />

                <div className="mx-auto max-w-7xl px-6 py-16 sm:px-10 sm:py-24">
                    <div className="mx-auto max-w-3xl text-center">
                        <Badge variant="secondary">
                            Business FAQs
                        </Badge>

                        <h1 className="mt-6 text-4xl font-semibold tracking-tight sm:text-6xl">
                            Good questions.
                            <br />
                            Clear answers.
                        </h1>

                        <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-muted-foreground">
                            Everything businesses ask before getting started:
                            promotions, loyalty cards, emails, your team and
                            pricing.
                        </p>

                        <Button
                            render={<Link href="/business/contact" />}
                            nativeButton={false}
                            variant="outline"
                            className="mt-7"
                        >
                            Ask us a question
                        </Button>
                    </div>
                </div>
            </section>

            <div className="mx-auto grid max-w-7xl gap-10 px-6 py-12 sm:px-10 sm:py-16 lg:grid-cols-[14rem_1fr] lg:gap-16">
                <aside>
                    <nav
                        aria-label="FAQ topics"
                        className="space-y-2 lg:sticky lg:top-28"
                    >
                        <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                            Find an answer
                        </p>

                        {sections.map((section) => (
                            <Button
                                key={section.id}
                                render={
                                    <Link href={`#${section.id}`} />
                                }
                                nativeButton={false}
                                variant="ghost"
                                className="w-full justify-start"
                            >
                                {section.title}
                            </Button>
                        ))}
                    </nav>
                </aside>

                <div className="space-y-14">
                    {sections.map((section) => (
                        <section
                            key={section.id}
                            id={section.id}
                            aria-labelledby={`${section.id}-heading`}
                            className="scroll-mt-28"
                        >
                            <h2
                                id={`${section.id}-heading`}
                                className="text-2xl font-semibold tracking-tight sm:text-3xl"
                            >
                                {section.title}
                            </h2>

                            <p className="mt-3 leading-7 text-muted-foreground">
                                {section.description}
                            </p>

                            <div className="mt-6 space-y-3">
                                {section.questions.map((item) => (
                                    <details
                                        key={item.question}
                                        className="group rounded-2xl border bg-card text-card-foreground"
                                    >
                                        <summary className="flex cursor-pointer list-none items-start justify-between gap-5 rounded-2xl p-5 font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:p-6 [&::-webkit-details-marker]:hidden">
                                            <span className="leading-7">
                                                {item.question}
                                            </span>

                                            <span
                                                aria-hidden="true"
                                                className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground"
                                            >
                                                <span className="group-open:hidden">
                                                    +
                                                </span>

                                                <span className="hidden group-open:inline">
                                                    −
                                                </span>
                                            </span>
                                        </summary>

                                        <div className="px-5 pb-5 sm:px-6 sm:pb-6">
                                            <p className="leading-7 text-muted-foreground">
                                                {item.answer}
                                            </p>
                                        </div>
                                    </details>
                                ))}
                            </div>
                        </section>
                    ))}
                </div>
            </div>

            <section className="mx-auto max-w-7xl px-6 pb-20 sm:px-10">
                <div className="rounded-[2rem] bg-[#FFF4E8] px-6 py-12 text-center sm:px-12 sm:py-16">
                    <div className="mx-auto max-w-2xl">
                        <h2 className="text-3xl font-semibold tracking-tight text-[#17233B] sm:text-4xl">
                            Ready for the next step?
                        </h2>

                        <p className="mt-4 text-lg leading-8 text-[#17233B]/70">
                            Start free, try the demo, or talk to us about your
                            business.
                        </p>

                        <div className="mt-7 flex flex-wrap justify-center gap-3">
                            <Button
                                render={<Link href="/business/register" />}
                                nativeButton={false}
                                size="lg"
                            >
                                Start free
                            </Button>

                            <Button
                                render={<Link href="/business/demo" />}
                                nativeButton={false}
                                variant="outline"
                                size="lg"
                            >
                                Try the demo
                            </Button>

                            <Button
                                render={<Link href="/business/contact" />}
                                nativeButton={false}
                                variant="ghost"
                                size="lg"
                            >
                                Contact us
                            </Button>
                        </div>
                    </div>
                </div>
            </section>
        </main>
    );
}