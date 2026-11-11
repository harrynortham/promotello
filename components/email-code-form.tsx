"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { FieldError, invalidProps } from "@/components/field-error";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { email as emailField, requiredText } from "@/lib/validation";
import { CodeInput } from "@/components/code-input";
import { CODE_LENGTH, RESEND_SECONDS, codeField, signInProblem } from "@/lib/sign-in-code";
import { createClient } from "@/utils/supabase/client";

// The name is asked for where we need one — a business owner is a
// person we will write to — and saved on the account with the first code.
function emailSchemaFor(withName: boolean) {
    return z.object({
        email: emailField,
        name: withName ? requiredText("Your name", { max: 100 }) : z.string().optional(),
    });
}

const codeSchema = z.object({ code: codeField });

type EmailValues = z.infer<ReturnType<typeof emailSchemaFor>>;
type CodeValues = z.infer<typeof codeSchema>;

// Signing in and signing up are the same two steps — an address, then the
// code sent to it. The only difference is whether an address nobody has
// used before makes an account or an apology, which is what `mode` says.
export function EmailCodeForm({
    mode,
    next,
    idPrefix,
    defaultEmail = "",
    collectName = false,
    submitLabel,
    otherWayHref,
}: {
    mode: "sign-in" | "sign-up";
    // Where they go once they are in, when the page that sent them here
    // asked for somewhere. Left out, the server works out where they
    // belong — which for a business owner is their business, not the
    // customer dashboard.
    next?: string;
    // Keeps field ids stable and distinct per page.
    idPrefix: string;
    defaultEmail?: string;
    // Ask for a name as well, saved on the account with the first code.
    collectName?: boolean;
    // "Email me a code" unless this page calls it something else.
    submitLabel?: string;
    // Sign up, when signing in found nobody — or the other way round.
    otherWayHref: string;
}) {
    const [sentTo, setSentTo] = useState("");
    // The address a code is outstanding for, kept even after stepping
    // back to change it: otherwise asking for the same address again is
    // a new send, which Supabase refuses for a minute — and the error
    // said "use the last one we sent" from a screen with nowhere to
    // enter it.
    const [codeOutstandingFor, setCodeOutstandingFor] = useState("");
    // Came back to a code already sent, rather than a new one.
    const [reusingCode, setReusingCode] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");
    const [offerOtherWay, setOfferOtherWay] = useState(false);
    const [resendIn, setResendIn] = useState(0);
    // Stays true after success, while the next page loads.
    const [isFinishing, setIsFinishing] = useState(false);
    const codeRef = useRef<HTMLInputElement | null>(null);

    const emailForm = useForm<EmailValues>({
        resolver: zodResolver(emailSchemaFor(collectName)),
        defaultValues: { email: defaultEmail, name: "" },
    });

    const codeForm = useForm<CodeValues>({
        resolver: zodResolver(codeSchema),
        defaultValues: { code: "" },
    });

    // Supabase won't send another code for a minute, so the button says so
    // rather than failing when it is pressed.
    useEffect(() => {
        if (resendIn <= 0) return;

        const timer = setTimeout(() => setResendIn((seconds) => seconds - 1), 1000);

        return () => clearTimeout(timer);
    }, [resendIn]);

    async function send(address: string, name?: string) {
        setErrorMessage("");
        setOfferOtherWay(false);

        // The same address they already have a code for, within the
        // minute Supabase will not send another: the code in their inbox
        // is the one they need, so this goes back to the box for it
        // rather than asking for a code that won't be sent.
        if (address.toLowerCase() === codeOutstandingFor.toLowerCase() && resendIn > 0) {
            setReusingCode(true);
            setSentTo(address);
            return true;
        }

        const { error } = await createClient().auth.signInWithOtp({
            email: address,
            options: {
                shouldCreateUser: mode === "sign-up",
                data: name?.trim() ? { full_name: name.trim() } : undefined,
            },
        });

        if (error) {
            const problem = signInProblem(error.message, mode);

            // "Use the last one we sent you" is only advice if the box to
            // type it into is on screen. It is one tap away, so go there.
            if (problem.rateLimited && address.toLowerCase() === codeOutstandingFor.toLowerCase()) {
                setReusingCode(true);
                setSentTo(address);
                return true;
            }

            setErrorMessage(problem.message);
            setOfferOtherWay(problem.otherWay);
            return false;
        }

        setReusingCode(false);
        setSentTo(address);
        setCodeOutstandingFor(address);
        setResendIn(RESEND_SECONDS);
        codeForm.reset({ code: "" });

        return true;
    }

    async function verify(values: CodeValues) {
        setErrorMessage("");

        const { error } = await createClient().auth.verifyOtp({
            email: sentTo,
            token: values.code.trim(),
            type: "email",
        });

        if (error) {
            setErrorMessage(
                /expired|invalid/i.test(error.message)
                    ? "That code is wrong or has expired. Check the latest email, or send a new code."
                    : error.message,
            );
            return;
        }

        setIsFinishing(true);

        // A whole page load, so the session cookies the browser has just
        // written go with it: the server finishes signing them in and
        // decides where they land. Not router.push, which would hand the
        // route handler a client-side navigation it can't answer.
        const finish = new URL("/auth/signed-in", window.location.origin);
        if (next) finish.searchParams.set("next", next);

        window.location.assign(finish.toString());
    }

    const isSending = emailForm.formState.isSubmitting;
    const isVerifying = codeForm.formState.isSubmitting || isFinishing;
    const codeRegistration = codeForm.register("code");
    // useWatch rather than watch(): the compiler can't memoise watch().
    const typedCode = useWatch({ control: codeForm.control, name: "code" }) ?? "";

    if (!sentTo) {
        return (
            <form
                onSubmit={emailForm.handleSubmit((values) => send(values.email.trim(), values.name))}
                noValidate
                className="mt-6 space-y-5"
                aria-busy={isSending}
            >
                {collectName && (
                    <div className="space-y-2">
                        <Label htmlFor={`${idPrefix}-name`}>Your name</Label>

                        <Input
                            id={`${idPrefix}-name`}
                            autoComplete="name"
                            placeholder="Alex Taylor"
                            maxLength={100}
                            readOnly={isSending}
                            {...emailForm.register("name")}
                            {...invalidProps(`${idPrefix}-name-error`, emailForm.formState.errors.name)}
                        />

                        <FieldError
                            id={`${idPrefix}-name-error`}
                            message={emailForm.formState.errors.name?.message}
                        />
                    </div>
                )}

                <div className="space-y-2">
                    <Label htmlFor={`${idPrefix}-email`}>Email address</Label>

                    <Input
                        id={`${idPrefix}-email`}
                        type="email"
                        autoComplete="email"
                        placeholder="you@example.com"
                        readOnly={isSending}
                        {...emailForm.register("email")}
                        {...invalidProps(`${idPrefix}-email-error`, emailForm.formState.errors.email)}
                    />

                    <FieldError
                        id={`${idPrefix}-email-error`}
                        message={emailForm.formState.errors.email?.message}
                    />
                </div>

                {errorMessage && (
                    <Alert variant="destructive">
                        <AlertTitle>
                            {mode === "sign-up" ? "Unable to create your account" : "Unable to sign you in"}
                        </AlertTitle>

                        <AlertDescription>
                            {errorMessage}
                            {offerOtherWay && (
                                <>
                                    {" "}
                                    <Link href={otherWayHref} className="font-semibold underline underline-offset-4">
                                        {mode === "sign-up" ? "Sign in instead" : "Create an account"}
                                    </Link>
                                    .
                                </>
                            )}
                        </AlertDescription>
                    </Alert>
                )}

                <Button type="submit" disabled={isSending} size="lg" className="w-full">
                    {isSending ? "Sending your code…" : (submitLabel ?? "Email me a code")}
                </Button>

                <p className="text-center text-xs leading-5 text-muted-foreground">
                    We&apos;ll send a {CODE_LENGTH}-digit code. No password to remember.
                </p>
            </form>
        );
    }

    return (
        <form
            onSubmit={codeForm.handleSubmit(verify)}
            noValidate
            className="mt-6 space-y-5"
            aria-busy={isVerifying}
        >
            <div role="status" aria-live="polite" className="rounded-xl bg-muted/50 px-4 py-3 text-sm">
                {reusingCode ? (
                    <>
                        We already sent a {CODE_LENGTH}-digit code to <strong>{sentTo}</strong>. Use
                        that one — it expires an hour after it was sent.
                    </>
                ) : (
                    <>
                        We&apos;ve sent a {CODE_LENGTH}-digit code to <strong>{sentTo}</strong>. It
                        expires in an hour.
                    </>
                )}
            </div>

            <div className="space-y-2">
                <Label htmlFor={`${idPrefix}-code`}>Your code</Label>

                <CodeInput
                    id={`${idPrefix}-code`}
                    name={codeRegistration.name}
                    length={CODE_LENGTH}
                    value={typedCode}
                    disabled={isVerifying}
                    invalid={Boolean(codeForm.formState.errors.code)}
                    describedBy={codeForm.formState.errors.code ? `${idPrefix}-code-error` : undefined}
                    autoFocus
                    onChange={codeRegistration.onChange}
                    onBlur={codeRegistration.onBlur}
                    inputRef={(element) => {
                        codeRegistration.ref(element);
                        codeRef.current = element;
                    }}
                />

                <FieldError
                    id={`${idPrefix}-code-error`}
                    message={codeForm.formState.errors.code?.message}
                />
            </div>

            {errorMessage && (
                <Alert variant="destructive">
                    <AlertTitle>Unable to sign you in</AlertTitle>
                    <AlertDescription>{errorMessage}</AlertDescription>
                </Alert>
            )}

            <Button type="submit" disabled={isVerifying} size="lg" className="w-full">
                {isVerifying ? "Signing you in…" : "Sign in"}
            </Button>

            <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs">
                <button
                    type="button"
                    disabled={resendIn > 0 || isVerifying}
                    onClick={async () => {
                        if (await send(sentTo)) codeRef.current?.focus();
                    }}
                    className="cursor-pointer font-medium underline-offset-4 hover:underline disabled:cursor-default disabled:text-muted-foreground disabled:no-underline"
                >
                    {resendIn > 0 ? `Send a new code in ${resendIn}s` : "Send a new code"}
                </button>

                <button
                    type="button"
                    disabled={isVerifying}
                    onClick={() => {
                        setSentTo("");
                        setErrorMessage("");
                    }}
                    className="cursor-pointer font-medium underline-offset-4 hover:underline"
                >
                    Use a different email
                </button>
            </div>
        </form>
    );
}
