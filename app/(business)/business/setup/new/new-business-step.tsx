"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { FiArrowRight } from "react-icons/fi";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { CategorySelect, OTHER_CATEGORY } from "@/components/category-select";
import { FieldError, invalidProps } from "@/components/field-error";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requiredText } from "@/lib/validation";
import { setupSteps } from "@/lib/setup-steps";
import { createClient } from "@/utils/supabase/client";
import Link from "next/link";
import { welcomeNewBusiness } from "@/app/(business)/onboarding/actions";
import { SetupShell } from "../setup-shell";

const schema = z
    .object({
        // Asked for only when the account hasn't got one: a customer
        // who collected stamps first and is now opening a business.
        yourName: z.string().max(100, "Keep it under 100 characters.").optional(),
        businessName: requiredText("The business name", { min: 2, max: 160 }),
        category: z.string().min(1, "Choose a category."),
        // Only asked for, and only required, when nothing on the list
        // fits. The database keeps these words until we have a
        // category for them.
        otherCategory: z.string().max(100, "Keep it under 100 characters.").optional(),
    })
    .refine(
        (values) =>
            values.category !== OTHER_CATEGORY || (values.otherCategory ?? "").trim().length >= 2,
        { path: ["otherCategory"], message: "Tell us in a few words what you do." },
    );

type Values = z.infer<typeof schema>;

type UnclaimedPage = {
    page_name: string;
    page_slug: string;
    page_address: string | null;
    page_area: string | null;
    page_city: string | null;
};

// Nothing is done yet, and nothing can be: the steps are shown so the
// shape of what's coming is visible, but there is no business to jump
// between them with.
const nothingDone = setupSteps({
    hasLogo: false,
    hasDescription: false,
    hasAddress: false,
    hasHours: false,
    hasCover: false,
    sentForReview: false,
    hasOffer: false,
});

