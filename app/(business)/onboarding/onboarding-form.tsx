"use client";

import { useRouter } from "next/navigation";
import { KeyboardEvent, useRef, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, type FieldPath } from "react-hook-form";
import { z } from "zod";
import { FiArrowLeft, FiArrowRight, FiCheck } from "react-icons/fi";

import { CategorySelect } from "@/components/category-select";
import { FieldError, invalidProps } from "@/components/field-error";
import { LocationFields } from "@/components/location-fields";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { CityOption } from "@/lib/locations";
import {
    locationShape,
    optionalEmail,
    optionalText,
    optionalUrl,
    postcodeInCity,
    requiredText,
} from "@/lib/validation";
import { createClient } from "@/utils/supabase/client";
import { welcomeNewBusiness } from "./actions";

const steps = [
    { title: "Your business", description: "The basics customers see first." },
    { title: "Where to find you", description: "So customers can visit and get directions." },
    { title: "Review and finish", description: "Check everything, then create your profile." },
];

function schemaFor(cities: CityOption[]) {
    return z
        .object({
            businessName: requiredText("The business name", { min: 2, max: 160 }),
            category: z.string().min(1, "Choose what kind of business it is."),
            description: optionalText("The description", 5000),
            addressLine1: requiredText("The street address", { min: 2, max: 200 }),
            addressLine2: optionalText("Unit or floor", 200),
            ...locationShape,
            website: optionalUrl,
            contactEmail: optionalEmail,
        })
        .superRefine(postcodeInCity(cities));
}

type Values = z.infer<ReturnType<typeof schemaFor>>;

// The fields checked before leaving each step.
const stepFields: FieldPath<Values>[][] = [
    ["businessName", "category", "description"],
    ["addressLine1", "addressLine2", "city", "region", "postalCode"],
    ["website", "contactEmail"],
];

function Field({
    id,
    label,
    hint,
    error,
    children,
}: {
    id: string;
    label: string;
    hint?: string;
    error?: string;
    children: React.ReactNode;
}) {
    return (
        <div className="space-y-2">
            <Label htmlFor={id}>{label}</Label>
            {children}
            <FieldError id={`${id}-error`} message={error} />
            {hint && <p className="text-xs text-[#17233B]/55">{hint}</p>}
        </div>
    );
}

