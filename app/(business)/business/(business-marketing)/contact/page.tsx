"use client";

import Link from "next/link";
import { useRef, useState, type FormEvent } from "react";
import {
    FiArrowRight,
    FiCheckCircle,
    FiMessageCircle,
} from "react-icons/fi";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createClient } from "@/utils/supabase/client";

export default function BusinessContactPage() {
    const formRef = useRef<HTMLFormElement>(null);
    const submittingRef = useRef(false);

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        if (submittingRef.current) return;

        const form = event.currentTarget;
        const values = new FormData(form);

        submittingRef.current = true;
        setIsSubmitting(true);
        setErrorMessage("");

        try {
            const supabase = createClient();

            const { data, error } = await supabase.functions.invoke(
                "send-contact-message",
                {
                    body: {
                        name: values.get("name"),
                        email: values.get("email"),
                        business: values.get("business"),
                        subject: values.get("subject"),
                        message: values.get("message"),
                        website: values.get("website"),
                    },
                },
            );

            if (error || !data?.success) {
                throw new Error(
                    "We couldn’t send your message. Please try again later. You can send up to 3 messages every 30 minutes.",
                );
            }

            form.reset();
            setIsSuccess(true);
        } catch (error) {
            setErrorMessage(
                error instanceof Error
                    ? error.message
                    : "Something went wrong. Please try again later.",
            );
        } finally {
            submittingRef.current = false;
            setIsSubmitting(false);
        }
    }

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
                                text: "Ask about features, proposed pricing, or getting your business set up.",
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
                        {isSuccess ? (
                            <div
                                role="status"
                                className="rounded-2xl bg-muted/40 px-6 py-10 text-center"
                            >
                                <FiCheckCircle
                                    aria-hidden="true"
                                    className="mx-auto size-12 text-emerald-600"
                                />

                                <h2 className="mt-5 text-2xl font-semibold">
                                    Your message is on its way.
                                </h2>

                                <p className="mt-3 leading-7 text-muted-foreground">
                                    Thanks for getting in touch. We’ll review
                                    your message and reply by email.
                                </p>

                                <Button
                                    type="button"
                                    variant="outline"
                                    className="mt-6"
                                    onClick={() => setIsSuccess(false)}
                                >
                                    Send another message
                                </Button>
                            </div>
                        ) : (
                            <form
                                ref={formRef}
                                onSubmit={handleSubmit}
                                className="space-y-6"
                                aria-busy={isSubmitting}
                            >
                                <div className="grid gap-6 sm:grid-cols-2">
                                    <div className="space-y-2">
                                        <Label htmlFor="contact-name">
                                            Your name
                                        </Label>
                                        <Input
                                            id="contact-name"
                                            name="name"
                                            autoComplete="name"
                                            required
                                            maxLength={100}
                                            placeholder="Your full name"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="contact-email">
                                            Email address
                                        </Label>
                                        <Input
                                            id="contact-email"
                                            name="email"
                                            type="email"
                                            autoComplete="email"
                                            required
                                            maxLength={254}
                                            placeholder="you@yourbusiness.com"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="contact-business">
                                        Business name (optional)
                                    </Label>
                                    <Input
                                        id="contact-business"
                                        name="business"
                                        autoComplete="organization"
                                        maxLength={150}
                                        placeholder="Your business"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="contact-subject">
                                        What would you like to discuss?
                                    </Label>
                                    <Input
                                        id="contact-subject"
                                        name="subject"
                                        required
                                        maxLength={150}
                                        placeholder="Joining, pricing, support…"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="contact-message">
                                        Your message
                                    </Label>
                                    <Textarea
                                        id="contact-message"
                                        name="message"
                                        required
                                        minLength={20}
                                        maxLength={5000}
                                        rows={7}
                                        placeholder="Tell us a little about your business and how we can help."
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        Between 20 and 5,000 characters.
                                    </p>
                                </div>

                                {/* Honeypot: leave empty. */}
                                <div
                                    aria-hidden="true"
                                    className="absolute -left-[10000px]"
                                >
                                    <Label htmlFor="contact-website">
                                        Leave this field empty
                                    </Label>
                                    <Input
                                        id="contact-website"
                                        name="website"
                                        tabIndex={-1}
                                        autoComplete="off"
                                    />
                                </div>

                                {errorMessage && (
                                    <Alert variant="destructive">
                                        <AlertTitle>
                                            Message not sent
                                        </AlertTitle>
                                        <AlertDescription>
                                            {errorMessage}
                                        </AlertDescription>
                                    </Alert>
                                )}

                                <p className="text-sm leading-6 text-muted-foreground">
                                    We’ll use these details to respond to
                                    your enquiry. Read our{" "}
                                    <Link
                                        href="/legal/privacy"
                                        className="underline underline-offset-4"
                                    >
                                        privacy policy
                                    </Link>
                                    .
                                </p>

                                <Button
                                    type="submit"
                                    size="lg"
                                    disabled={isSubmitting}
                                    className="w-full sm:w-auto"
                                >
                                    {isSubmitting
                                        ? "Sending message…"
                                        : "Send your message"}
                                    <FiArrowRight aria-hidden="true" />
                                </Button>
                            </form>
                        )}
                    </CardContent>
                </Card>
            </section>
        </main>
    );
}