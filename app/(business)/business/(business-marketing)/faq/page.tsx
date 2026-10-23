import type { Metadata } from "next";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
    title: { absolute: "Frequently Asked Questions | Promotello for Business" },
    description:
        "Answers to common questions about joining Promotello, creating promotions, managing customer redemptions, and business pricing.",
};

const sections = [
    {
        id: "getting-started",
        title: "Getting started",
        description: "A few things to know before joining.",
        questions: [
            {
                question: "What is Promotello?",
                answer:
                    "Promotello helps customers discover local businesses through promotions. Businesses can create a public profile, publish offers, manage customer redemption codes, and follow promotion activity.",
            },
            {
                question: "Is Promotello suitable for my business?",
                answer:
                    "Promotello is designed for businesses that can offer customers a product, service, or experience with clear redemption terms. Examples include cafés, restaurants, shops, salons, and activity providers. Contact us if you are unsure whether your business is a good fit.",
            },
            {
                question: "What do I need to get started?",
                answer:
                    "Start with your business name, description, contact details, location, and opening hours. A logo and an idea for your first promotion will also help you prepare your profile.",
            },
            {
                question: "Can I manage more than one business?",
                answer:
                    "Yes. You can belong to multiple businesses with one account and switch between their dashboards. Contact us to discuss pricing and the right setup if you manage several businesses or locations.",
            },
            {
                question: "Can I use the same account as a customer?",
                answer:
                    "Yes. Your account menu lets you move between the consumer dashboard and business dashboard. Your business access depends on the businesses you own or have been invited to join.",
            },
        ],
    },
    {
        id: "promotions",
        title: "Creating promotions",
        description: "Choose an offer that works for your business.",
        questions: [
            {
                question: "Do I have to offer a large discount?",
                answer:
                    "No. Choose an offer that suits your margins and gives customers a reason to visit. A bundle, an introductory experience, or an extra with a purchase may be more suitable than a large discount.",
            },
            {
                question: "What information should my promotion include?",
                answer:
                    "Explain what the customer receives, when they can use it, its expiry date, and any conditions. Make booking requirements, exclusions, and minimum spends clear before someone claims the offer.",
            },
            {
                question: "Can I limit the number of claims?",
                answer:
                    "Yes. You can set an optional total claim limit for a promotion. Further claims stop once that limit is reached. A claim reserves access to a redemption code; it does not mean the customer has visited.",
            },
            {
                question: "Will my promotion appear straight away?",
                answer:
                    "Your business and promotion must both be approved before the promotion appears publicly. An approved promotion must also be within its expiry date to appear in active listings.",
            },
            {
                question: "Does approval guarantee customers or sales?",
                answer:
                    "No. Approval allows an eligible promotion to appear publicly. Results depend on factors such as the offer, location, availability, and customer demand.",
            },
        ],
    },
    {
        id: "redemptions",
        title: "Claims and redemptions",
        description: "Understand what happens when a customer chooses your deal.",
        questions: [
            {
                question: "What happens when a customer claims my promotion?",
                answer:
                    "The customer receives a redemption code that they can show your team when visiting. The claim appears in your business redemption records.",
            },
            {
                question: "What is the difference between claimed and used?",
                answer:
                    "Claimed means the customer has received a code. Used means your team has marked that code as used after fulfilling the promotion. A claim alone does not confirm a visit or sale.",
            },
            {
                question: "How does my team check a code?",
                answer:
                    "Open the redemptions page for your business, find the customer’s code, and check its status and the relevant promotion terms. Mark it as used when you fulfil the deal.",
            },
            {
                question: "When should I mark a redemption as used?",
                answer:
                    "Only mark it as used when your business provides the promotion. Do not mark a code as used simply because the customer has claimed it.",
            },
            {
                question: "What if a customer claims an offer but never visits?",
                answer:
                    "The redemption remains unused. You do not need to mark it as used or fulfil the promotion unless the customer presents a valid code in accordance with the offer terms.",
            },
            {
                question: "Who provides the promotion to the customer?",
                answer:
                    "Your business provides the product, service, or experience described in the promotion. Make sure your team understands the offer and can fulfil it according to its published terms.",
            },
        ],
    },
    {
        id: "managing-your-business",
        title: "Managing your business",
        description: "Keep your team and business information organised.",
        questions: [
            {
                question: "Can I invite staff to help?",
                answer:
                    "Yes. Business owners can invite team members and assign supported roles. What each person can access depends on their role, so you can give staff access to redemptions while keeping management tasks restricted.",
            },
            {
                question: "Can I update my business profile?",
                answer:
                    "Yes. Owners and business admins can edit business information, including the description, logo, location, opening hours, and contact details.",
            },
            {
                question: "Can I choose which business emails I receive?",
                answer:
                    "Yes. Owners and business admins can configure business notification settings, including daily summaries and promotion availability updates.",
            },
            {
                question: "Where can I see how my promotions are doing?",
                answer:
                    "Your business overview and analytics pages show promotion activity. You can also review individual redemption records to distinguish claims from codes marked as used.",
            },
        ],
    },
    {
        id: "pricing",
        title: "Pricing and joining",
        description: "Understand the proposed plan before you commit.",
        questions: [
            {
                question: "How much does Promotello cost?",
                answer:
                    "Our proposed launch price is £19 per business per month in GBP. This is proposed pricing rather than an active checkout offer. Final pricing, availability, applicable VAT, and subscription terms will be confirmed before you pay.",
            },
            {
                question: "Are there additional fees for claims or team members?",
                answer:
                    "The proposed business plan includes unlimited promotions and team members, with no additional Promotello fee per claim. Your business remains responsible for the cost of fulfilling its promotions. Final plan terms will be confirmed before subscription.",
            },
            {
                question: "Does sending an enquiry start a subscription?",
                answer:
                    "No. Sending an enquiry does not start a subscription or take a payment. It gives us a chance to discuss your business and confirm the details with you.",
            },
            {
                question: "Where can I check billing and cancellation terms?",
                answer:
                    "Billing arrangements and cancellation terms will be provided before you subscribe. Contact us if you would like to discuss these before joining.",
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
                            Get to know Promotello before you get started.
                            Find answers about promotions, customer codes,
                            managing your business, and pricing.
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
                            Follow our setup guide, explore the proposed
                            pricing, or talk to us about your business.
                        </p>

                        <div className="mt-7 flex flex-wrap justify-center gap-3">
                            <Button
                                render={
                                    <Link href="/business/getting-started" />
                                }
                                nativeButton={false}
                                size="lg"
                            >
                                Getting started
                            </Button>

                            <Button
                                render={<Link href="/business/pricing" />}
                                nativeButton={false}
                                variant="outline"
                                size="lg"
                            >
                                View pricing
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