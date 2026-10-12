"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

type EditBusinessFormProps = {
    businessId: string;
};

type Business = {
    name: string;
    category: string;
    description: string | null;
    website_url: string | null;
    contact_email: string | null;
};

type Location = {
    id: string;
    name: string;
    address_line_1: string;
    address_line_2: string | null;
    city: string;
    region: string | null;
    postal_code: string | null;
    country_code: string;
};

const inputClassName =
    "mt-2 w-full rounded-xl border border-[#17233B]/15 bg-white px-4 py-3 text-sm text-[#17233B] outline-none transition placeholder:text-[#17233B]/40 focus:border-[#FF593F] focus:ring-2 focus:ring-[#FF593F]/20";

export default function EditBusinessForm({
    businessId,
}: EditBusinessFormProps) {
    const router = useRouter();

    const [business, setBusiness] = useState<Business | null>(null);
    const [location, setLocation] = useState<Location | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");

    useEffect(() => {
        async function loadBusiness() {
            const supabase = createClient();

            const { data: businessData, error: businessError } = await supabase
                .from("businesses")
                .select("name, category, description, website_url, contact_email")
                .eq("id", businessId)
                .single();

            const { data: locationData, error: locationError } = await supabase
                .from("business_locations")
                .select(
                    "id, name, address_line_1, address_line_2, city, region, postal_code, country_code",
                )
                .eq("business_id", businessId)
                .order("created_at", { ascending: true })
                .limit(1)
                .maybeSingle();

            if (businessError || locationError || !businessData) {
                setErrorMessage("We couldn't load this business.");
            } else {
                setBusiness(businessData);
                setLocation(locationData);
            }

            setIsLoading(false);
        }

        loadBusiness();
    }, [businessId]);

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        const form = event.currentTarget;
        const formData = new FormData(form);

        setIsSaving(true);
        setSaved(false);
        setErrorMessage("");

        const supabase = createClient();

        const { error: businessError } = await supabase
            .from("businesses")
            .update({
                name: formData.get("businessName"),
                category: formData.get("category"),
                description: formData.get("description") || null,
                website_url: formData.get("website") || null,
                contact_email: formData.get("contactEmail") || null,
            })
            .eq("id", businessId);

        if (businessError) {
            setErrorMessage(businessError.message);
            setIsSaving(false);
            return;
        }

        if (location) {
            const { error: locationError } = await supabase
                .from("business_locations")
                .update({
                    name: formData.get("locationName"),
                    address_line_1: formData.get("addressLine1"),
                    address_line_2: formData.get("addressLine2") || null,
                    city: formData.get("city"),
                    region: formData.get("region") || null,
                    postal_code: formData.get("postalCode") || null,
                    country_code: String(
                        formData.get("countryCode") || "GB",
                    ).toUpperCase(),
                })
                .eq("id", location.id)
                .eq("business_id", businessId);

            if (locationError) {
                setErrorMessage(locationError.message);
                setIsSaving(false);
                return;
            }
        }

        setIsSaving(false);
        setSaved(true);
        router.refresh();
    }

    if (isLoading) {
        return (
            <main className="min-h-screen bg-[#FFF8F0] px-6 py-16">
                <div className="mx-auto max-w-2xl">
                    <div className="h-96 animate-pulse rounded-3xl bg-white" />
                </div>
            </main>
        );
    }

    if (!business) {
        return (
            <main className="min-h-screen bg-[#FFF8F0] px-6 py-16">
                <div className="mx-auto max-w-2xl rounded-3xl bg-white p-8">
                    <p className="text-red-700">
                        {errorMessage || "Business not found."}
                    </p>
                </div>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-[#FFF8F0] px-6 py-10 text-[#17233B] sm:py-16">
            <div className="mx-auto max-w-2xl">
                <Link
                    href="/dashboard"
                    className="text-sm font-semibold text-[#FF593F]"
                >
                    ← Back to dashboard
                </Link>

                <h1 className="mt-8 text-4xl font-semibold tracking-tight">
                    Edit business
                </h1>

                <p className="mt-3 text-[#17233B]/65">
                    Keep your business information up to date.
                </p>

                <form
                    onSubmit={handleSubmit}
                    className="mt-10 space-y-8 rounded-3xl bg-white p-6 shadow-sm sm:p-10"
                >
                    <fieldset className="space-y-5">
                        <legend className="text-xl font-semibold">
                            Business details
                        </legend>

                        <label className="block text-sm font-medium">
                            Business name
                            <input
                                name="businessName"
                                required
                                defaultValue={business.name}
                                className={inputClassName}
                            />
                        </label>

                        <label className="block text-sm font-medium">
                            Category
                            <input
                                name="category"
                                required
                                defaultValue={business.category}
                                className={inputClassName}
                            />
                        </label>

                        <label className="block text-sm font-medium">
                            Description
                            <textarea
                                name="description"
                                rows={4}
                                defaultValue={business.description ?? ""}
                                className={inputClassName}
                            />
                        </label>

                        <label className="block text-sm font-medium">
                            Website
                            <input
                                name="website"
                                type="url"
                                defaultValue={business.website_url ?? ""}
                                className={inputClassName}
                                placeholder="https://example.com"
                            />
                        </label>

                        <label className="block text-sm font-medium">
                            Contact email
                            <input
                                name="contactEmail"
                                type="email"
                                defaultValue={business.contact_email ?? ""}
                                className={inputClassName}
                            />
                        </label>
                    </fieldset>

                    {location && (
                        <fieldset className="space-y-5 border-t border-[#17233B]/10 pt-8">
                            <legend className="text-xl font-semibold">
                                Main location
                            </legend>

                            <label className="block text-sm font-medium">
                                Location name
                                <input
                                    name="locationName"
                                    defaultValue={location.name}
                                    className={inputClassName}
                                />
                            </label>

                            <label className="block text-sm font-medium">
                                Address line 1
                                <input
                                    name="addressLine1"
                                    required
                                    defaultValue={location.address_line_1}
                                    className={inputClassName}
                                />
                            </label>

                            <label className="block text-sm font-medium">
                                Address line 2
                                <input
                                    name="addressLine2"
                                    defaultValue={location.address_line_2 ?? ""}
                                    className={inputClassName}
                                />
                            </label>

                            <div className="grid gap-5 sm:grid-cols-2">
                                <label className="block text-sm font-medium">
                                    City
                                    <input
                                        name="city"
                                        required
                                        defaultValue={location.city}
                                        className={inputClassName}
                                    />
                                </label>

                                <label className="block text-sm font-medium">
                                    Region
                                    <input
                                        name="region"
                                        defaultValue={location.region ?? ""}
                                        className={inputClassName}
                                    />
                                </label>
                            </div>

                            <div className="grid gap-5 sm:grid-cols-2">
                                <label className="block text-sm font-medium">
                                    Postcode
                                    <input
                                        name="postalCode"
                                        defaultValue={location.postal_code ?? ""}
                                        className={inputClassName}
                                    />
                                </label>

                                <label className="block text-sm font-medium">
                                    Country code
                                    <input
                                        name="countryCode"
                                        maxLength={2}
                                        defaultValue={location.country_code}
                                        className={inputClassName}
                                    />
                                </label>
                            </div>
                        </fieldset>
                    )}

                    {errorMessage && (
                        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
                            {errorMessage}
                        </p>
                    )}

                    {saved && (
                        <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                            Business details saved successfully.
                        </p>
                    )}

                    <button
                        type="submit"
                        disabled={isSaving}
                        className="w-full rounded-xl bg-[#FF593F] px-6 py-3 font-semibold transition hover:bg-[#E94D36] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {isSaving ? "Saving changes…" : "Save changes"}
                    </button>
                </form>
            </div>
        </main>
    );
}