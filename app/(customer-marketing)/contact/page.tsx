import Link from "next/link";
import { Suspense } from "react";
import {
    FiArrowRight,
    FiGift,
    FiHelpCircle,
    FiMessageCircle,
} from "react-icons/fi";

import { Badge } from "@/components/ui/badge";
import { ContactForm } from "@/components/contact-form";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { company } from "@/lib/legal";

const topics = [
    {
        icon: FiGift,
        title: "A question about an offer?",
        description:
            "Include the offer name and business so we can understand which offer you mean.",
    },
    {
        icon: FiHelpCircle,
        title: "Something not working?",
        description:
            "Tell us which page you were on, what you tried, and any error message you saw.",
    },
    {
        icon: FiMessageCircle,
        title: "An idea worth sharing?",
        description:
            "We’d love to hear what would make discovering local businesses better for you.",
    },
];

export default function ContactPage() {
    return (
        <main className="overflow-hidden bg-background text-foreground">
            <section className="relative isolate">
                <div
                    aria-hidden="true"
                    className="pointer-events-none absolute right-0 top-0 -z-10 size-96 rounded-full bg-[#FF593F]/10 blur-3xl"
                />

                <div className="mx-auto max-w-7xl px-6 pb-12 pt-16 sm:px-10 sm:pt-24">
                    <Badge variant="secondary">
                        We’re listening
                    </Badge>

                    <h1 className="mt-6 max-w-3xl text-4xl font-semibold tracking-tight sm:text-6xl">
                        A question, an idea, or a little{" "}
                        <span className="text-[#FF593F]">
                            help along the way?
                        </span>
                    </h1>

                    <p className="mt-6 max-w-2xl text-lg leading-8 text-muted-foreground">
                        Whether you’re exploring your first deal or need help
                        with your account, send us a message. We’ll help you
                        find your next step.
                    </p>
                </div>
            </section>

            <section className="mx-auto grid max-w-7xl gap-10 px-6 pb-20 sm:px-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
                <div className="space-y-8 lg:pt-4">
                    <div className="space-y-7">
                        {topics.map((topic) => {
                            const Icon = topic.icon;

                            return (
                                <div
                                    key={topic.title}
                                    className="flex items-start gap-4"
                                >
                                    <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-[#FF593F]/10 text-[#FF593F]">
                                        <Icon
                                            aria-hidden="true"
                                            className="size-5"
                                        />
                                    </span>

                                    <div>
                                        <h2 className="font-semibold">
                                            {topic.title}
                                        </h2>

                                        <p className="mt-2 text-sm leading-7 text-muted-foreground">
                                            {topic.description}
                                        </p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <Card className="rounded-3xl bg-muted/30 shadow-none">
                        <CardHeader>
                            <CardTitle className="text-lg">
                                Planning a visit?
                            </CardTitle>

                            <CardDescription className="leading-7">
                                For bookings, opening hours, or questions about
                                what a deal includes, the business can usually
                                give you the most direct answer.
                            </CardDescription>
                        </CardHeader>

                        <CardContent>
                            <Button
                                render={<Link href="/businesses" />}
                                nativeButton={false}
                                variant="outline"
                            >
                                Find the business
                                <FiArrowRight aria-hidden="true" />
                            </Button>
                        </CardContent>
                    </Card>

                    <div className="rounded-2xl border p-5">
                        <p className="font-medium">Prefer email?</p>

                        <p className="mt-2 text-sm leading-7 text-muted-foreground">
                            Write to us at{" "}
                            <a href={`mailto:${company.email}`} className="font-medium text-foreground underline underline-offset-4">
                                {company.email}
                            </a>
                            . For help with your account, email{" "}
                            <a href={`mailto:${company.supportEmail}`} className="font-medium text-foreground underline underline-offset-4">
                                {company.supportEmail}
                            </a>
                            .
                        </p>
                    </div>

                    <div className="rounded-2xl border p-5">
                        <p className="font-medium">
                            Getting in touch about your business?
                        </p>

                        <p className="mt-2 text-sm leading-7 text-muted-foreground">
                            Use our business contact page for joining,
                            offers, and business account enquiries.
                        </p>

                        <Button
                            render={<Link href="/business/contact" />}
                            nativeButton={false}
                            variant="link"
                            className="mt-2 h-auto px-0"
                        >
                            Business enquiries
                            <FiArrowRight aria-hidden="true" />
                        </Button>
                    </div>
                </div>

                <Card className="rounded-3xl shadow-sm">
                    <CardHeader className="p-6 sm:p-8">
                        <CardTitle className="text-2xl">
                            How can we help?
                        </CardTitle>

                        <CardDescription className="leading-7">
                            Leave your details below. We’ll reply to the email
                            address you provide.
                        </CardDescription>
                    </CardHeader>

                    <CardContent className="px-6 pb-6 sm:px-8 sm:pb-8">
                        <Suspense fallback={<Skeleton className="h-96 rounded-2xl" />}>
                            <ContactForm audience="customer" />
                        </Suspense>
                    </CardContent>
                </Card>
            </section>
        </main>
    );
}