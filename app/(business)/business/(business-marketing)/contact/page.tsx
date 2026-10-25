import Link from "next/link";
import { Suspense } from "react";
import {
    FiArrowRight,
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

export default function BusinessContactPage() {
    return (
        <main className="overflow-hidden bg-background text-foreground">
            <section className="relative isolate">
                <div
                    aria-hidden="true"
                    className="pointer-events-none absolute right-0 top-0 -z-10 size-96 rounded-full bg-[#FF593F]/10 blur-3xl"
                />

                <div className="mx-auto max-w-7xl px-6 pb-12 pt-16 sm:px-10 sm:pt-24">
                    <Badge variant="secondary">
                        Let’s talk business
                    </Badge>

                    <h1 className="mt-6 max-w-3xl text-4xl font-semibold tracking-tight sm:text-6xl">
                        A good conversation could be your next{" "}
                        <span className="text-[#FF593F]">
                            first step.
                        </span>
                    </h1>

                    <p className="mt-6 max-w-2xl text-lg leading-8 text-muted-foreground">
                        Exploring Promotello? Planning your first promotion?
                        Tell us what you have in mind. We’ll help you
                        understand whether it’s a good fit for your business.
                    </p>
                </div>
            </section>

            <section className="mx-auto grid max-w-7xl gap-10 px-6 pb-20 sm:px-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
                <div className="space-y-8 lg:pt-6">
                    <div>
                        <span className="flex size-12 items-center justify-center rounded-2xl bg-[#FF593F]/10 text-[#FF593F]">
                            <FiMessageCircle
                                aria-hidden="true"
                                className="size-6"
                            />
                        </span>

                        <h2 className="mt-5 text-2xl font-semibold tracking-tight">
                            Your questions are welcome.
                        </h2>

                        <p className="mt-4 leading-7 text-muted-foreground">
                            You don’t need a finished promotion or a perfect
                            plan. Share a little about your business and what
                            you would like to achieve.
                        </p>
                    </div>

                    <div className="space-y-5">
                        {[
                            {
                                title: "Thinking about joining?",
                                text: "Ask about features, plans, or getting your business set up. You can also try the demo first.",
                            },
                            {
                                title: "Managing several businesses?",
                                text: "Tell us about your locations and team so we can discuss your setup.",
                            },
                            {
                                title: "Already using Promotello?",
                                text: "Describe the issue and the page it happened on. Please never send passwords or payment details.",
                            },
                        ].map((item) => (
                            <div key={item.title}>
                                <h3 className="font-semibold">
                                    {item.title}
                                </h3>

                                <p className="mt-2 text-sm leading-7 text-muted-foreground">
                                    {item.text}
                                </p>
                            </div>
                        ))}
                    </div>

                    <Card className="rounded-3xl bg-muted/30 shadow-none">
                        <CardHeader>
                            <CardTitle className="text-lg">
                                Looking for a quick answer?
                            </CardTitle>

                            <CardDescription className="leading-6">
                                Our FAQs cover promotions, claims, team
                                access, and joining.
                            </CardDescription>
                        </CardHeader>

                        <CardContent>
                            <Button
                                render={<Link href="/business/faq" />}
                                nativeButton={false}
                                variant="outline"
                            >
                                Read the FAQs
                                <FiArrowRight aria-hidden="true" />
                            </Button>
                        </CardContent>
                    </Card>
                </div>

                <Card className="rounded-3xl shadow-sm">
                    <CardHeader className="p-6 sm:p-8">
                        <CardTitle className="text-2xl">
                            Tell us how we can help.
                        </CardTitle>

                        <CardDescription className="leading-7">
                            Leave your details and a message. We’ll reply
                            using the email address you provide.
                        </CardDescription>
                    </CardHeader>

                    <CardContent className="px-6 pb-6 sm:px-8 sm:pb-8">
                        <Suspense fallback={<Skeleton className="h-96 rounded-2xl" />}>
                            <ContactForm audience="business" />
                        </Suspense>
                    </CardContent>
                </Card>
            </section>
        </main>
    );
}