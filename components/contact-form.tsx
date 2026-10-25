"use client";

import Link from "next/link";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { FiArrowRight, FiCheckCircle } from "react-icons/fi";
import { z } from "zod";

import { FieldError, invalidProps } from "@/components/field-error";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { email, optionalText, requiredText } from "@/lib/validation";
import { createClient } from "@/utils/supabase/client";

// The contact form on /contact (customers) and /business/contact. Messages
// go through the send-contact-message edge function, which rate-limits.

const schema = z.object({
    name: requiredText("Your name", { max: 100 }),
    email,
    business: optionalText("Business name", 150),
    subject: requiredText("A subject", { max: 150 }),
    message: z
        .string()
        .trim()
        .min(20, "Write at least 20 characters so we can help.")
        .max(5000, "Keep your message under 5,000 characters."),
    // Honeypot: people never see it, bots fill it in.
    website: z.string(),
});

type Values = z.infer<typeof schema>;

const copy = {
    customer: {
        prefix: "consumer-contact",
        emailPlaceholder: "you@example.com",
        subjectLabel: "What’s your message about?",
        subjectPlaceholder: "My account, a promotion, feedback…",
        messagePlaceholder: "Tell us what happened or how we can help.",
        messageHint:
            "Include the business or promotion name if relevant. Please don’t send passwords, payment details, or redemption codes.",
        privacy: "We’ll use your details to respond to your enquiry.",
        successTitle: "Thanks for reaching out.",
        successText: "Your message has been sent. We’ll review it and reply by email.",
    },
    business: {
        prefix: "contact",
        emailPlaceholder: "you@yourbusiness.com",
        subjectLabel: "What would you like to discuss?",
        subjectPlaceholder: "Joining, pricing, support…",
        messagePlaceholder: "Tell us a little about your business and how we can help.",
        messageHint: "Between 20 and 5,000 characters.",
        privacy: "We’ll use these details to respond to your enquiry.",
        successTitle: "Your message is on its way.",
        successText: "Thanks for getting in touch. We’ll review your message and reply by email.",
    },
};

async function failureMessage(error: unknown) {
    if (error && typeof error === "object" && "context" in error && error.context instanceof Response) {
        if (error.context.status === 429) {
            return "You’ve reached the message limit. Please wait 30 minutes before trying again.";
        }

        const body = await error.context.json().catch(() => null);
        if (typeof body?.error === "string") return body.error as string;
    }

    return "We couldn’t send your message. Please try again later.";
}

export function ContactForm({ audience }: { audience: "customer" | "business" }) {
    const text = copy[audience];
    const id = (field: string) => `${text.prefix}-${field}`;
    const searchParams = useSearchParams();

    const [isSuccess, setIsSuccess] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");

    const {
        register,
        handleSubmit,
        reset,
        formState: { errors, isSubmitting },
    } = useForm<Values>({
        resolver: zodResolver(schema),
        defaultValues: {
            name: "",
            email: "",
            business: "",
            // e.g. /business/contact?subject=Multiple%20businesses
            subject: (searchParams.get("subject") ?? "").slice(0, 150),
            message: "",
            website: "",
        },
    });

    async function onSubmit(values: Values) {
        setErrorMessage("");

        const { data, error } = await createClient().functions.invoke("send-contact-message", { body: values });

        if (error || !data?.success) {
            setErrorMessage(error ? await failureMessage(error) : "We couldn’t send your message. Please try again later.");
            return;
        }

        reset();
        setIsSuccess(true);
    }

    if (isSuccess) {
        return (
            <div role="status" aria-live="polite" className="rounded-2xl bg-muted/40 px-6 py-10 text-center">
                <FiCheckCircle aria-hidden="true" className="mx-auto size-12 text-emerald-600" />
                <h2 className="mt-5 text-2xl font-semibold">{text.successTitle}</h2>
                <p className="mt-3 leading-7 text-muted-foreground">{text.successText}</p>

                <div className="mt-7 flex flex-wrap justify-center gap-3">
                    {audience === "customer" && (
                        <Button render={<Link href="/explore" />} nativeButton={false}>
                            Keep exploring
                            <FiArrowRight aria-hidden="true" />
                        </Button>
                    )}
                    <Button type="button" variant="outline" onClick={() => setIsSuccess(false)}>
                        Send another message
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-6" aria-busy={isSubmitting}>
            <div className="grid gap-6 sm:grid-cols-2">
                <div className="space-y-2">
                    <Label htmlFor={id("name")}>Your name</Label>
                    <Input
                        id={id("name")}
                        autoComplete="name"
                        placeholder="Your full name"
                        maxLength={100}
                        {...register("name")}
                        {...invalidProps(id("name-error"), errors.name)}
                    />
                    <FieldError id={id("name-error")} message={errors.name?.message} />
                </div>

                <div className="space-y-2">
                    <Label htmlFor={id("email")}>Email address</Label>
                    <Input
                        id={id("email")}
                        type="email"
                        autoComplete="email"
                        placeholder={text.emailPlaceholder}
                        maxLength={254}
                        {...register("email")}
                        {...invalidProps(id("email-error"), errors.email)}
                    />
                    <FieldError id={id("email-error")} message={errors.email?.message} />
                </div>
            </div>

            {audience === "business" && (
                <div className="space-y-2">
                    <Label htmlFor={id("business")}>Business name (optional)</Label>
                    <Input
                        id={id("business")}
                        autoComplete="organization"
                        placeholder="Your business"
                        maxLength={150}
                        {...register("business")}
                    />
                </div>
            )}

            <div className="space-y-2">
                <Label htmlFor={id("subject")}>{text.subjectLabel}</Label>
                <Input
                    id={id("subject")}
                    placeholder={text.subjectPlaceholder}
                    maxLength={150}
                    {...register("subject")}
                    {...invalidProps(id("subject-error"), errors.subject)}
                />
                <FieldError id={id("subject-error")} message={errors.subject?.message} />
            </div>

            <div className="space-y-2">
                <Label htmlFor={id("message")}>Your message</Label>
                <Textarea
                    id={id("message")}
                    placeholder={text.messagePlaceholder}
                    maxLength={5000}
                    rows={7}
                    {...register("message")}
                    {...invalidProps(id("message-error"), errors.message)}
                />
                <FieldError id={id("message-error")} message={errors.message?.message} />
                <p className="text-xs leading-6 text-muted-foreground">{text.messageHint}</p>
            </div>

            <div aria-hidden="true" className="absolute -left-[10000px]">
                <Label htmlFor={id("website")}>Leave this field empty</Label>
                <Input id={id("website")} tabIndex={-1} autoComplete="off" {...register("website")} />
            </div>

            {errorMessage && (
                <Alert variant="destructive">
                    <AlertTitle>Message not sent</AlertTitle>
                    <AlertDescription>{errorMessage}</AlertDescription>
                </Alert>
            )}

            <p className="text-sm leading-6 text-muted-foreground">
                {text.privacy} Read our{" "}
                <Link href="/legal/privacy" className="underline underline-offset-4">
                    privacy policy
                </Link>
                .
            </p>

            <Button type="submit" size="lg" disabled={isSubmitting} className="w-full sm:w-auto">
                {isSubmitting ? "Sending message…" : "Send your message"}
                <FiArrowRight aria-hidden="true" />
            </Button>
        </form>
    );
}
