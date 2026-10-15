"use client";

import Link from "next/link";
import { useRef, useState, type FormEvent } from "react";
import {
    FiArrowRight,
    FiCheckCircle,
    FiGift,
    FiHelpCircle,
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

const topics = [
    {
        icon: FiGift,
        title: "A question about a promotion?",
        description:
            "Include the promotion name and business so we can understand which offer you mean.",
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
    const submittingRef = useRef(false);

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        if (submittingRef.current) {
            return;
        }

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
                        business: "",
                        subject: values.get("subject"),
                        message: values.get("message"),
                        website: values.get("website"),
                    },
                },
            );

            if (error) {
                let message =
                    "We couldn’t send your message. Please try again later.";

                if (
                    "context" in error &&
                    error.context instanceof Response
                ) {
                    if (error.context.status === 429) {
                        message =
                            "You’ve reached the message limit. Please wait 30 minutes before trying again.";
                    } else {
                        const body = await error.context
                            .json()
                            .catch(() => null);

                        if (typeof body?.error === "string") {
                            message = body.error;
                        }
                    }
                }

                throw new Error(message);
            }

            if (!data?.success) {
                throw new Error(
                    "We couldn’t send your message. Please try again later.",
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
                        <p className="font-medium">
                            Getting in touch about your business?
                        </p>

                        <p className="mt-2 text-sm leading-7 text-muted-foreground">
                            Use our business contact page for joining,
                            promotions, and business account enquiries.
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
                        {isSuccess ? (
                            <div
                                role="status"
                                aria-live="polite"
                                className="rounded-2xl bg-muted/40 px-6 py-10 text-center"
                            >
                                <FiCheckCircle
                                    aria-hidden="true"
                                    className="mx-auto size-12 text-emerald-600"
                                />

                                <h2 className="mt-5 text-2xl font-semibold">
                                    Thanks for reaching out.
                                </h2>

                                <p className="mt-3 leading-7 text-muted-foreground">
                                    Your message has been sent. We’ll review it
                                    and reply by email.
                                </p>

                                <div className="mt-7 flex flex-wrap justify-center gap-3">
                                    <Button
                                        render={<Link href="/explore" />}
                                        nativeButton={false}
                                    >
                                        Keep exploring
                                        <FiArrowRight aria-hidden="true" />
                                    </Button>

                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => {
                                            setErrorMessage("");
                                            setIsSuccess(false);
                                        }}
                                    >
                                        Send another message
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <form
                                onSubmit={handleSubmit}
                                className="space-y-6"
                                aria-busy={isSubmitting}
                            >
                                <div className="grid gap-6 sm:grid-cols-2">
                                    <div className="space-y-2">
                                        <Label htmlFor="consumer-contact-name">
                                            Your name
                                        </Label>

                                        <Input
                                            id="consumer-contact-name"
                                            name="name"
                                            autoComplete="name"
                                            placeholder="Your full name"
                                            required
                                            maxLength={100}
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="consumer-contact-email">
                                            Email address
                                        </Label>

                                        <Input
                                            id="consumer-contact-email"
                                            name="email"
                                            type="email"
                                            autoComplete="email"
                                            placeholder="you@example.com"
                                            required
                                            maxLength={254}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="consumer-contact-subject">
                                        What’s your message about?
                                    </Label>

                                    <Input
                                        id="consumer-contact-subject"
                                        name="subject"
                                        placeholder="My account, a promotion, feedback…"
                                        required
                                        maxLength={150}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="consumer-contact-message">
                                        Your message
                                    </Label>

                                    <Textarea
                                        id="consumer-contact-message"
                                        name="message"
                                        placeholder="Tell us what happened or how we can help."
                                        required
                                        minLength={20}
                                        maxLength={5000}
                                        rows={7}
                                    />

                                    <p className="text-xs leading-6 text-muted-foreground">
                                        Include the business or promotion name
                                        if relevant. Please don’t send
                                        passwords, payment details, or
                                        redemption codes.
                                    </p>
                                </div>

                                {/* Honeypot field for automated submissions. */}
                                <div
                                    aria-hidden="true"
                                    className="absolute -left-[10000px]"
                                >
                                    <Label htmlFor="consumer-contact-website">
                                        Leave this field empty
                                    </Label>

                                    <Input
                                        id="consumer-contact-website"
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
                                    We’ll use your details to respond to your
                                    enquiry. Read our{" "}
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