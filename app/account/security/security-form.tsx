"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { FiLock, FiMail } from "react-icons/fi";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
import { FieldError, invalidProps } from "@/components/field-error";
import { email as emailField } from "@/lib/validation";
import { createClient } from "@/utils/supabase/client";

const providerNames: Record<string, string> = { google: "Google", apple: "Apple" };

const emailSchema = z.object({
    newEmail: emailField.transform((value) => value.toLowerCase()),
});

type EmailValues = z.infer<typeof emailSchema>;

type SecurityFormProps = {
    email: string;
    pendingEmail: string;
    // e.g. ["google"]
    socialProviders: string[];
};

type Feedback = {
    type: "success" | "error";
    message: string;
} | null;

function FormFeedback({ feedback }: { feedback: Feedback }) {
    if (!feedback) return null;

    return (
        <Alert
            variant={
                feedback.type === "error" ? "destructive" : "default"
            }
        >
            <AlertTitle>
                {feedback.type === "error"
                    ? "We couldn’t complete that change"
                    : "Update received"}
            </AlertTitle>

            <AlertDescription>
                {feedback.message}
            </AlertDescription>
        </Alert>
    );
}

export default function SecurityForm({
    email,
    pendingEmail,
    socialProviders,
}: SecurityFormProps) {
    const router = useRouter();
    const signInWith = socialProviders.map((provider) => providerNames[provider] ?? provider).join(" and ");

    const [emailFeedback, setEmailFeedback] = useState<Feedback>(null);

    const emailForm = useForm<EmailValues>({
        resolver: zodResolver(emailSchema),
        defaultValues: { newEmail: "" },
    });

    const emailErrors = emailForm.formState.errors;
    const isBusy = emailForm.formState.isSubmitting;

    async function changeEmail(values: EmailValues) {
        if (isBusy) return;

        setEmailFeedback(null);

        try {
            // Nobody has a password to re-enter: a change is confirmed from
            // both addresses, which is the check.
            const supabase = createClient();

            if (values.newEmail === email.toLowerCase()) {
                throw new Error(
                    "Enter a different email address from your current one.",
                );
            }

            const { data, error } = await supabase.auth.updateUser(
                { email: values.newEmail },
                {
                    emailRedirectTo:
                        `${window.location.origin}/auth/callback` +
                        "?next=/account/security",
                },
            );

            if (error) throw error;

            emailForm.reset();

            const changedImmediately =
                data.user?.email?.toLowerCase() === values.newEmail;

            setEmailFeedback({
                type: "success",
                message: changedImmediately
                    ? "Your login email has been updated."
                    : "Check your inboxes and follow the email-change confirmation instructions. Your current login email remains in use until the change is completed.",
            });

            router.refresh();
        } catch (error) {
            setEmailFeedback({
                type: "error",
                message:
                    error instanceof Error
                        ? error.message
                        : "Please try again.",
            });
        }
    }

    return (
        <section className="space-y-6">
            <div>
                <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                    Login & security
                </h1>

                <p className="mt-3 max-w-2xl leading-7 text-muted-foreground">
                    Keep your login details up to date. These changes apply
                    to both your customer and business access.
                </p>
            </div>

            <Card className="rounded-xl shadow-none">
                <CardHeader>
                    <div className="mb-3 flex size-11 items-center justify-center rounded-xl bg-muted">
                        <FiLock aria-hidden="true" className="size-5" />
                    </div>

                    <CardTitle>How you sign in</CardTitle>

                    <CardDescription className="leading-7">
                        {socialProviders.length
                            ? `You sign in with ${signInWith}, or with a code we email to the address below. There is no password to manage.`
                            : "We email you a six-digit code each time you sign in. There is no password to remember, or to lose."}
                    </CardDescription>
                </CardHeader>
            </Card>


            <Card className="rounded-xl shadow-none">
                <CardHeader>
                    <div className="mb-3 flex size-11 items-center justify-center rounded-xl bg-muted">
                        <FiMail
                            aria-hidden="true"
                            className="size-5"
                        />
                    </div>

                    <CardTitle>Change email address</CardTitle>

                    <CardDescription className="leading-7">
                        Update the email you use to sign in and receive
                        account messages.
                    </CardDescription>
                </CardHeader>

                <CardContent>
                    <div className="mb-6 rounded-xl bg-muted/40 p-4">
                        <p className="text-xs text-muted-foreground">
                            Current login email
                        </p>

                        <p className="mt-1 break-all text-sm font-medium">
                            {email}
                        </p>
                    </div>

                    {pendingEmail && (
                        <Alert className="mb-6">
                            <AlertTitle>
                                Email change pending
                            </AlertTitle>

                            <AlertDescription>
                                A change to {pendingEmail} is awaiting
                                confirmation. Check your inboxes for
                                instructions.
                            </AlertDescription>
                        </Alert>
                    )}

                    <form
                        onSubmit={emailForm.handleSubmit(changeEmail)}
                        noValidate
                        className="space-y-5"
                        aria-busy={isBusy}
                    >
                        <div className="space-y-2">
                            <Label htmlFor="new-email">
                                New email address
                            </Label>

                            <Input
                                id="new-email"
                                type="email"
                                autoComplete="email"
                                placeholder="you@example.com"
                                maxLength={254}
                                readOnly={isBusy}
                                {...emailForm.register("newEmail")}
                                {...invalidProps("new-email-error", emailErrors.newEmail)}
                            />
                            <FieldError id="new-email-error" message={emailErrors.newEmail?.message} />
                        </div>

                        <p className="text-sm leading-7 text-muted-foreground">
                            Keep access to your current email while confirming
                            the change. Follow all confirmation instructions
                            sent by email.
                        </p>

                        <div aria-live="polite">
                            <FormFeedback feedback={emailFeedback} />
                        </div>

                        <div className="border-t pt-5">
                            <Button size="lg" type="submit" disabled={isBusy}>
                                {isBusy
                                    ? "Requesting change…"
                                    : "Update email address"}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </section>
    );
}