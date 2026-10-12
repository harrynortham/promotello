"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { createClient } from "@/utils/supabase/client";

const inputClassName =
    "mt-2 w-full rounded-xl border border-[#17233B]/15 bg-white px-4 py-3 text-sm text-[#17233B] outline-none transition placeholder:text-[#17233B]/40 focus:border-[#FF593F] focus:ring-2 focus:ring-[#FF593F]/20";

export default function OnboardingPage() {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");
    const [businessId, setBusinessId] = useState("");

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        const form = event.currentTarget;
        const formData = new FormData(form);

        setIsSubmitting(true);
        setErrorMessage("");
        setBusinessId("");

        const supabase = createClient();

        const { data, error } = await supabase.rpc(
            "create_business_with_owner",
            {
                business_name: formData.get("businessName"),
                business_category: formData.get("category"),
                business_description: formData.get("description") || null,
                business_website_url: formData.get("website") || null,
                business_contact_email: formData.get("contactEmail") || null,
                location_name: formData.get("locationName") || "Main location",
                location_address_line_1: formData.get("addressLine1"),
                location_address_line_2: formData.get("addressLine2") || null,
                location_city: formData.get("city"),
                location_region: formData.get("region") || null,
                location_postal_code: formData.get("postalCode") || null,
                location_country_code: formData.get("countryCode") || "GB",
            },
        );

        setIsSubmitting(false);

        if (error) {
            setErrorMessage(
                error.message.includes("Authentication is required")
                    ? "Please sign in before creating a business."
                    : error.message,
            );

            return;
        }

        setBusinessId(data);
        form.reset();
    }

    if (businessId) {
        return (
            <main className="flex min-h-screen items-center justify-center bg-[#FFF8F0] px-6 py-12">
                <section className="w-full max-w-lg rounded-3xl bg-white p-8 text-center shadow-sm sm:p-10">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#FF593F]/15 text-2xl">
                        ✓
                    </div>

                    <p className="mt-6 text-sm font-semibold uppercase tracking-[0.18em] text-[#FF593F]">
                        Business created
                    </p>

                    <h1 className="mt-3 text-3xl font-semibold tracking-tight text-[#17233B]">
                        Welcome to Promotello
                    </h1>

                    <p className="mt-3 leading-7 text-[#17233B]/65">
                        Your business is pending approval. You can now continue building
                        your first promotion.
                    </p>

                    <Link
                        href="/dashboard"
                        className="mt-8 inline-flex rounded-xl bg-[#FF593F] px-6 py-3 font-semibold text-[#17233B] transition hover:bg-[#E94D36]"
                    >
                        Open dashboard
                    </Link>
                </section>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-[#FFF8F0] px-6 py-10 text-[#17233B] sm:py-16">
            <div className="mx-auto max-w-2xl">
                <Link href="/" className="text-sm font-semibold text-[#FF593F]">
                    ← Back to Promotello
                </Link>

                <div className="mt-8">
                    <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#FF593F]">
                        Business onboarding
                    </p>

                    <h1 className="mt-3 text-4xl font-semibold tracking-tight">
                        Tell us about your business
                    </h1>

                    <p className="mt-4 max-w-xl leading-7 text-[#17233B]/65">
                        Create your business profile and add its first location. Your
                        profile will be reviewed before it appears publicly.
                    </p>
                </div>

                <form
                    onSubmit={handleSubmit}
                    className="mt-10 space-y-8 rounded-3xl bg-white p-6 shadow-sm sm:p-10"
                >
                    <fieldset className="space-y-5">
                        <legend className="text-xl font-semibold">Business details</legend>

                        <label className="block text-sm font-medium">
                            Business name <span className="text-[#FF593F]">*</span>
                            <input
                                name="businessName"
                                required
                                minLength={2}
                                maxLength={160}
                                className={inputClassName}
                                placeholder="Harbor Coffee"
                            />
                        </label>

                        <label className="block text-sm font-medium">
                            Category <span className="text-[#FF593F]">*</span>
                            <input
                                name="category"
                                required
                                minLength={2}
                                maxLength={100}
                                className={inputClassName}
                                placeholder="Cafe"
                            />
                        </label>

                        <label className="block text-sm font-medium">
                            Description
                            <textarea
                                name="description"
                                maxLength={5000}
                                rows={4}
                                className={inputClassName}
                                placeholder="Tell customers what makes your business special"
                            />
                        </label>

                        <div className="grid gap-5 sm:grid-cols-2">
                            <label className="block text-sm font-medium">
                                Website
                                <input
                                    name="website"
                                    type="url"
                                    className={inputClassName}
                                    placeholder="https://example.com"
                                />
                            </label>

                            <label className="block text-sm font-medium">
                                Contact email
                                <input
                                    name="contactEmail"
                                    type="email"
                                    className={inputClassName}
                                    placeholder="hello@example.com"
                                />
                            </label>
                        </div>
                    </fieldset>

                    <fieldset className="space-y-5 border-t border-[#17233B]/10 pt-8">
                        <legend className="text-xl font-semibold">First location</legend>

                        <label className="block text-sm font-medium">
                            Location name
                            <input
                                name="locationName"
                                className={inputClassName}
                                placeholder="Main location"
                            />
                        </label>

                        <label className="block text-sm font-medium">
                            Address line 1 <span className="text-[#FF593F]">*</span>
                            <input
                                name="addressLine1"
                                required
                                minLength={2}
                                maxLength={200}
                                className={inputClassName}
                                placeholder="12 Harbour Street"
                            />
                        </label>

                        <label className="block text-sm font-medium">
                            Address line 2
                            <input
                                name="addressLine2"
                                className={inputClassName}
                                placeholder="Suite 2"
                            />
                        </label>

                        <div className="grid gap-5 sm:grid-cols-2">
                            <label className="block text-sm font-medium">
                                City <span className="text-[#FF593F]">*</span>
                                <input
                                    name="city"
                                    required
                                    minLength={2}
                                    maxLength={100}
                                    className={inputClassName}
                                    placeholder="Bristol"
                                />
                            </label>

                            <label className="block text-sm font-medium">
                                Region
                                <input
                                    name="region"
                                    className={inputClassName}
                                    placeholder="Somerset"
                                />
                            </label>
                        </div>

                        <div className="grid gap-5 sm:grid-cols-2">
                            <label className="block text-sm font-medium">
                                Postcode
                                <input
                                    name="postalCode"
                                    className={inputClassName}
                                    placeholder="BS1 1AA"
                                />
                            </label>

                            <label className="block text-sm font-medium">
                                Country code
                                <input
                                    name="countryCode"
                                    defaultValue="GB"
                                    maxLength={2}
                                    className={inputClassName}
                                />
                            </label>
                        </div>
                    </fieldset>

                    {errorMessage && (
                        <p
                            role="alert"
                            className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700"
                        >
                            {errorMessage}
                        </p>
                    )}

                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full rounded-xl bg-[#FF593F] px-6 py-3 font-semibold text-[#17233B] transition hover:bg-[#E94D36] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {isSubmitting ? "Creating your business…" : "Create business"}
                    </button>
                </form>
            </div>
        </main>
    );
}