"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { FiX } from "react-icons/fi";

import { Button } from "@/components/ui/button";
import { FieldError, invalidProps } from "@/components/field-error";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requiredText } from "@/lib/validation";
import { createClient } from "@/utils/supabase/client";

// Somebody who signed up to claim a voucher was never asked their name:
// /signup doesn't ask, and a business owner is asked at
// /business/register instead. So every email we send them opens with
// nothing, and a review they leave later has nobody behind it.
//
// This is the asking, and where it is matters more than what it says.
// Claiming an offer ends on the offer's own page and joining a card
// ends on the card, so neither flow passes through the dashboard — a
// card here cannot interrupt the thing somebody came to do. It is also
// skippable, and once skipped it stays skipped on every device, because
// the answer lives on the account rather than in this browser.

const schema = z.object({ name: requiredText("Your name", { max: 100 }) });

type Values = z.infer<typeof schema>;

export function TellUsYourName() {
    const router = useRouter();
    const [gone, setGone] = useState(false);
    const [skipping, setSkipping] = useState(false);
    const [failed, setFailed] = useState(false);

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { name: "" } });

    async function save(values: Values) {
        setFailed(false);

        const { error } = await createClient().auth.updateUser({
            data: { full_name: values.name.trim() },
        });

        if (error) {
            setFailed(true);
            return;
        }

        setGone(true);
        // The header greets them by it, so the page it is on should
        // agree with the header.
        router.refresh();
    }

    async function notNow() {
        // Remembered on the account, so it is asked once rather than
        // once per device — which means waiting for it to be written.
        // Hiding first and saving after loses the answer for anybody
        // who clicks and immediately goes somewhere else.
        setSkipping(true);

        await createClient()
            .auth.updateUser({ data: { name_asked_at: new Date().toISOString() } })
            .catch(() => undefined);

        setGone(true);
        router.refresh();
    }

    if (gone) return null;

    return (
        <section
            aria-labelledby="tell-us-your-name"
            className="mt-8 rounded-2xl border border-[#17233B]/10 bg-white p-5 sm:p-6"
        >
            <div className="flex items-start justify-between gap-4">
                <div>
                    <h2 id="tell-us-your-name" className="font-semibold">
                        What should we call you?
                    </h2>
                    <p className="mt-1 text-sm leading-6 text-[#17233B]/70">
                        So an email from us opens with your name rather than nothing. It is
                        only ever seen by you and the businesses you visit.
                    </p>
                </div>

                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={notNow}
                    disabled={skipping}
                    aria-label="Not now"
                    className="-mr-2 -mt-1 shrink-0"
                >
                    <FiX aria-hidden="true" />
                </Button>
            </div>

            <form onSubmit={handleSubmit(save)} noValidate className="mt-4 flex flex-wrap items-start gap-3">
                <div className="min-w-0 flex-1 space-y-2">
                    <Label htmlFor="your-name" className="sr-only">
                        Your name
                    </Label>

                    <Input
                        id="your-name"
                        maxLength={100}
                        autoComplete="name"
                        placeholder="Your name"
                        {...register("name")}
                        {...invalidProps("your-name-error", errors.name)}
                    />
                    <FieldError id="your-name-error" message={errors.name?.message} />
                </div>

                <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? "Saving…" : "Save"}
                </Button>
            </form>

            {failed && (
                <p className="mt-3 text-sm text-destructive">
                    That didn&apos;t save. Please try again.
                </p>
            )}

            <p className="mt-3 text-sm text-[#17233B]/65">
                Want a photo on it too?{" "}
                <Link href="/account/profile" className="font-medium underline underline-offset-4">
                    Add one in your profile
                </Link>
                .
            </p>
        </section>
    );
}