export function OnboardingForm({ firstName, cities }: { firstName: string | null; cities: CityOption[] }) {
    const router = useRouter();
    const formRef = useRef<HTMLFormElement>(null);
    const [step, setStep] = useState(0);
    const [summary, setSummary] = useState<Record<string, string>>({});
    const [errorMessage, setErrorMessage] = useState("");
    const [isRedirecting, setIsRedirecting] = useState(false);

    const {
        register,
        handleSubmit,
        trigger,
        getValues,
        formState: { errors, isSubmitting: isSending },
    } = useForm<Values>({
        resolver: zodResolver(schemaFor(cities)),
        defaultValues: {
            businessName: "",
            category: "",
            description: "",
            addressLine1: "",
            addressLine2: "",
            city: cities[0]?.name ?? "",
            region: "",
            postalCode: "",
            website: "",
            contactEmail: "",
        },
    });

    const isSubmitting = isSending || isRedirecting;

    async function goNext() {
        if (!(await trigger(stepFields[step], { shouldFocus: true }))) return;

        const values = getValues();
        const select = formRef.current?.querySelector<HTMLSelectElement>("#category");

        setSummary({
            name: values.businessName,
            category: select?.selectedOptions[0]?.text ?? "",
            address: [values.addressLine1, values.region, values.city, values.postalCode]
                .map((part) => part.trim())
                .filter(Boolean)
                .join(", "),
        });
        setStep((current) => Math.min(current + 1, steps.length - 1));
    }

    // Browsers only submit on Enter when the form has a submit button, and
    // earlier steps don't, so Enter in a field moves to the next step here.
    function handleKeyDown(event: KeyboardEvent<HTMLFormElement>) {
        const target = event.target as HTMLElement;

        if (event.key === "Enter" && target.tagName === "INPUT" && step < steps.length - 1) {
            event.preventDefault();
            void goNext();
        }
    }

    async function onSubmit(values: Values) {
        setErrorMessage("");

        const { data, error } = await createClient().rpc("create_business_with_owner", {
            business_name: values.businessName,
            business_category: values.category,
            business_description: values.description || null,
            business_website_url: values.website || null,
            business_contact_email: values.contactEmail || null,
            location_name: "Main location",
            location_address_line_1: values.addressLine1,
            location_address_line_2: values.addressLine2 || null,
            location_city: values.city,
            location_region: values.region,
            location_postal_code: values.postalCode,
            location_country_code: "GB",
        });

        if (error) {
            setErrorMessage(
                error.message.includes("Authentication is required")
                    ? "Your session has ended. Please sign in again."
                    : error.message,
            );
            return;
        }

        setIsRedirecting(true);

        // The welcome email; a failure here mustn't block the dashboard.
        await welcomeNewBusiness(data).catch(() => undefined);
        router.push(`/business/${data}?welcome=1`);
    }

    // Enter on an earlier step moves forward rather than submitting.
    const submit = step < steps.length - 1
        ? (event: React.FormEvent<HTMLFormElement>) => {
            event.preventDefault();
            void goNext();
        }
        : handleSubmit(onSubmit);

    return (
        <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#FF593F]">
                Add your business
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
                {firstName ? `Let's get you set up, ${firstName}` : "Let's get you set up"}
            </h1>
            <p className="mt-3 text-[#17233B]/65">
                It takes about two minutes. You can change any of this later.
            </p>

            <ol className="mt-8 grid grid-cols-3 gap-2" aria-label="Steps">
                {steps.map((item, index) => (
                    <li key={item.title} aria-current={index === step ? "step" : undefined}>
                        <div className={`h-1.5 rounded-full ${index <= step ? "bg-[#FF593F]" : "bg-[#17233B]/10"}`} />
                        <p className={`mt-2 text-xs font-medium sm:text-sm ${index === step ? "text-[#17233B]" : "text-[#17233B]/45"}`}>
                            {index + 1}. {item.title}
                        </p>
                    </li>
                ))}
            </ol>

            {/* Each step's fields are checked (with Zod) before moving on. */}
            <form ref={formRef} onSubmit={submit} onKeyDown={handleKeyDown} noValidate className="mt-8 rounded-3xl border border-[#17233B]/10 bg-white p-6 shadow-sm sm:p-8">
                <h2 className="text-xl font-semibold">{steps[step].title}</h2>
                <p className="mt-1 text-sm text-[#17233B]/60">{steps[step].description}</p>

                <div data-step="0" hidden={step !== 0} className="mt-6 space-y-5">
                    <Field id="businessName" label="Business name" error={errors.businessName?.message}>
                        <Input
                            id="businessName"
                            maxLength={160}
                            placeholder="e.g. Little Loaf Bakery"
                            autoFocus
                            {...register("businessName")}
                            {...invalidProps("businessName-error", errors.businessName)}
                        />
                    </Field>

                    <Field id="category" label="What kind of business is it?" error={errors.category?.message}>
                        <CategorySelect
                            id="category"
                            name="category"
                            registration={register("category")}
                            invalid={invalidProps("category-error", errors.category)}
                        />
                    </Field>

                    <Field
                        id="description"
                        label="Describe it in a sentence or two"
                        hint="Optional. You can add this later."
                        error={errors.description?.message}
                    >
                        <Textarea
                            id="description"
                            maxLength={5000}
                            rows={4}
                            placeholder="e.g. A neighbourhood bakery baking sourdough and cinnamon buns every morning."
                            {...register("description")}
                        />
                    </Field>
                </div>

                <div data-step="1" hidden={step !== 1} className="mt-6 space-y-5">
                    <Field id="addressLine1" label="Street address" error={errors.addressLine1?.message}>
                        <Input
                            id="addressLine1"
                            maxLength={200}
                            placeholder="e.g. 21 Gloucester Road"
                            autoComplete="address-line1"
                            {...register("addressLine1")}
                            {...invalidProps("addressLine1-error", errors.addressLine1)}
                        />
                    </Field>

                    <Field id="addressLine2" label="Unit or floor" hint="Optional.">
                        <Input id="addressLine2" maxLength={200} autoComplete="address-line2" {...register("addressLine2")} />
                    </Field>

                    <LocationFields
                        cities={cities}
                        fields={{ city: register("city"), region: register("region"), postalCode: register("postalCode") }}
                        errors={errors}
                    />
                </div>

                <div data-step="2" hidden={step !== 2} className="mt-6 space-y-6">
                    <dl className="divide-y divide-[#17233B]/10 rounded-2xl border border-[#17233B]/10">
                        {[
                            ["Business", summary.name, 0],
                            ["Category", summary.category, 0],
                            ["Address", summary.address, 1],
                        ].map(([label, value, target]) => (
                            <div key={label as string} className="flex items-start justify-between gap-4 p-4">
                                <div className="min-w-0">
                                    <dt className="text-xs text-[#17233B]/55">{label}</dt>
                                    <dd className="mt-0.5 font-medium">{value || "Not set"}</dd>
                                </div>
                                <button type="button" onClick={() => setStep(target as number)} className="shrink-0 text-sm font-medium text-[#FF593F] hover:underline">
                                    Change
                                </button>
                            </div>
                        ))}
                    </dl>

                    <div className="grid gap-5 sm:grid-cols-2">
                        <Field id="website" label="Website" hint="Optional." error={errors.website?.message}>
                            <Input
                                id="website"
                                type="url"
                                placeholder="https://"
                                {...register("website")}
                                {...invalidProps("website-error", errors.website)}
                            />
                        </Field>
                        <Field
                            id="contactEmail"
                            label="Public contact email"
                            hint="Optional. Shown on your profile."
                            error={errors.contactEmail?.message}
                        >
                            <Input
                                id="contactEmail"
                                type="email"
                                placeholder="hello@yourbusiness.com"
                                {...register("contactEmail")}
                                {...invalidProps("contactEmail-error", errors.contactEmail)}
                            />
                        </Field>
                    </div>

                    <div className="rounded-2xl bg-[#FFF8F0] p-5">
                        <p className="font-semibold">What happens next</p>
                        <ul className="mt-3 space-y-2 text-sm text-[#17233B]/70">
                            {[
                                "You go straight to your dashboard to add a logo, hours and your first offer.",
                                "Our team checks every new business before it appears publicly.",
                                "You start on the Free plan, with no card needed. Upgrade any time.",
                            ].map((line) => (
                                <li key={line} className="flex gap-2">
                                    <FiCheck aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-[#FF593F]" />
                                    {line}
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>

                {errorMessage && (
                    <Alert variant="destructive" className="mt-6">
                        <AlertTitle>We couldn&apos;t create your business</AlertTitle>
                        <AlertDescription>{errorMessage}</AlertDescription>
                    </Alert>
                )}

                <div className="mt-8 flex items-center justify-between gap-3">
                    {step > 0 ? (
                        <Button type="button" variant="ghost" onClick={() => setStep((current) => current - 1)}>
                            <FiArrowLeft aria-hidden="true" />
                            Back
                        </Button>
                    ) : (
                        <span />
                    )}

                    {/* Only the last step submits: the browser validates every
                        required field on submit, including later steps'.
                        Separate keys stop React reusing the Continue button as
                        the submit button, which would let the click that
                        opens the review step also submit the form. */}
                    {step < steps.length - 1 ? (
                        <Button key="continue" type="button" size="lg" onClick={() => void goNext()} className="bg-[#FF593F] text-white hover:bg-[#FF593F]/90">
                            Continue
                            <FiArrowRight aria-hidden="true" />
                        </Button>
                    ) : (
                        <Button key="submit" type="submit" size="lg" disabled={isSubmitting} className="bg-[#FF593F] text-white hover:bg-[#FF593F]/90">
                            {isSubmitting ? "Creating your business…" : "Create my business"}
                        </Button>
                    )}
                </div>
            </form>
        </div>
    );
}