export function NewBusinessStep({
    firstName,
    needsName = false,
}: {
    firstName: string | null;
    needsName?: boolean;
}) {
    const router = useRouter();
    const [errorMessage, setErrorMessage] = useState("");
    const [isRedirecting, setIsRedirecting] = useState(false);
    const [name, setName] = useState("");

    // A page we built for them before they ever heard of us
    // (20270310090000). Held rather than acted on: we are guessing from
    // a name, and the person who knows is the one typing it.
    const [maybeTheirs, setMaybeTheirs] = useState<UnclaimedPage[] | null>(null);

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm<Values>({
        resolver: zodResolver(schema),
        defaultValues: { yourName: "", businessName: "", category: "", otherCategory: "" },
    });

    // The one answer that asks another question. Kept here rather than
    // watched, the way the name beside it is.
    const [chosenCategory, setChosenCategory] = useState("");

    async function create(values: Values) {
        setErrorMessage("");

        const client = createClient();

        // Ask before making a second page for a shop that already has
        // one. Pages first means the page they are about to duplicate is
        // public, picking up search traffic, and the one thing standing
        // between them and a declined listing a week from now.
        //
        // Only once: if they say it is a different business, it is a
        // different business, and a flow that keeps asking is a flow
        // that calls them a liar.
        if (maybeTheirs === null) {
            const { data: pages } = await client.rpc("unclaimed_pages_like", {
                search_name: values.businessName,
            });

            if ((pages ?? []).length > 0) {
                setMaybeTheirs(pages as UnclaimedPage[]);
                return;
            }

            setMaybeTheirs([]);
        }

        // Theirs before the business is theirs: every email from here
        // on is addressed to a person, and this is the only screen that
        // asks. A failure to save it must not stop them opening a
        // business, so it is not checked.
        if (needsName && values.yourName?.trim()) {
            await client.auth
                .updateUser({ data: { full_name: values.yourName.trim() } })
                .catch(() => undefined);
        }

        // The address, the logo and the rest are steps of their own: this
        // makes the business, and the flow does the page.
        const { data, error } = await client.rpc("create_business_with_owner", {
            business_name: values.businessName,
            // Their own words where the list had nothing: the database
            // finds no category for them and keeps what they said.
            business_category:
                values.category === OTHER_CATEGORY
                    ? values.otherCategory!.trim()
                    : values.category,
        });

        if (error || !data) {
            setErrorMessage(
                error?.message.includes("Authentication is required")
                    ? "Your session has ended. Please sign in again."
                    : (error?.message ?? "We couldn't add your business. Please try again."),
            );
            return;
        }

        setIsRedirecting(true);

        // The welcome email; a failure here mustn't block the flow.
        await welcomeNewBusiness(data).catch(() => undefined);

        router.push(`/business/setup/${data}?welcome=1`);
    }

    const busy = isSubmitting || isRedirecting;

    return (
        <SetupShell
            eyebrow="Add your business"
            heading={firstName ? `Let's get you set up, ${firstName}.` : "Let's get you set up."}
            blurb="Start with the name customers know you by. Everything else is a step of its own, and you can see the page taking shape as you go."
            steps={nothingDone}
            active={null}
            page={{ name: name.trim() || "Your business" }}
            stepTitle="What's your business called?"
            stepBlurb="This is the name on your page, your offers and your stamp card."
        >
            <form onSubmit={handleSubmit(create)} noValidate>
                <div className="rounded-2xl border border-[#17233B]/10 bg-white p-6 shadow-sm sm:p-8">
                    <div className="space-y-5">
                        {/* First, because it is about them rather than
                            the business, and because the page beside
                            this one greets them by it. */}
                        {needsName && (
                            <div className="space-y-2">
                                <Label htmlFor="yourName">Your name</Label>

                                <Input
                                    id="yourName"
                                    maxLength={100}
                                    autoComplete="name"
                                    autoFocus
                                    placeholder="Alex Hart"
                                    readOnly={busy}
                                    {...register("yourName")}
                                    {...invalidProps("yourName-error", errors.yourName)}
                                />
                                <FieldError id="yourName-error" message={errors.yourName?.message} />

                                <p className="text-sm text-[#17233B]/65">
                                    So we know who we&apos;re writing to. Customers see your
                                    business name, never yours.
                                </p>
                            </div>
                        )}

                        {/* We think we have already built this one a
                            page. Shown instead of making a second, with
                            the way out underneath for the pub on the
                            next road with the same name. */}
                        {maybeTheirs !== null && maybeTheirs.length > 0 && (
                            <div className="rounded-xl border border-[#FF593F]/30 bg-[#FF593F]/[0.04] p-5">
                                <p className="font-semibold">
                                    {maybeTheirs.length === 1
                                        ? "We may already have a page for this"
                                        : "We may already have a page for one of these"}
                                </p>
                                <p className="mt-1 text-sm leading-6 text-[#17233B]/70">
                                    We build pages for local businesses before they join. If one of
                                    these is you, claim it rather than starting again: it is already
                                    public, and everything on it becomes yours to change.
                                </p>

                                <ul className="mt-4 space-y-3">
                                    {maybeTheirs.map((page) => (
                                        <li
                                            key={page.page_slug}
                                            className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-white px-4 py-3"
                                        >
                                            <div className="min-w-0">
                                                <p className="font-medium">{page.page_name}</p>
                                                <p className="truncate text-sm text-[#17233B]/65">
                                                    {[page.page_address, page.page_area, page.page_city]
                                                        .filter(Boolean)
                                                        .join(", ")}
                                                </p>
                                            </div>

                                            <Button
                                                render={
                                                    <Link
                                                        href={`/businesses/${page.page_slug}#claim`}
                                                        target="_blank"
                                                    />
                                                }
                                                nativeButton={false}
                                                size="sm"
                                            >
                                                That&apos;s us, claim it
                                            </Button>
                                        </li>
                                    ))}
                                </ul>

                                <p className="mt-4 text-sm text-[#17233B]/65">
                                    {maybeTheirs.length === 1 ? "Not you?" : "None of them you?"}{" "}
                                    Carry on below and we&apos;ll set up a new one.
                                </p>
                            </div>
                        )}

                        <div className="space-y-2">
                            <Label htmlFor="businessName">Business name</Label>

                            <Input
                                id="businessName"
                                maxLength={160}
                                // The cursor goes to whichever field is first.
                                autoFocus={!needsName}
                                placeholder="Harbour Grind"
                                readOnly={busy}
                                {...register("businessName", {
                                    // The page beside this takes the name as they type it.
                                    // Changing it also asks the duplicate question again: a
                                    // different name is a different question, and the answer
                                    // to the last one was about a different shop.
                                    onChange: (event) => {
                                        setName(event.target.value);
                                        setMaybeTheirs(null);
                                    },
                                })}
                                {...invalidProps("businessName-error", errors.businessName)}
                            />
                            <FieldError id="businessName-error" message={errors.businessName?.message} />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="category">What kind of business is it?</Label>

                            <CategorySelect
                                id="category"
                                name="category"
                                allowOther
                                registration={register("category", {
                                    onChange: (event) => setChosenCategory(event.target.value),
                                })}
                                invalid={invalidProps("category-error", errors.category)}
                            />
                            <FieldError id="category-error" message={errors.category?.message} />

                            {/* Nothing on the list is them. Rather than
                                making them pick the nearest wrong one,
                                we ask — and sort it out at our end. */}
                            {chosenCategory === OTHER_CATEGORY && (
                                <div className="space-y-2 pt-2">
                                    <Label htmlFor="otherCategory">
                                        Tell us in a few words what you do
                                    </Label>

                                    <Input
                                        id="otherCategory"
                                        placeholder="e.g. tattoo studio, car garage, nursery"
                                        readOnly={busy}
                                        {...register("otherCategory")}
                                        {...invalidProps("otherCategory-error", errors.otherCategory)}
                                    />
                                    <FieldError
                                        id="otherCategory-error"
                                        message={errors.otherCategory?.message}
                                    />

                                    <p className="text-sm text-[#17233B]/65">
                                        Your page says this until we add a category for you,
                                        which we do when we check your business over.
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>

                    {errorMessage && (
                        <Alert variant="destructive" className="mt-5">
                            <AlertTitle>Unable to add your business</AlertTitle>
                            <AlertDescription>{errorMessage}</AlertDescription>
                        </Alert>
                    )}

                    <div className="mt-6">
                        <Button type="submit" size="lg" disabled={busy}>
                            {busy
                                ? "Adding your business…"
                                : maybeTheirs !== null && maybeTheirs.length > 0
                                    ? "Mine's a different business"
                                    : "Add my business"}
                            <FiArrowRight aria-hidden="true" />
                        </Button>
                    </div>
                </div>
            </form>
        </SetupShell>
    );
}
