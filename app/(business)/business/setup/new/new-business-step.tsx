"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { FiArrowRight } from "react-icons/fi";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { CategorySelect } from "@/components/category-select";
import { FieldError, invalidProps } from "@/components/field-error";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requiredText } from "@/lib/validation";
import { setupSteps } from "@/lib/setup-steps";
import { createClient } from "@/utils/supabase/client";
import { welcomeNewBusiness } from "@/app/(business)/onboarding/actions";
import { SetupShell } from "../setup-shell";

const schema = z.object({
    businessName: requiredText("The business name", { min: 2, max: 160 }),
    category: z.string().min(1, "Choose a category."),
});

type Values = z.infer<typeof schema>;

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

export function NewBusinessStep({ firstName }: { firstName: string | null }) {
    const router = useRouter();
    const [errorMessage, setErrorMessage] = useState("");
    const [isRedirecting, setIsRedirecting] = useState(false);
    const [name, setName] = useState("");

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm<Values>({
        resolver: zodResolver(schema),
        defaultValues: { businessName: "", category: "" },
    });

    async function create(values: Values) {
        setErrorMessage("");

        // The address, the logo and the rest are steps of their own: this
        // makes the business, and the flow does the page.
        const { data, error } = await createClient().rpc("create_business_with_owner", {
            business_name: values.businessName,
            business_category: values.category,
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
                        <div className="space-y-2">
                            <Label htmlFor="businessName">Business name</Label>

                            <Input
                                id="businessName"
                                maxLength={160}
                                autoFocus
                                placeholder="Harbour Grind"
                                readOnly={busy}
                                {...register("businessName", {
                                    // The page beside this takes the name as they type it.
                                    onChange: (event) => setName(event.target.value),
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
                                registration={register("category")}
                                invalid={invalidProps("category-error", errors.category)}
                            />
                            <FieldError id="category-error" message={errors.category?.message} />
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
                            {busy ? "Adding your business…" : "Add my business"}
                            <FiArrowRight aria-hidden="true" />
                        </Button>
                    </div>
                </div>
            </form>
        </SetupShell>
    );
}
