"use client";

import Link from "next/link";
import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { FiCheckCircle } from "react-icons/fi";
import { z } from "zod";

import { FieldError, invalidProps } from "@/components/field-error";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { email, requiredText } from "@/lib/validation";
import { requestPageClaim } from "./claim-actions";

// The panel on a page Promotello built and published before the business
// claimed it. It is the only thing on that page asking for anything, so
// it says what the page is, what claiming gets them, and what it costs,
// which is nothing.
//
// The button does not claim the page. It asks for the link that does,
// and a person reads the request first — a button that handed over a
// business to whoever clicked it would hand over any business to anyone
// who could type its name.

const schema = z.object({
    name: requiredText("Your name", { max: 80 }),
    email,
    connection: requiredText("How you're connected to it", { max: 200 }),
    website: z.string(),
});

type Values = z.infer<typeof schema>;

const failureMessages = {
    invalid: "Check the form and try again.",
    unavailable: "This page isn't waiting to be claimed any more. If that's a surprise, email hello@promotello.com.",
    failed: "We couldn't send that. Please try again in a minute.",
};

export function ClaimPanel({
    businessId,
    businessName,
}: {
    businessId: string;
    businessName: string;
}) {
    const [isSuccess, setIsSuccess] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm<Values>({
        resolver: zodResolver(schema),
        defaultValues: { name: "", email: "", connection: "", website: "" },
    });

    async function onSubmit(values: Values) {
        setErrorMessage("");

        const result = await requestPageClaim({ ...values, businessId }).catch(
            () => ({ ok: false, error: "failed" }) as const,
        );

        if (!result.ok) {
            setErrorMessage(failureMessages[result.error]);
            return;
        }

        setIsSuccess(true);
    }

    return (
        <section
            id="claim"
            aria-labelledby="claim-heading"
            className="scroll-mt-28 overflow-hidden rounded-2xl border border-[#FF593F]/25 bg-white shadow-sm"
        >
            <div className="bg-[#FF593F]/5 px-6 py-5">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#FF593F]">
                    Unclaimed page
                </p>
                <h2 id="claim-heading" className="mt-2 text-2xl font-semibold tracking-tight">
                    Is this your business?
                </h2>
                <p className="mt-2 max-w-prose text-[15px] leading-relaxed text-[#17233B]/75">
                    We built this page for {businessName}, and nobody can find it: it&apos;s in no
                    listing and no search until somebody claims it. Claim it and it&apos;s yours —
                    your own photos and words, an offer customers claim on their phone, a stamp
                    card, and a place in the directory where local people look. Free to claim, and
                    free to keep using.
                </p>
            </div>

            <div className="px-6 py-6">
                {isSuccess ? (
                    <div role="status" aria-live="polite" className="py-4 text-center">
                        <FiCheckCircle aria-hidden="true" className="mx-auto size-10 text-emerald-600" />
                        <h3 className="mt-4 text-lg font-semibold">That&apos;s with us</h3>
                        <p className="mx-auto mt-2 max-w-sm text-sm leading-7 text-[#17233B]/70">
                            We check every request by hand, so nobody can take a page that
                            isn&apos;t theirs. We&apos;ll email your claim link, usually the same
                            day.
                        </p>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5" aria-busy={isSubmitting}>
                        <div className="grid gap-5 sm:grid-cols-2">
                            <div className="space-y-2">
                                <Label htmlFor="claim-name">Your name</Label>
                                <Input
                                    id="claim-name"
                                    autoComplete="name"
                                    placeholder="Your full name"
                                    maxLength={80}
                                    {...register("name")}
                                    {...invalidProps("claim-name-error", errors.name)}
                                />
                                <FieldError id="claim-name-error" message={errors.name?.message} />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="claim-email">Email address</Label>
                                <Input
                                    id="claim-email"
                                    type="email"
                                    autoComplete="email"
                                    placeholder="you@yourbusiness.com"
                                    maxLength={254}
                                    {...register("email")}
                                    {...invalidProps("claim-email-error", errors.email)}
                                />
                                <FieldError id="claim-email-error" message={errors.email?.message} />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="claim-connection">How are you connected to it?</Label>
                            <Input
                                id="claim-connection"
                                placeholder="I own it, I'm the manager…"
                                maxLength={200}
                                {...register("connection")}
                                {...invalidProps("claim-connection-error", errors.connection)}
                            />
                            <FieldError
                                id="claim-connection-error"
                                message={errors.connection?.message}
                            />
                            <p className="text-xs leading-6 text-[#17233B]/60">
                                An email at the business&apos;s own address is the quickest way for
                                us to be sure.
                            </p>
                        </div>

                        <div aria-hidden="true" className="absolute -left-[10000px]">
                            <Label htmlFor="claim-website">Leave this field empty</Label>
                            <Input id="claim-website" tabIndex={-1} autoComplete="off" {...register("website")} />
                        </div>

                        {errorMessage && (
                            <Alert variant="destructive">
                                <AlertTitle>Not sent</AlertTitle>
                                <AlertDescription>{errorMessage}</AlertDescription>
                            </Alert>
                        )}

                        <div className="flex flex-wrap items-center gap-4">
                            <Button type="submit" size="lg" disabled={isSubmitting}>
                                {isSubmitting ? "Sending…" : "Claim your free page"}
                            </Button>
                            <p className="text-sm text-[#17233B]/65">
                                Not yours?{" "}
                                <Link href="/contact" className="underline underline-offset-4">
                                    Tell us and we&apos;ll take it down
                                </Link>
                                .
                            </p>
                        </div>
                    </form>
                )}
            </div>
        </section>
    );
}
