"use client";

import Link from "next/link";
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
import { email as emailField, password } from "@/lib/validation";
import { createClient } from "@/utils/supabase/client";

const passwordSchema = z
    .object({
        currentPassword: z.string().min(1, "Enter your current password."),
        newPassword: password,
        confirmNewPassword: z.string(),
    })
    .refine((values) => values.newPassword === values.confirmNewPassword, {
        message: "Your new passwords do not match.",
        path: ["confirmNewPassword"],
    })
    .refine((values) => values.newPassword !== values.currentPassword, {
        message: "Choose a different password from your current one.",
        path: ["newPassword"],
    });

const emailSchema = z.object({
    newEmail: emailField.transform((value) => value.toLowerCase()),
    emailPassword: z.string().min(1, "Enter your current password."),
});

type PasswordValues = z.infer<typeof passwordSchema>;
type EmailValues = z.infer<typeof emailSchema>;

type SecurityFormProps = {
    email: string;
    pendingEmail: string;
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
}: SecurityFormProps) {
    const router = useRouter();

    const [passwordFeedback, setPasswordFeedback] =
        useState<Feedback>(null);

    const [emailFeedback, setEmailFeedback] =
        useState<Feedback>(null);

    const passwordForm = useForm<PasswordValues>({
        resolver: zodResolver(passwordSchema),
        defaultValues: { currentPassword: "", newPassword: "", confirmNewPassword: "" },
    });

    const emailForm = useForm<EmailValues>({
        resolver: zodResolver(emailSchema),
        defaultValues: { newEmail: "", emailPassword: "" },
    });

    const passwordErrors = passwordForm.formState.errors;
    const emailErrors = emailForm.formState.errors;

    const busyForm = passwordForm.formState.isSubmitting
        ? "password"
        : emailForm.formState.isSubmitting
            ? "email"
            : null;

    const isBusy = busyForm !== null;

    async function confirmPassword(currentPassword: string) {
        const supabase = createClient();

        // Read the current identity instead of relying on page props.
        const {
            data: { user },
            error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user?.email) {
            throw new Error(
                "Your session could not be verified. Please sign in again.",
            );
        }

        const { data, error } =
            await supabase.auth.signInWithPassword({
                email: user.email,
                password: currentPassword,
            });

        if (error || data.user?.id !== user.id) {
            throw new Error(
                "We couldn’t verify your current password. Check it and try again.",
            );
        }

        return {
            supabase,
            currentEmail: user.email,
        };
    }

    async function changePassword(values: PasswordValues) {
        if (isBusy) return;

        setPasswordFeedback(null);

        try {
            const { supabase } = await confirmPassword(values.currentPassword);

            const { error } = await supabase.auth.updateUser({
                password: values.newPassword,
            });

            if (error) throw error;

            passwordForm.reset();

            setPasswordFeedback({
                type: "success",
                message:
                    "Your password has been changed. Use your new password the next time you sign in.",
            });

            router.refresh();
        } catch (error) {
            setPasswordFeedback({
                type: "error",
                message:
                    error instanceof Error
                        ? error.message
                        : "Please try again.",
            });
        }
    }

    async function changeEmail(values: EmailValues) {
        if (isBusy) return;

        setEmailFeedback(null);

        try {
            const { supabase, currentEmail } = await confirmPassword(values.emailPassword);

            if (values.newEmail === currentEmail.toLowerCase()) {
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

            <Card className="rounded-2xl shadow-none">
                <CardHeader>
                    <div className="mb-3 flex size-11 items-center justify-center rounded-xl bg-muted">
                        <FiLock
                            aria-hidden="true"
                            className="size-5"
                        />
                    </div>

                    <CardTitle>Change password</CardTitle>

                    <CardDescription className="leading-7">
                        Choose a strong, unique password that you don’t use
                        for other accounts.
                    </CardDescription>
                </CardHeader>

                <CardContent>
                    <form
                        onSubmit={passwordForm.handleSubmit(changePassword)}
                        noValidate
                        className="space-y-5"
                        aria-busy={busyForm === "password"}
                    >
                        <div className="space-y-2">
                            <Label htmlFor="current-password">
                                Current password
                            </Label>

                            <Input
                                id="current-password"
                                type="password"
                                autoComplete="current-password"
                                readOnly={isBusy}
                                {...passwordForm.register("currentPassword")}
                                {...invalidProps("current-password-error", passwordErrors.currentPassword)}
                            />
                            <FieldError id="current-password-error" message={passwordErrors.currentPassword?.message} />
                        </div>

                        <div className="grid gap-5 sm:grid-cols-2">
                            <div className="space-y-2">
                                <Label htmlFor="new-password">
                                    New password
                                </Label>

                                <Input
                                    id="new-password"
                                    type="password"
                                    autoComplete="new-password"
                                    readOnly={isBusy}
                                    {...passwordForm.register("newPassword")}
                                    {...invalidProps("new-password-error", passwordErrors.newPassword)}
                                />
                                <FieldError id="new-password-error" message={passwordErrors.newPassword?.message} />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="confirm-new-password">
                                    Confirm new password
                                </Label>

                                <Input
                                    id="confirm-new-password"
                                    type="password"
                                    autoComplete="new-password"
                                    readOnly={isBusy}
                                    {...passwordForm.register("confirmNewPassword")}
                                    {...invalidProps("confirm-new-password-error", passwordErrors.confirmNewPassword)}
                                />
                                <FieldError id="confirm-new-password-error" message={passwordErrors.confirmNewPassword?.message} />
                            </div>
                        </div>

                        <p className="text-xs leading-6 text-muted-foreground">
                            Use at least 8 characters. Any additional password
                            requirements for your account will also apply.
                        </p>

                        <div aria-live="polite">
                            <FormFeedback feedback={passwordFeedback} />
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-4 border-t pt-5">
                            <Button type="submit" disabled={isBusy}>
                                {busyForm === "password"
                                    ? "Updating password…"
                                    : "Update password"}
                            </Button>

                            <Link
                                href="/forgot-password"
                                className="text-sm font-medium underline underline-offset-4"
                            >
                                Forgotten your password?
                            </Link>
                        </div>
                    </form>
                </CardContent>
            </Card>

            <Card className="rounded-2xl shadow-none">
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
                        aria-busy={busyForm === "email"}
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

                        <div className="space-y-2">
                            <Label htmlFor="email-password">
                                Current password
                            </Label>

                            <Input
                                id="email-password"
                                type="password"
                                autoComplete="current-password"
                                readOnly={isBusy}
                                {...emailForm.register("emailPassword")}
                                {...invalidProps("email-password-error", emailErrors.emailPassword)}
                            />
                            <FieldError id="email-password-error" message={emailErrors.emailPassword?.message} />
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
                            <Button type="submit" disabled={isBusy}>
                                {busyForm === "email"
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