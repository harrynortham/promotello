"use client";

import { useRouter } from "next/navigation";
import { FormEvent, KeyboardEvent, useRef, useState } from "react";
import { FiArrowLeft, FiArrowRight, FiCheck } from "react-icons/fi";

import { CategorySelect } from "@/components/category-select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createClient } from "@/utils/supabase/client";

const steps = [
    { title: "Your business", description: "The basics customers see first." },
    { title: "Where to find you", description: "So customers can visit and get directions." },
    { title: "Review and finish", description: "Check everything, then create your profile." },
];

function Field({
    id,
    label,
    hint,
    children,
}: {
    id: string;
    label: string;
    hint?: string;
    children: React.ReactNode;
}) {
    return (
        <div className="space-y-2">
            <Label htmlFor={id}>{label}</Label>
            {children}
            {hint && <p className="text-xs text-[#17233B]/55">{hint}</p>}
        </div>
    );
}

export function OnboardingForm({ firstName }: { firstName: string | null }) {
    const router = useRouter();
    const formRef = useRef<HTMLFormElement>(null);
    const [step, setStep] = useState(0);
    const [summary, setSummary] = useState<Record<string, string>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");

    // Validates only the fields on the current step before moving on.
    function stepIsValid() {
        const fields = formRef.current?.querySelectorAll<HTMLInputElement>(
            `[data-step="${step}"] input, [data-step="${step}"] select, [data-step="${step}"] textarea`,
        );

        for (const field of fields ?? []) {
            if (!field.checkValidity()) {
                field.reportValidity();
                return false;
            }
        }

        return true;
    }

    function goNext() {
        if (!stepIsValid()) return;

        const formData = new FormData(formRef.current!);
        const select = formRef.current!.querySelector<HTMLSelectElement>("#category");

        setSummary({
            name: String(formData.get("businessName") ?? ""),
            category: select?.selectedOptions[0]?.text ?? "",
            address: [formData.get("addressLine1"), formData.get("region"), formData.get("city"), formData.get("postalCode")]
                .map((part) => String(part ?? "").trim())
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
            goNext();
        }
    }

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        // Enter on an earlier step moves forward rather than submitting.
        if (step < steps.length - 1) {
            goNext();
            return;
        }

        if (!stepIsValid()) return;

        const formData = new FormData(event.currentTarget);

        setIsSubmitting(true);
        setErrorMessage("");

        const { data, error } = await createClient().rpc("create_business_with_owner", {
            business_name: formData.get("businessName"),
            business_category: formData.get("category"),
            business_description: formData.get("description") || null,
            business_website_url: formData.get("website") || null,
            business_contact_email: formData.get("contactEmail") || null,
            location_name: "Main location",
            location_address_line_1: formData.get("addressLine1"),
            location_address_line_2: formData.get("addressLine2") || null,
            location_city: formData.get("city"),
            location_region: formData.get("region") || null,
            location_postal_code: formData.get("postalCode") || null,
            location_country_code: "GB",
        });

        if (error) {
            setIsSubmitting(false);
            setErrorMessage(
                error.message.includes("Authentication is required")
                    ? "Your session has ended. Please sign in again."
                    : error.message,
            );
            return;
        }

        router.push(`/business/${data}?welcome=1`);
    }

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

            {/* noValidate: the browser would check every step's required
                fields on submit, including hidden ones, and silently refuse.
                Each step is validated on its own instead. */}
            <form ref={formRef} onSubmit={handleSubmit} onKeyDown={handleKeyDown} noValidate className="mt-8 rounded-3xl border border-[#17233B]/10 bg-white p-6 shadow-sm sm:p-8">
                <h2 className="text-xl font-semibold">{steps[step].title}</h2>
                <p className="mt-1 text-sm text-[#17233B]/60">{steps[step].description}</p>

                <div data-step="0" hidden={step !== 0} className="mt-6 space-y-5">
                    <Field id="businessName" label="Business name">
                        <Input id="businessName" name="businessName" required minLength={2} maxLength={160} placeholder="e.g. Little Loaf Bakery" autoFocus />
                    </Field>

                    <Field id="category" label="What kind of business is it?">
                        <CategorySelect id="category" name="category" required />
                    </Field>

                    <Field id="description" label="Describe it in a sentence or two" hint="Optional. You can add this later.">
                        <Textarea
                            id="description"
                            name="description"
                            maxLength={5000}
                            rows={4}
                            placeholder="e.g. A neighbourhood bakery baking sourdough and cinnamon buns every morning."
                        />
                    </Field>
                </div>

                <div data-step="1" hidden={step !== 1} className="mt-6 space-y-5">
                    <Field id="addressLine1" label="Street address">
                        <Input id="addressLine1" name="addressLine1" required minLength={2} maxLength={200} placeholder="e.g. 21 Gloucester Road" autoComplete="address-line1" />
                    </Field>

                    <Field id="addressLine2" label="Unit or floor" hint="Optional.">
                        <Input id="addressLine2" name="addressLine2" maxLength={200} autoComplete="address-line2" />
                    </Field>

                    <Field id="region" label="Neighbourhood or area" hint="Shown on your profile and used to help nearby customers find you.">
                        <Input id="region" name="region" maxLength={100} placeholder="e.g. Gloucester Road, Clifton, Southville" />
                    </Field>

                    <div className="grid gap-5 sm:grid-cols-2">
                        <Field id="city" label="Town or city">
                            <Input id="city" name="city" required minLength={2} maxLength={100} defaultValue="Bristol" autoComplete="address-level2" />
                        </Field>

                        <Field id="postalCode" label="Postcode">
                            <Input id="postalCode" name="postalCode" maxLength={10} placeholder="e.g. BS7 8AA" autoComplete="postal-code" />
                        </Field>
                    </div>
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
                        <Field id="website" label="Website" hint="Optional.">
                            <Input id="website" name="website" type="url" placeholder="https://" />
                        </Field>
                        <Field id="contactEmail" label="Public contact email" hint="Optional. Shown on your profile.">
                            <Input id="contactEmail" name="contactEmail" type="email" placeholder="hello@yourbusiness.com" />
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
                        <Button key="continue" type="button" size="lg" onClick={goNext} className="bg-[#FF593F] text-white hover:bg-[#FF593F]/90">
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
